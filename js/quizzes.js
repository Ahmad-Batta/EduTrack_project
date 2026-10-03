/* ==========================================================
   quizzes.js — صفحة الكويزات: CRUD + أرشفة + نتائج + تحليلات + أسئلة
   ========================================================== */
const $ = (id) => document.getElementById(id);

const state = { quizzes: [], courses: [], students: [], results: [], view: 'active', activeQuizId: null, currentQuestions: [] };

const quizById = (id) => state.quizzes.find((q) => q.id == id);
const courseOf = (quiz) => state.courses.find((c) => c.id == quiz.courseId);
const enrolledIds = (quiz) => (courseOf(quiz)?.enrolledStudentIds || []).map(String);
const studentName = (id) => state.students.find((s) => s.id == id)?.name || `ID ${id}`;

const resultsOf = (quiz) => state.results.filter((r) => r.quizId == quiz.id && enrolledIds(quiz).includes(String(r.studentId)));

function avgPercent(quiz) {
    const rs = resultsOf(quiz);
    return rs.length ? rs.reduce((sum, r) => sum + toPercent(r.score, quiz.totalMarks), 0) / rs.length : null;
}

// ---------- تحميل البيانات ----------
async function loadData() {
    const { id } = Auth.getCurrentInstructor();
    console.log('[quizzes] Loading data for instructor:', id);

    // ✅ الحل الجذري: نجلب كل شيء، ثم نُفلتر محلياً
    // لأن json-server v1 لا يدعم فلترة query params (?instructorId=...)
    const [allCourses, allQuizzes, students, allResults] = await Promise.all([
        CourseAPI.getAll(),
        QuizAPI.getAll(),
        StudentAPI.getAll(),
        ResultAPI.getAll(),
    ]);

    const courses = Array.isArray(allCourses)
        ? allCourses.filter(c => String(c.instructorId) === String(id))
        : [];
    const quizzes = Array.isArray(allQuizzes)
        ? allQuizzes.filter(q => String(q.instructorId) === String(id))
        : [];
    const results = Array.isArray(allResults) ? allResults : [];

    console.log('[quizzes] Filtered courses:', courses.length, '/', allCourses?.length || 0);
    console.log('[quizzes] Filtered quizzes:', quizzes.length, '/', allQuizzes?.length || 0);

    const quizIds = new Set(quizzes.map((q) => String(q.id)));

    // نسخة احتياطية من localStorage (تُستخدم فقط لو السيرفر فقد الأسئلة)
    let localQuizzes = [];
    try {
        localQuizzes = JSON.parse(localStorage.getItem('localQuizzes')) || [];
    } catch {
        localQuizzes = [];
    }

    quizzes.forEach(q => {
        if (!Array.isArray(q.questions) || q.questions.length === 0) {
            const localQ = localQuizzes.find(lq => lq.id == q.id);
            if (localQ && Array.isArray(localQ.questions) && localQ.questions.length > 0) {
                q.questions = localQ.questions;
            }
        }
    });

    Object.assign(state, {
        courses,
        quizzes,
        students: Array.isArray(students) ? students : [],
        results: results.filter((r) => quizIds.has(String(r.quizId)))
    });

    // تعبئة قائمة اختيار الكورس في نموذج الكويز
    $('quizCourse').innerHTML = courses.length
        ? '<option value="" disabled selected>Select a course...</option>' +
          courses.map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.title)} (${escapeHTML(c.code)})</option>`).join('')
        : '<option value="" disabled selected>No courses — add one first</option>';
}

async function refreshAll() {
    await loadData();
    render();
    ActivityView.refresh();
}

// ---------- عرض الجدول ----------
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
                <button class="btn-action-dots" data-menu="${escapeHTML(q.id)}" aria-label="Quiz actions">•••</button>
                <div class="action-menu" id="menu-${escapeHTML(q.id)}">
                    <button data-action="results" data-id="${escapeHTML(q.id)}">Results</button>
                    <button data-action="edit" data-id="${escapeHTML(q.id)}">Edit</button>
                    <button data-action="archive" data-id="${escapeHTML(q.id)}">${q.isArchived ? 'Unarchive' : 'Archive'}</button>
                    <button class="delete-option" data-action="delete" data-id="${escapeHTML(q.id)}">Delete</button>
                </div>
            </td>
        </tr>`;
}

function render() {
    const term = $('searchInput').value.trim().toLowerCase();
    const list = state.quizzes
        .filter((q) => (state.view === 'archived') === Boolean(q.isArchived))
        .filter((q) => {
            const title  = (q.title || '').toLowerCase();
            const course = (courseOf(q)?.title || '').toLowerCase();
            return title.includes(term) || course.includes(term);
        });
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

// ---------- فورم الكويز ----------
const showFormError = (msg) => { $('formError').textContent = msg; };

function openCreate() {
    $('modalTitle').textContent = 'Create New Quiz';
    $('quizForm').reset();
    $('quizId').value = '';
    $('questionsContainer').innerHTML = '';
    state.currentQuestions = [];
    showFormError('');
    openModal($('quizModal'));
}

function openEdit(id) {
    const q = quizById(id);
    if (!q) return;
    $('modalTitle').textContent = 'Edit Quiz';
    showFormError('');
    $('quizId').value = q.id;
    $('quizTitle').value = q.title || '';
    $('quizCourse').value = q.courseId;
    $('quizQuestionsCount').value = q.questionsCount;
    $('quizDate').value = q.date || '';
    $('quizTime').value = q.time || '';
    $('quizDuration').value = q.durationMinutes;
    $('quizTotalMarks').value = q.totalMarks;
    $('quizStatus').value = q.status || 'Draft';

    state.currentQuestions = Array.isArray(q.questions) ? q.questions : [];
    generateQuestionFields();

    openModal($('quizModal'));
}

// ---------- توليد حقول الأسئلة ----------
function generateQuestionFields() {
    const count = parseInt($('quizQuestionsCount').value) || 0;
    const container = $('questionsContainer');

    if (count <= 0) {
        container.innerHTML = '';
        return;
    }

    const existingBlocks = Array.from(container.querySelectorAll('.question-block'));
    let existingData = [];
    if (existingBlocks.length > 0) {
        existingData = existingBlocks.map(block => ({
            text: block.querySelector('.q-text')?.value || '',
            options: Array.from(block.querySelectorAll('.q-opt')).map(opt => opt.value || ''),
            correctAnswer: block.querySelector('.q-correct')?.value || ''
        }));
    } else if (Array.isArray(state.currentQuestions) && state.currentQuestions.length > 0) {
        existingData = state.currentQuestions;
    }

    let html = '';
    for (let i = 0; i < count; i++) {
        const q = existingData[i] || { text: '', options: ['', '', '', ''], correctAnswer: '' };
        html += `
            <div class="question-block" data-index="${i}">
                <h4>Question ${i + 1}</h4>
                <div class="form-group">
                    <label>Question Text</label>
                    <input type="text" class="q-text" value="${escapeHTML(q.text)}" placeholder="Enter the question...">
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Option A</label><input type="text" class="q-opt" value="${escapeHTML(q.options[0] || '')}"></div>
                    <div class="form-group"><label>Option B</label><input type="text" class="q-opt" value="${escapeHTML(q.options[1] || '')}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Option C</label><input type="text" class="q-opt" value="${escapeHTML(q.options[2] || '')}"></div>
                    <div class="form-group"><label>Option D</label><input type="text" class="q-opt" value="${escapeHTML(q.options[3] || '')}"></div>
                </div>
                <div class="form-group">
                    <label>Correct Answer (A, B, C, or D)</label>
                    <input type="text" class="q-correct" value="${escapeHTML(q.correctAnswer || '')}" maxlength="1" placeholder="e.g. A">
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ---------- التحقق ----------
function validateQuiz(d, id) {
    if (d.title.length < 3 || d.title.length > 80) return 'Title must be between 3 and 80 characters.';
    if (!d.courseId) return 'Please select a course.';
    if (![d.questionsCount, d.durationMinutes, d.totalMarks].every((n) => Number.isInteger(n) && n > 0))
        return 'Questions, duration and total marks must be positive whole numbers.';
    if (!d.date || !d.time) return 'Please set the quiz date and time.';

    if (!Array.isArray(d.questions) || d.questions.length !== d.questionsCount)
        return 'Please generate and fill all questions.';
    if (d.questions.some(q => !q.text || q.options.some(o => !o) || !q.correctAnswer))
        return 'All question fields must be filled.';
    if (d.questions.some(q => !['A', 'B', 'C', 'D'].includes(q.correctAnswer.toUpperCase())))
        return 'Correct answer must be A, B, C, or D.';

    const duplicate = state.quizzes.some((q) =>
        q.id != id && q.courseId == d.courseId && (q.title || '').toLowerCase() === d.title.toLowerCase()
    );
    if (duplicate) return 'A quiz with this title already exists in this course.';

    const maxScore = Math.max(0, ...state.results.filter((r) => r.quizId == id).map((r) => r.score));
    if (id && d.totalMarks < maxScore)
        return `Total marks can't be lower than an existing score (${maxScore}).`;
    return '';
}

// ---------- حفظ الكويز ----------
async function handleQuizSubmit(e) {
    e.preventDefault();
    const id = $('quizId').value;

    const questionBlocks = document.querySelectorAll('.question-block');
    const questions = Array.from(questionBlocks).map(block => ({
        text: block.querySelector('.q-text').value.trim(),
        options: Array.from(block.querySelectorAll('.q-opt')).map(opt => opt.value.trim()),
        correctAnswer: block.querySelector('.q-correct').value.trim().toUpperCase()
    }));

    const data = {
        title: $('quizTitle').value.trim(),
        courseId: $('quizCourse').value,
        questionsCount: Number($('quizQuestionsCount').value),
        date: $('quizDate').value,
        time: $('quizTime').value,
        durationMinutes: Number($('quizDuration').value),
        totalMarks: Number($('quizTotalMarks').value),
        status: $('quizStatus').value,
        questions
    };

    const error = validateQuiz(data, id);
    if (error) return showFormError(error);

    try {
        if (id) {
            const updated = await QuizAPI.patch(id, data);
            saveToLocalStorage(id, { ...data, id });
            await ActivityLogger.logActivity('EDIT_QUIZ', `Updated quiz: ${data.title}`);
            if (updated && updated.id) {
                const idx = state.quizzes.findIndex(q => q.id == updated.id);
                if (idx > -1) state.quizzes[idx] = updated;
            }
        } else {
            const newQuiz = {
                ...data,
                instructorId: Auth.getCurrentInstructor().id,
                createdAt: new Date().toISOString().slice(0, 10),
                isArchived: false
            };
            const created = await QuizAPI.create(newQuiz);
            if (created && created.id) {
                saveToLocalStorage(created.id, { ...newQuiz, id: created.id });
                state.quizzes.push(created);
            }
            await ActivityLogger.logActivity('CREATE_QUIZ', `Created quiz: ${data.title}`);
        }
        closeModal($('quizModal'));
        render();
        renderStats();
        ActivityView.refresh();
    } catch (err) {
        showFormError('Failed to save the quiz. Is the server running?');
        console.error(err);
    }
}

// حفظ نسخة احتياطية في localStorage
function saveToLocalStorage(quizId, quizData) {
    let localQuizzes = [];
    try {
        localQuizzes = JSON.parse(localStorage.getItem('localQuizzes')) || [];
    } catch {
        localQuizzes = [];
    }
    const existingIndex = localQuizzes.findIndex(q => q.id == quizId);
    if (existingIndex > -1) {
        localQuizzes[existingIndex] = { ...localQuizzes[existingIndex], ...quizData };
    } else {
        localQuizzes.push(quizData);
    }
    localStorage.setItem('localQuizzes', JSON.stringify(localQuizzes));
}

// ---------- أرشفة وحذف ----------
async function toggleArchive(id) {
    const q = quizById(id);
    if (!q) return;
    const archiving = !q.isArchived;
    if (archiving && !confirm(`Archive "${q.title}"?`)) return;
    try {
        await QuizAPI.patch(id, { isArchived: archiving });
        await ActivityLogger.logActivity(
            archiving ? 'ARCHIVE_QUIZ' : 'UNARCHIVE_QUIZ',
            `${archiving ? 'Archived' : 'Restored'} quiz: ${q.title}`
        );
        q.isArchived = archiving;
        render();
        renderStats();
        ActivityView.refresh();
    } catch (err) {
        alert('Action failed. Is the server running?');
    }
}

async function removeQuiz(id) {
    const q = quizById(id);
    if (!q || !confirm(`Delete "${q.title}" and all its results?`)) return;
    try {
        const relatedResults = state.results.filter((r) => r.quizId == id);
        await Promise.all(relatedResults.map((r) => ResultAPI.delete(r.id)));
        await QuizAPI.delete(id);
        await ActivityLogger.logActivity('DELETE_QUIZ', `Deleted quiz: ${q.title}`);

        let localQuizzes = [];
        try {
            localQuizzes = JSON.parse(localStorage.getItem('localQuizzes')) || [];
        } catch {
            localQuizzes = [];
        }
        localQuizzes = localQuizzes.filter(lq => lq.id != id);
        localStorage.setItem('localQuizzes', JSON.stringify(localQuizzes));

        state.quizzes = state.quizzes.filter(q => q.id != id);
        state.results = state.results.filter(r => r.quizId != id);
        render();
        renderStats();
        ActivityView.refresh();
    } catch (err) {
        alert('Failed to delete the quiz.');
    }
}

// ---------- النتائج ----------
function openResults(id) {
    const q = quizById(id);
    if (!q) return;
    state.activeQuizId = id;
    $('resultsModalTitle').textContent = `Results: ${q.title}`;
    $('resultsError').textContent = '';
    renderResults();
    openModal($('resultsModal'));
}

function renderResults() {
    const q = quizById(state.activeQuizId);
    if (!q) return;
    const students = state.students.filter((s) => enrolledIds(q).includes(String(s.id)));
    const results = state.results.filter((r) => r.quizId == q.id);

    $('resultsTableBody').innerHTML = students.length
        ? students.map((s) => {
            const r = results.find((x) => x.studentId == s.id);
            return `<tr>
                <td><strong>${escapeHTML(s.name)}</strong></td>
                <td>${escapeHTML(s.email)}</td>
                <td><input class="score-input" type="number" min="0" max="${q.totalMarks}" step="any"
                     placeholder="Max ${q.totalMarks}" value="${r ? r.score : ''}" data-student="${escapeHTML(s.id)}"></td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="3" class="empty">No students are enrolled in this course.</td></tr>';

    const scored = resultsOf(q);
    const avg = avgPercent(q);
    $('analyticTotal').textContent = `${scored.length} / ${students.length}`;
    $('analyticAvg').textContent = avg === null ? '—' : `${avg.toFixed(1)}%`;
    $('analyticHigh').textContent = scored.length
        ? `${Math.max(...scored.map((r) => r.score))} / ${q.totalMarks}`
        : '—';
}

async function handleScoreChange(e) {
    const input = e.target.closest('.score-input');
    if (!input) return;
    const q = quizById(state.activeQuizId);
    if (!q) return;
    const raw = input.value.trim();
    const score = Number(raw);

    if (raw === '' || !Number.isFinite(score) || score < 0 || score > q.totalMarks) {
        $('resultsError').textContent = `Score must be a number between 0 and ${q.totalMarks}.`;
        return renderResults();
    }
    $('resultsError').textContent = '';

    const studentId = input.dataset.student;
    const existing = state.results.find((r) => r.quizId == q.id && r.studentId == studentId);
    try {
        if (existing) {
            await ResultAPI.patch(existing.id, { score });
            existing.score = score;
        } else {
            const created = await ResultAPI.create({ quizId: String(q.id), studentId: String(studentId), score });
            if (created && created.id) state.results.push(created);
        }
        await ActivityLogger.logActivity(
            existing ? 'EDIT_RESULT' : 'ADD_RESULT',
            `${existing ? 'Updated' : 'Added'} score ${score}/${q.totalMarks} for ${studentName(studentId)} in ${q.title}`
        );
        render();
        renderStats();
        renderResults();
    } catch (err) {
        $('resultsError').textContent = 'Failed to save the score.';
    }
}

// ---------- ربط الأحداث ----------
import { requireAuth, renderTopNav } from "./layout.js";

requireAuth();
renderTopNav("quizzes");

document.addEventListener('DOMContentLoaded', async () => {
    $('openModalBtn').addEventListener('click', openCreate);
    $('quizForm').addEventListener('submit', handleQuizSubmit);
    $('closeModalBtn').addEventListener('click', () => closeModal($('quizModal')));
    $('closeModalXBtn').addEventListener('click', () => closeModal($('quizModal')));
    $('closeResultsModalBtn').addEventListener('click', () => closeModal($('resultsModal')));
    $('resultsTableBody').addEventListener('change', handleScoreChange);
    $('searchInput').addEventListener('input', render);
    $('openActivityBtn').addEventListener('click', () => ActivityView.openHistory());

    $('generateQuestionsBtn').addEventListener('click', generateQuestionFields);
    $('quizQuestionsCount').addEventListener('input', generateQuestionFields);
    $('quizQuestionsCount').addEventListener('change', generateQuestionFields);

    document.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => {
        state.view = btn.dataset.view;
        document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b === btn));
        render();
    }));

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

    try {
        await refreshAll();
    } catch (err) {
        console.error(err);
        $('quizzesTableBody').innerHTML = '<tr><td colspan="6" class="empty">Cannot reach the server. Start it with: npx json-server db.json</td></tr>';
    }
});