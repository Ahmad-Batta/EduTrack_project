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

const LOCAL_STORAGE_KEY = 'edutrack_courses';

function getLocalCourses() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveLocalCourses(list) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

function normalizeCourse(c) {
    if (!c || typeof c !== 'object') return null;
    const title = c.title || c.name || 'Untitled Course';
    const code = c.code || c.major || 'COURSE';
    const instructorId = c.instructorId || c.instructor_id || null;
    return {
        ...c,
        id: String(c.id),
        title,
        code,
        description: c.description || '',
        instructorId,
        instructor_id: instructorId,
        enrolledStudentIds: Array.isArray(c.enrolledStudentIds) ? c.enrolledStudentIds : []
    };
}

// ==========================================
// 2. التحميل الأولي للبيانات
// ==========================================
import { requireAuth, renderTopNav } from "./layout.js";

requireAuth();
renderTopNav("courses");

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[courses] DOMContentLoaded');
    setupEventListeners();
    await loadStudents();
    await loadCourses();
});

function setupEventListeners() {
    const openBtn = document.getElementById('openCourseModalBtn');
    const modal = document.getElementById('courseModal');
    const form = document.getElementById('courseForm');
    const titleEl = document.getElementById('courseModalTitle');
    const closeBtn = document.getElementById('closeCourseModalBtn');
    const closeXBtn = document.getElementById('closeCourseModalXBtn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (titleEl) titleEl.textContent = "Add New Course";
            const idInput = document.getElementById('courseId');
            if (idInput) idInput.value = '';
            if (form) form.reset();
            if (modal) modal.classList.add('active');
        });
    }

    const hideModal = () => {
        if (modal) {
            modal.classList.remove('active');
            if (form) form.reset();
        }
    };

    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    if (closeXBtn) closeXBtn.addEventListener('click', hideModal);

    const searchInput = document.getElementById('searchCourseInput');
    if (searchInput) searchInput.addEventListener('input', applySearchAndRender);
}

async function loadCourses() {
    const currentInstructor = Auth.getCurrentInstructor();
    const instId = String(currentInstructor.id);
    let freshApi = [];

    try {
        console.log('[courses] Loading courses from API');
        const all = await CourseAPI.getAll();
        if (Array.isArray(all)) {
            freshApi = all;
        }
    } catch (error) {
        console.warn('[courses] ❌ Load failed via API, checking localStorage:', error);
    }

    const localList = getLocalCourses();
    const combinedRaw = [...freshApi, ...localList];

    const map = new Map();
    combinedRaw.forEach(item => {
        const norm = normalizeCourse(item);
        if (norm && norm.id) {
            map.set(norm.id, norm);
        }
    });

    const allNormalized = Array.from(map.values());

    allCourses = allNormalized.filter(c => {
        if (!c.instructorId) return true; // General/default courses
        return String(c.instructorId) === instId;
    });

    applySearchAndRender();
    calculateCourseAnalytics();
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
                    instructor_id: currentInstructor.id,
                    title,
                    code,
                    description,
                    enrolledStudentIds: []
                });
                await ActivityLogger.logActivity('ADD_COURSE', `Created course: ${title}`);
            }
        } catch (saveError) {
            console.warn('[courses] API Save failed, using local storage fallback:', saveError);
        }

        const existingCourse = id ? allCourses.find(c => String(c.id) === String(id)) : null;
        if (!savedCourse || !savedCourse.id) {
            savedCourse = {
                id: id || ('crs_' + Date.now()),
                instructorId: currentInstructor.id,
                instructor_id: currentInstructor.id,
                title,
                code,
                description,
                enrolledStudentIds: existingCourse ? (existingCourse.enrolledStudentIds || []) : []
            };
        } else {
            savedCourse = normalizeCourse(savedCourse);
            savedCourse.instructorId = currentInstructor.id;
            savedCourse.instructor_id = currentInstructor.id;
        }

        if (savedCourse) {
            const local = getLocalCourses();
            const idx = local.findIndex(c => String(c.id) === String(savedCourse.id));
            if (idx > -1) local[idx] = savedCourse;
            else local.push(savedCourse);
            saveLocalCourses(local);
        }

        hideCourseModal();
        await loadCourses();
    });
}

async function deleteCourse(id) {
    const course = allCourses.find(c => String(c.id) === String(id));
    if (!course) return;

    if (!confirm(`Delete "${course.title}"?`)) return;

    try {
        const quizzes = await request(`/quizzes?courseId=${id}`);
        const quizList = Array.isArray(quizzes) ? quizzes : [];

        for (const quiz of quizList) {
            const results = await ResultAPI.getByQuizId(quiz.id);
            const resultList = Array.isArray(results) ? results : [];
            await Promise.all(resultList.map(r => ResultAPI.delete(r.id)));
            await QuizAPI.delete(quiz.id);
        }
        await CourseAPI.delete(id);
        await ActivityLogger.logActivity('DELETE_COURSE', `Deleted course: ${course.title}`);
    } catch (error) {
        console.warn('[courses] API delete failed, applying locally:', error);
    }

    const local = getLocalCourses();
    const updatedLocal = local.filter(c => String(c.id) !== String(id));
    saveLocalCourses(updatedLocal);

    allCourses = allCourses.filter(c => String(c.id) !== String(id));
    applySearchAndRender();
    calculateCourseAnalytics();
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