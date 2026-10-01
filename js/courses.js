// ==========================================
// 1. المتغيرات والعناصر الرئيسية
// ==========================================
const coursesGrid = document.getElementById('coursesGrid');
const searchCourseInput = document.getElementById('searchCourseInput');

// عناصر إحصائيات الكورسات (Course Analytics)
const statTotalCourses = document.getElementById('statTotalCourses');
const statTotalEnrollments = document.getElementById('statTotalEnrollments');
const statAvgStudents = document.getElementById('statAvgStudents');

// عناصر نافذة إضافة/تعديل كورس
const courseModal = document.getElementById('courseModal');
const openCourseModalBtn = document.getElementById('openCourseModalBtn');
const closeCourseModalBtn = document.getElementById('closeCourseModalBtn');
const closeCourseModalXBtn = document.getElementById('closeCourseModalXBtn');
const courseForm = document.getElementById('courseForm');
const courseModalTitle = document.getElementById('courseModalTitle');

// عناصر نافذة الطلاب المسجلين (Enrollments)
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
    await loadStudents();
    await loadCourses();
});

// جلب كورسات المعلم الحالي فقط من قاعدة البيانات
async function loadCourses() {
    try {
        const currentInstructor = Auth.getCurrentInstructor();
        const response = await fetch(`${BASE_URL}/courses?instructorId=${currentInstructor.id}`);
        allCourses = await response.json();
        renderCourses(allCourses);
        calculateCourseAnalytics();
    } catch (error) {
        console.error('Failed to fetch courses:', error);
    }
}

// جلب جميع الطلاب من قاعدة البيانات
async function loadStudents() {
    try {
        const response = await fetch(`${BASE_URL}/students`);
        allStudents = await response.json();
    } catch (error) {
        console.error('Failed to fetch students:', error);
    }
}

// ==========================================
// 3. عرض الكورسات والحسابات الإحصائية (Analytics)
// ==========================================
function renderCourses(courses) {
    if (!coursesGrid) return;
    if (courses.length === 0) {
        coursesGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94A3B8; padding: 40px;">No courses found.</p>`;
        return;
    }

    coursesGrid.innerHTML = courses.map(course => {
        const enrolledCount = course.enrolledStudentIds ? course.enrolledStudentIds.length : 0;
        return `
            <div class="course-card">
                <div>
                    <div class="course-card-header">
                        <span class="course-code-badge">${escapeHTML(course.code || 'COURSE')}</span>
                    </div>
                    <h3>${escapeHTML(course.title)}</h3>
                    <p>${escapeHTML(course.description || 'No description provided.')}</p>
                </div>
                <div class="course-card-footer">
                    <span class="students-count-tag" onclick="openStudentsModal('${course.id}')">
                        👥 ${enrolledCount} Students Enrolled
                    </span>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="openEditCourseModal('${course.id}')">Edit</button>
                        <button class="btn-icon delete" onclick="deleteCourse('${course.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// حساب وعرض تحليلات الكورسات (Course Analytics)
function calculateCourseAnalytics() {
    const totalCourses = allCourses.length;
    let totalEnrollments = 0;

    allCourses.forEach(c => {
        if (c.enrolledStudentIds) {
            totalEnrollments += c.enrolledStudentIds.length;
        }
    });

    const avgStudents = totalCourses > 0 ? (totalEnrollments / totalCourses).toFixed(1) : 0;

    if (statTotalCourses) statTotalCourses.textContent = totalCourses;
    if (statTotalEnrollments) statTotalEnrollments.textContent = totalEnrollments;
    if (statAvgStudents) statAvgStudents.textContent = avgStudents;
}

// بحث الكورسات
if (searchCourseInput) {
    searchCourseInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allCourses.filter(c =>
            c.title.toLowerCase().includes(term) || c.code.toLowerCase().includes(term)
        );
        renderCourses(filtered);
    });
}

// ==========================================
// 4. إضافة وتعديل وحذف الكورس (Add, Edit, Delete Course)
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
    document.getElementById('courseTitle').value = course.title;
    document.getElementById('courseCode').value = course.code;
    document.getElementById('courseDescription').value = course.description;

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

        // منع تكرار كود الكورس
        if (allCourses.some(c => c.id != id && c.code.toLowerCase() === code.toLowerCase())) {
            alert('This course code already exists.');
            return;
        }

        try {
            if (id) {
                // Edit Course
                await fetch(`${BASE_URL}/courses/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, code, description })
                });
                await ActivityLogger.logActivity('EDIT_COURSE', `Updated course: ${title}`);
            } else {
                // Add Course مع ربط الكورس للمعلم الحالي
                const newCourse = {
                    instructorId: currentInstructor.id,
                    title,
                    code,
                    description,
                    enrolledStudentIds: []
                };
                await fetch(`${BASE_URL}/courses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newCourse)
                });
                await ActivityLogger.logActivity('ADD_COURSE', `Created course: ${title}`);
            }

            await loadCourses();
            hideCourseModal();
        } catch (error) {
            alert('Failed to save course');
        }
    });
}

async function deleteCourse(id) {
    const course = allCourses.find(c => c.id == id);
    if (!course) return;
    try {
        // حذف متسلسل: الكويزات التابعة للكورس ونتائجها
        const quizzes = await (await fetch(`${BASE_URL}/quizzes?courseId=${id}`)).json();
        const msg = quizzes.length
            ? `Delete "${course.title}" with its ${quizzes.length} quiz(zes) and all results?`
            : `Delete "${course.title}"?`;
        if (!confirm(msg)) return;

        for (const quiz of quizzes) {
            const results = await (await fetch(`${BASE_URL}/results?quizId=${quiz.id}`)).json();
            await Promise.all(results.map(r => fetch(`${BASE_URL}/results/${r.id}`, { method: 'DELETE' })));
            await fetch(`${BASE_URL}/quizzes/${quiz.id}`, { method: 'DELETE' });
        }
        await fetch(`${BASE_URL}/courses/${id}`, { method: 'DELETE' });
        await ActivityLogger.logActivity('DELETE_COURSE', `Deleted course: ${course.title}`);
        await loadCourses();
    } catch (error) {
        alert('Failed to delete course');
    }
}

// ==========================================
// 5. إدارة الطلاب المسجلين (Enrollments)
// ==========================================

async function openStudentsModal(courseId) {
    const course = allCourses.find(c => c.id == courseId);
    if (!course) return;

    document.getElementById('studentsModalTitle').textContent = course.title;
    document.getElementById('studentsModalSubtitle').textContent = `Manage enrolled students for ${course.code}`;
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
    const enrolledIds = course.enrolledStudentIds || [];
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
                <button class="btn-remove-student" onclick="removeStudentFromCourse('${course.id}', '${student.id}')">Remove</button>
            </td>
        </tr>
    `).join('');
}

function populateUnenrolledStudentsDropdown(course) {
    const enrolledIds = course.enrolledStudentIds || [];
    const unenrolledStudents = allStudents.filter(s => !enrolledIds.includes(String(s.id)));

    selectStudentToEnroll.innerHTML = `<option value="" disabled selected>Select student to enroll...</option>` +
        unenrolledStudents.map(s => `<option value="${s.id}">${escapeHTML(`${s.name} (${s.email})`)}</option>`).join('');
}

if (enrollForm) {
    enrollForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const courseId = document.getElementById('enrollCourseId').value;
        const studentId = selectStudentToEnroll.value;
        const course = allCourses.find(c => c.id == courseId);

        if (!course || !studentId) return;

        const currentEnrolled = course.enrolledStudentIds || [];
        if (!currentEnrolled.includes(studentId)) {
            currentEnrolled.push(studentId);

            try {
                await fetch(`${BASE_URL}/courses/${courseId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enrolledStudentIds: currentEnrolled })
                });

                await ActivityLogger.logActivity('ENROLL_STUDENT', `Enrolled ${studentName(studentId)} into ${course.title}`);

                await loadCourses();
                const updatedCourse = allCourses.find(c => c.id == courseId);
                renderEnrolledStudentsTable(updatedCourse);
                populateUnenrolledStudentsDropdown(updatedCourse);
            } catch (error) {
                alert('Failed to enroll student');
            }
        }
    });
}

async function removeStudentFromCourse(courseId, studentId) {
    if (confirm('Are you sure you want to remove this student from the course?')) {
        const course = allCourses.find(c => c.id == courseId);
        if (!course) return;

        const updatedEnrolled = (course.enrolledStudentIds || []).filter(id => id != studentId);

        try {
            await fetch(`${BASE_URL}/courses/${courseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enrolledStudentIds: updatedEnrolled })
            });

            await ActivityLogger.logActivity('REMOVE_STUDENT_COURSE', `Removed ${studentName(studentId)} from ${course.title}`);

            await loadCourses();
            const updatedCourse = allCourses.find(c => c.id == courseId);
            renderEnrolledStudentsTable(updatedCourse);
            populateUnenrolledStudentsDropdown(updatedCourse);
        } catch (error) {
            alert('Failed to remove student');
        }
    }
}