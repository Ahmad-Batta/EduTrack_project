/* ==========================================================
   quizzes.js — صفحة الكويزات: CRUD + أرشفة + نتائج + تحليلات
   يعتمد على: utils, auth, api, activityLogger, activityView
   ========================================================== */
const $ = (id) => document.getElementById(id);

// ---------- 1. الحالة العامة ----------
const state = { quizzes: [], courses: [], students: [], results: [], view: 'active', activeQuizId: null };

const quizById = (id) => state.quizzes.find((q) => q.id == id);
const courseOf = (quiz) => state.courses.find((c) => c.id == quiz.courseId);
const enrolledIds = (quiz) => (courseOf(quiz)?.enrolledStudentIds || []).map(String);
const studentName = (id) => state.students.find((s) => s.id == id)?.name || `ID ${id}`;

// نتائج الكويزات للطلاب المسجلين بالكورس فقط
const resultsOf = (quiz) => state.results.filter((r) => r.quizId == quiz.id && enrolledIds(quiz).includes(String(r.studentId)));

// معدل الكويز كنسبة مئوية (score / totalMarks) — أو null إذا ما في نتائج
function avgPercent(quiz) {
    const rs = resultsOf(quiz);
    return rs.length ? rs.reduce((sum, r) => sum + toPercent(r.score, quiz.totalMarks), 0) / rs.length : null;
}

// ---------- 2. تحميل البيانات ----------
async function loadData() {
    const { id } = Auth.getCurrentInstructor();
    const [courses, quizzes, students, results] = await Promise.all([
        CourseAPI.getByInstructor(id), QuizAPI.getByInstructor(id), StudentAPI.getAll(), ResultAPI.getAll(),
    ]);
    const quizIds = new Set(quizzes.map((q) => String(q.id)));
    Object.assign(state, { courses, quizzes, students, results: results.filter((r) => quizIds.has(String(r.quizId))) });
    $('quizCourse').innerHTML = courses.length
        ? '<option value="" disabled selected>Select a course...</option>' + courses.map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.title)} (${escapeHTML(c.code)})</option>`).join('')
        : '<option value="" disabled selected>No courses — add one first</option>';
}

async function refreshAll() {
    await loadData();
    render();
    ActivityView.refresh();
}

// ---------- 3. عرض الجدول والإحصائيات ----------
function rowHTML(q) {
    const avg = avgPercent(q);
    const status = q.status || 'Draft';
    return `
        <tr>
            <td class="quiz-info">
                <strong>${escapeHTML(q.title)}</strong>
                <span>${formatDate(q.date)} · ${escapeHTML(q.time || '--:--')} · ${q.durationMinutes} min · ${q.totalMarks} marks</span>
            </td>
            <td>${escapeHTML(courseOf(q)?.title || 'General')}</td>
            <td>${q.questionsCount}</td>
            <td><strong>${avg === null ? '—' : avg.toFixed(1) + '%'}</strong></td>
            <td><span class="badge badge-${status.toLowerCase()}">${escapeHTML(status)}</span></td>
            <td class="action-container">
                <button class="btn-action-dots" data-menu="${q.id}" aria-label="Quiz actions">•••</button>
                <div class="action-menu" id="menu-${q.id}">
                    <button data-action="results" data-id="${q.id}">Results</button>
                    <button data-action="edit" data-id="${q.id}">Edit</button>
                    <button data-action="archive" data-id="${q.id}">${q.isArchived ? 'Unarchive' : 'Archive'}</button>
                    <button class="delete-option" data-action="delete" data-id="${q.id}">Delete</button>
                </div>
            </td>
        </tr>`;
}

function render() {
    const term = $('searchInput').value.trim().toLowerCase();
    const list = state.quizzes
        .filter((q) => (state.view === 'archived') === Boolean(q.isArchived))
        .filter((q) => q.title.toLowerCase().includes(term) || (courseOf(q)?.title || '').toLowerCase().includes(term));
    $('quizzesTableBody').innerHTML = list.length
        ? list.map(rowHTML).join('')
        : `<tr><td colspan="6" class="empty">No ${state.view} quizzes found.</td></tr>`;
    renderStats();
}

function renderStats() {
    const active = state.quizzes.filter((q) => !q.isArchived);
    const avgs = active.map(avgPercent).filter((v) => v !== null);
    $('statTotalQuizzes').textContent = state.quizzes.length;
    $('statActiveQuizzes').textContent = active.length;
    $('statAvgScore').textContent = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) + '%' : '—';
}

// ---------- 4. فورم الكويز: إضافة / تعديل ----------
const showFormError = (msg) => { $('formError').textContent = msg; };

function openCreate() {
    $('modalTitle').textContent = 'Create New Quiz';
    $('quizForm').reset();
    $('quizId').value = '';
    showFormError('');
    openModal($('quizModal'));
}

function openEdit(id) {
    const q = quizById(id);
    if (!q) return;
    $('modalTitle').textContent = 'Edit Quiz';
    showFormError('');
    $('quizId').value = q.id;
    $('quizTitle').value = q.title;
    $('quizCourse').value = q.courseId;
    $('quizQuestionsCount').value = q.questionsCount;
    $('quizDate').value = q.date || '';
    $('quizTime').value = q.time || '';
    $('quizDuration').value = q.durationMinutes;
    $('quizTotalMarks').value = q.totalMarks;
    $('quizStatus').value = q.status || 'Draft';
    openModal($('quizModal'));
}

// يرجع نص الخطأ، أو '' إذا كل شي سليم
function validateQuiz(d, id) {
    if (d.title.length < 3 || d.title.length > 80) return 'Title must be between 3 and 80 characters.';
    if (!d.courseId) return 'Please select a course.';
    if (![d.questionsCount, d.durationMinutes, d.totalMarks].every((n) => Number.isInteger(n) && n > 0)) return 'Questions, duration and total marks must be positive whole numbers.';
    if (!d.date || !d.time) return 'Please set the quiz date and time.';
    const duplicate = state.quizzes.some((q) => q.id != id && q.courseId == d.courseId && q.title.toLowerCase() === d.title.toLowerCase());
    if (duplicate) return 'A quiz with this title already exists in this course.';
    const maxScore = Math.max(0, ...state.results.filter((r) => r.quizId == id).map((r) => r.score));
    if (id && d.totalMarks < maxScore) return `Total marks can't be lower than an existing score (${maxScore}).`;
    return '';
}

async function handleQuizSubmit(e) {
    e.preventDefault();
    const id = $('quizId').value;
    const data = {
        title: $('quizTitle').value.trim(),
        courseId: $('quizCourse').value,
        questionsCount: Number($('quizQuestionsCount').value),
        date: $('quizDate').value,
        time: $('quizTime').value,
        durationMinutes: Number($('quizDuration').value),
        totalMarks: Number($('quizTotalMarks').value),
        status: $('quizStatus').value,
    };
    const error = validateQuiz(data, id);
    if (error) return showFormError(error);

    try {
        if (id) {
            await QuizAPI.patch(id, data);
            await ActivityLogger.logActivity('EDIT_QUIZ', `Updated quiz: ${data.title}`);
        } else {
            await QuizAPI.create({ ...data, instructorId: Auth.getCurrentInstructor().id, createdAt: new Date().toISOString().slice(0, 10), isArchived: false });
            await ActivityLogger.logActivity('CREATE_QUIZ', `Created quiz: ${data.title}`);
        }
        closeModal($('quizModal'));
        await refreshAll();
    } catch (err) {
        showFormError('Failed to save the quiz. Is the server running?');
    }
}

// ---------- 5. أرشفة وحذف ----------
async function toggleArchive(id) {
    const q = quizById(id);
    if (!q) return;
    const archiving = !q.isArchived;
    if (archiving && !confirm(`Archive "${q.title}"?`)) return;
    try {
        await QuizAPI.patch(id, { isArchived: archiving });
        await ActivityLogger.logActivity(archiving ? 'ARCHIVE_QUIZ' : 'UNARCHIVE_QUIZ', `${archiving ? 'Archived' : 'Restored'} quiz: ${q.title}`);
        await refreshAll();
    } catch (err) { alert('Action failed. Is the server running?'); }
}

async function removeQuiz(id) {
    const q = quizById(id);
    if (!q || !confirm(`Delete "${q.title}" and all its results?`)) return;
    try {
        await Promise.all(state.results.filter((r) => r.quizId == id).map((r) => ResultAPI.delete(r.id))); // حذف متسلسل
        await QuizAPI.delete(id);
        await ActivityLogger.logActivity('DELETE_QUIZ', `Deleted quiz: ${q.title}`);
        await refreshAll();
    } catch (err) { alert('Failed to delete the quiz.'); }
}

// ---------- 6. النتائج والتحليلات ----------
function openResults(id) {
    state.activeQuizId = id;
    $('resultsModalTitle').textContent = `Results: ${quizById(id).title}`;
    $('resultsError').textContent = '';
    renderResults();
    openModal($('resultsModal'));
}

function renderResults() {
    const q = quizById(state.activeQuizId);
    const students = state.students.filter((s) => enrolledIds(q).includes(String(s.id)));
    const results = state.results.filter((r) => r.quizId == q.id);

    $('resultsTableBody').innerHTML = students.length
        ? students.map((s) => {
            const r = results.find((x) => x.studentId == s.id);
            return `<tr>
                <td><strong>${escapeHTML(s.name)}</strong></td>
                <td>${escapeHTML(s.email)}</td>
                <td><input class="score-input" type="number" min="0" max="${q.totalMarks}" step="any"
                     placeholder="Max ${q.totalMarks}" value="${r ? r.score : ''}" data-student="${s.id}"></td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="3" class="empty">No students are enrolled in this course.</td></tr>';

    const scored = resultsOf(q);
    const avg = avgPercent(q);
    $('analyticTotal').textContent = `${scored.length} / ${students.length}`;
    $('analyticAvg').textContent = avg === null ? '—' : `${avg.toFixed(1)}%`;
    $('analyticHigh').textContent = scored.length ? `${Math.max(...scored.map((r) => r.score))} / ${q.totalMarks}` : '—';
}

async function handleScoreChange(e) {
    const input = e.target.closest('.score-input');
    if (!input) return;
    const q = quizById(state.activeQuizId);
    const raw = input.value.trim();
    const score = Number(raw);

    if (raw === '' || !Number.isFinite(score) || score < 0 || score > q.totalMarks) {
        $('resultsError').textContent = `Score must be a number between 0 and ${q.totalMarks}.`;
        return renderResults(); // يرجّع القيمة القديمة
    }
    $('resultsError').textContent = '';

    const studentId = input.dataset.student;
    const existing = state.results.find((r) => r.quizId == q.id && r.studentId == studentId);
    try {
        if (existing) await ResultAPI.patch(existing.id, { score });
        else await ResultAPI.create({ quizId: String(q.id), studentId: String(studentId), score });
        await ActivityLogger.logActivity(existing ? 'EDIT_RESULT' : 'ADD_RESULT',
            `${existing ? 'Updated' : 'Added'} score ${score}/${q.totalMarks} for ${studentName(studentId)} in ${q.title}`);
        await refreshAll();
        renderResults(); // إعادة رسم الجدول حتى يُحفظ الـ result id ولا يتكرر السجل
    } catch (err) { $('resultsError').textContent = 'Failed to save the score.'; }
}

// ---------- 7. ربط الأحداث ----------
document.addEventListener('DOMContentLoaded', async () => {
    $('openModalBtn').addEventListener('click', openCreate);
    $('quizForm').addEventListener('submit', handleQuizSubmit);
    $('closeModalBtn').addEventListener('click', () => closeModal($('quizModal')));
    $('closeModalXBtn').addEventListener('click', () => closeModal($('quizModal')));
    $('closeResultsModalBtn').addEventListener('click', () => closeModal($('resultsModal')));
    $('resultsTableBody').addEventListener('change', handleScoreChange);
    $('searchInput').addEventListener('input', render);
    $('openActivityBtn').addEventListener('click', () => ActivityView.openHistory());

    document.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => {
        state.view = btn.dataset.view;
        document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b === btn));
        render();
    }));

    // قائمة ••• وأزرارها (Event Delegation)
    const actions = { results: openResults, edit: openEdit, archive: toggleArchive, delete: removeQuiz };
    document.addEventListener('click', (e) => {
        const dots = e.target.closest('[data-menu]');
        document.querySelectorAll('.action-menu.active').forEach((m) => {
            if (!dots || m.id !== `menu-${dots.dataset.menu}`) m.classList.remove('active');
        });
        if (dots) return $(`menu-${dots.dataset.menu}`).classList.toggle('active');
        const btn = e.target.closest('[data-action]');
        if (btn) actions[btn.dataset.action]?.(btn.dataset.id);
    });

    try { await refreshAll(); }
    catch (err) {
        $('quizzesTableBody').innerHTML = '<tr><td colspan="6" class="empty">Cannot reach the server. Start it with: npx json-server db.json</td></tr>';
    }
});
