// ==========================================
// 1. المتغيرات والعناصر الرئيسية
// ==========================================
const coursesGrid = document.getElementById('coursesGrid');
const searchCourseInput = document.getElementById('searchCourseInput');

const statTotalCourses = document.getElementById('statTotalCourses');
const statTotalEnrollments = document.getElementById('statTotalEnrollments');
const statAvgStudents = document.getElementById('statAvgStudents');

const courseModal = document.getElementById('courseModal');
const openCourseModalBtn = document.getElementById('openCourseModalBtn');
const closeCourseModalBtn = document.getElementById('closeCourseModalBtn');
const closeCourseModalXBtn = document.getElementById('closeCourseModalXBtn');
const courseForm = document.getElementById('courseForm');
const courseModalTitle = document.getElementById('courseModalTitle');

const studentsModal = document.getElementById('studentsModal');
const closeStudentsModalBtn = document.getElementById('closeStudentsModalBtn');
const enrollForm = document.getElementById('enrollForm');
const selectStudentToEnroll = document.getElementById('selectStudentToEnroll');
const enrolledStudentsTableBody = document.getElementById('enrolledStudentsTableBody');

let allCourses = [];
let allStudents = [];
const studentName = (id) => allStudents.find(s => s.id == id)?.name || `ID ${id}`;

// ==========================================
// 2. التحميل الأولي للبيانات
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[courses] DOMContentLoaded');
    await loadStudents();
    await loadCourses();
});

// نجلب كل الكورسات ثم نفلتر محلياً (json-server v1 لا يفلتر عبر query params)
async function loadCourses() {
    try {
        const currentInstructor = Auth.getCurrentInstructor();
        console.log('[courses] Loading for instructor:', currentInstructor.id);

        let fresh = await CourseAPI.getByInstructor(currentInstructor.id);

        if (!Array.isArray(fresh) || fresh.length === 0) {
            console.warn('[courses] Filtered query empty — falling back to full list');
            const all = await CourseAPI.getAll();
            if (Array.isArray(all)) {
                fresh = all.filter(c => String(c.instructorId) === String(currentInstructor.id));
                console.log('[courses] After local filter:', fresh.length, 'items');
            }
        }

        if (Array.isArray(fresh)) {
            allCourses = fresh;
        } else {
            console.error('[courses] Could not extract array. Raw:', fresh);
            allCourses = [];
        }

        applySearchAndRender();
        calculateCourseAnalytics();
    } catch (error) {
        console.error('[courses] ❌ Load failed:', error);
    }
}

async function loadStudents() {
    try {
        allStudents = await StudentAPI.getAll();
        if (!Array.isArray(allStudents)) allStudents = [];
        console.log('[courses] Students:', allStudents.length);
    } catch (error) {
        console.error('[courses] Students fetch failed:', error);
        allStudents = [];
    }
}

// ==========================================
// 3. العرض
// ==========================================
function applySearchAndRender() {
    const term = (searchCourseInput?.value || '').trim().toLowerCase();
    const filtered = term
        ? allCourses.filter(c => {
            const title = (c.title || '').toLowerCase();
            const code  = (c.code  || '').toLowerCase();
            return title.includes(term) || code.includes(term);
        })
        : allCourses;
    renderCourses(filtered);
}

function renderCourses(courses) {
    if (!coursesGrid) return;
    if (!Array.isArray(courses) || courses.length === 0) {
        coursesGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94A3B8; padding: 40px;">No courses found.</p>`;
        return;
    }

    coursesGrid.innerHTML = courses.map(course => {
        const enrolledCount = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.length : 0;
        const safeId = escapeHTML(course.id);
        return `
            <div class="course-card">
                <div>
                    <div class="course-card-header">
                        <span class="course-code-badge">${escapeHTML(course.code || 'COURSE')}</span>
                    </div>
                    <h3>${escapeHTML(course.title || 'Untitled')}</h3>
                    <p>${escapeHTML(course.description || 'No description provided.')}</p>
                </div>
                <div class="course-card-footer">
                    <button type="button" class="students-count-tag" data-action="students" data-id="${safeId}">
                        👥 ${enrolledCount} Students Enrolled
                    </button>
                    <div class="card-actions">
                        <button type="button" class="btn-icon" data-action="edit" data-id="${safeId}">Edit</button>
                        <button type="button" class="btn-icon delete" data-action="delete" data-id="${safeId}">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    console.log('[courses] Rendered', courses.length, 'cards');
}

if (coursesGrid) {
    coursesGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, id } = btn.dataset;
        if (action === 'students') return openStudentsModal(id);
        if (action === 'edit')     return openEditCourseModal(id);
        if (action === 'delete')   return deleteCourse(id);
    });
}

function calculateCourseAnalytics() {
    const totalCourses = allCourses.length;
    let totalEnrollments = 0;
    allCourses.forEach(c => {
        if (Array.isArray(c.enrolledStudentIds)) totalEnrollments += c.enrolledStudentIds.length;
    });
    const avgStudents = totalCourses > 0 ? (totalEnrollments / totalCourses).toFixed(1) : 0;

    if (statTotalCourses) statTotalCourses.textContent = totalCourses;
    if (statTotalEnrollments) statTotalEnrollments.textContent = totalEnrollments;
    if (statAvgStudents) statAvgStudents.textContent = avgStudents;
}

if (searchCourseInput) searchCourseInput.addEventListener('input', applySearchAndRender);

// ==========================================
// 4. إضافة وتعديل وحذف
// ==========================================
if (openCourseModalBtn) {
    openCourseModalBtn.addEventListener('click', () => {
        courseModalTitle.textContent = "Add New Course";
        document.getElementById('courseId').value = '';
        courseForm.reset();
        courseModal.classList.add('active');
    });
}

const hideCourseModal = () => {
    if (courseModal) {
        courseModal.classList.remove('active');
        courseForm.reset();
    }
};
if (closeCourseModalBtn) closeCourseModalBtn.addEventListener('click', hideCourseModal);
if (closeCourseModalXBtn) closeCourseModalXBtn.addEventListener('click', hideCourseModal);

function openEditCourseModal(id) {
    const course = allCourses.find(c => c.id == id);
    if (!course) return;

    courseModalTitle.textContent = "Edit Course";
    document.getElementById('courseId').value = course.id;
    document.getElementById('courseTitle').value = course.title || '';
    document.getElementById('courseCode').value = course.code || '';
    document.getElementById('courseDescription').value = course.description || '';
    courseModal.classList.add('active');
}

if (courseForm) {
    courseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentInstructor = Auth.getCurrentInstructor();
        const id = document.getElementById('courseId').value;
        const title = document.getElementById('courseTitle').value.trim();
        const code = document.getElementById('courseCode').value.trim();
        const description = document.getElementById('courseDescription').value.trim();

        const duplicate = allCourses.some(c =>
            c.id != id && (c.code || '').toLowerCase() === code.toLowerCase()
        );
        if (duplicate) {
            alert('This course code already exists.');
            return;
        }

        let savedCourse = null;
        try {
            if (id) {
                savedCourse = await CourseAPI.patch(id, { title, code, description });
                await ActivityLogger.logActivity('EDIT_COURSE', `Updated course: ${title}`);
            } else {
                savedCourse = await CourseAPI.create({
                    instructorId: currentInstructor.id,
                    title,
                    code,
                    description,
                    enrolledStudentIds: []
                });
                await ActivityLogger.logActivity('ADD_COURSE', `Created course: ${title}`);
            }
        } catch (saveError) {
            console.error('[courses] Save failed:', saveError);
            alert('Failed to save course. تأكد من تشغيل السيرفر.');
            return;
        }

        hideCourseModal();

        if (savedCourse && savedCourse.id) {
            const idx = allCourses.findIndex(c => c.id == savedCourse.id);
            if (idx > -1) allCourses[idx] = savedCourse;
            else allCourses.push(savedCourse);
            if (searchCourseInput && !id) searchCourseInput.value = '';
            applySearchAndRender();
            calculateCourseAnalytics();
        } else {
            console.warn('[courses] No id in response, refetching...');
            setTimeout(loadCourses, 400);
        }
    });
}

async function deleteCourse(id) {
    const course = allCourses.find(c => c.id == id);
    if (!course) return;
    try {
        const quizzes = await request(`/quizzes?courseId=${id}`);
        const quizList = Array.isArray(quizzes) ? quizzes : [];
        const msg = quizList.length
            ? `Delete "${course.title}" with its ${quizList.length} quiz(zes) and all results?`
            : `Delete "${course.title}"?`;
        if (!confirm(msg)) return;

        for (const quiz of quizList) {
            const results = await ResultAPI.getByQuizId(quiz.id);
            const resultList = Array.isArray(results) ? results : [];
            await Promise.all(resultList.map(r => ResultAPI.delete(r.id)));
            await QuizAPI.delete(quiz.id);
        }
        await CourseAPI.delete(id);
        await ActivityLogger.logActivity('DELETE_COURSE', `Deleted course: ${course.title}`);

        allCourses = allCourses.filter(c => c.id != id);
        applySearchAndRender();
        calculateCourseAnalytics();
    } catch (error) {
        console.error(error);
        alert('Failed to delete course');
    }
}

// ==========================================
// 5. إدارة الطلاب
// ==========================================
async function openStudentsModal(courseId) {
    const course = allCourses.find(c => c.id == courseId);
    if (!course) return;

    document.getElementById('studentsModalTitle').textContent = course.title || 'Enrolled Students';
    document.getElementById('studentsModalSubtitle').textContent = `Manage enrolled students for ${course.code || ''}`;
    document.getElementById('enrollCourseId').value = course.id;

    renderEnrolledStudentsTable(course);
    populateUnenrolledStudentsDropdown(course);
    studentsModal.classList.add('active');
}

if (closeStudentsModalBtn) {
    closeStudentsModalBtn.addEventListener('click', () => {
        studentsModal.classList.remove('active');
    });
}

function renderEnrolledStudentsTable(course) {
    const enrolledIds = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.map(String) : [];
    const enrolledStudents = allStudents.filter(s => enrolledIds.includes(String(s.id)));

    if (enrolledStudents.length === 0) {
        enrolledStudentsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94A3B8;">No students enrolled yet.</td></tr>`;
        return;
    }

    enrolledStudentsTableBody.innerHTML = enrolledStudents.map(student => `
        <tr>
            <td><strong>${escapeHTML(student.name)}</strong></td>
            <td>${escapeHTML(student.email)}</td>
            <td>
                <button type="button" class="btn-remove-student"
                        data-remove-student="${escapeHTML(student.id)}"
                        data-course-id="${escapeHTML(course.id)}">Remove</button>
            </td>
        </tr>
    `).join('');
}

if (enrolledStudentsTableBody) {
    enrolledStudentsTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-remove-student]');
        if (!btn) return;
        removeStudentFromCourse(btn.dataset.courseId, btn.dataset.removeStudent);
    });
}

function populateUnenrolledStudentsDropdown(course) {
    const enrolledIds = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.map(String) : [];
    const unenrolledStudents = allStudents.filter(s => !enrolledIds.includes(String(s.id)));

    selectStudentToEnroll.innerHTML = `<option value="" disabled selected>Select student to enroll...</option>` +
        unenrolledStudents.map(s => `<option value="${escapeHTML(s.id)}">${escapeHTML(`${s.name} (${s.email})`)}</option>`).join('');
}

if (enrollForm) {
    enrollForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const courseId = document.getElementById('enrollCourseId').value;
        const studentId = selectStudentToEnroll.value;
        const course = allCourses.find(c => c.id == courseId);

        if (!course || !studentId) return;

        const currentEnrolled = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.map(String) : [];
        if (currentEnrolled.includes(studentId)) return;

        const updatedEnrolled = [...currentEnrolled, studentId];

        try {
            const updated = await CourseAPI.patch(courseId, { enrolledStudentIds: updatedEnrolled });
            await ActivityLogger.logActivity('ENROLL_STUDENT', `Enrolled ${studentName(studentId)} into ${course.title}`);

            if (updated && updated.id) {
                const idx = allCourses.findIndex(c => c.id == updated.id);
                if (idx > -1) allCourses[idx] = updated;
            } else {
                course.enrolledStudentIds = updatedEnrolled;
            }

            const updatedCourse = allCourses.find(c => c.id == courseId);
            if (updatedCourse) {
                renderEnrolledStudentsTable(updatedCourse);
                populateUnenrolledStudentsDropdown(updatedCourse);
            }
            applySearchAndRender();
        } catch (error) {
            console.error(error);
            alert('Failed to enroll student');
        }
    });
}

async function removeStudentFromCourse(courseId, studentId) {
    if (!confirm('Are you sure you want to remove this student from the course?')) return;

    const course = allCourses.find(c => c.id == courseId);
    if (!course) return;

    const currentEnrolled = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.map(String) : [];
    const updatedEnrolled = currentEnrolled.filter(id => id !== String(studentId));

    try {
        const updated = await CourseAPI.patch(courseId, { enrolledStudentIds: updatedEnrolled });
        await ActivityLogger.logActivity('REMOVE_STUDENT_COURSE', `Removed ${studentName(studentId)} from ${course.title}`);

        if (updated && updated.id) {
            const idx = allCourses.findIndex(c => c.id == updated.id);
            if (idx > -1) allCourses[idx] = updated;
        } else {
            course.enrolledStudentIds = updatedEnrolled;
        }

        const updatedCourse = allCourses.find(c => c.id === courseId);
        if (updatedCourse) {
            renderEnrolledStudentsTable(updatedCourse);
            populateUnenrolledStudentsDropdown(updatedCourse);
        }
        applySearchAndRender();
    } catch (error) {
        console.error(error);
        alert('Failed to remove student');
    }
}