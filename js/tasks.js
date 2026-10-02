
// 1. المتغيرات العامة (Global Variables)
const apiUrl = 'http://localhost:3000/assignments'; // رابط الـ API تبع JSON Server
let allAssignments = []; // لتخزين قائمة الواجبات وعرضها بالبحث والفلترة
let isEditing = false;   // مؤشر لتحديد هل نحن بوضع تعديل أو إضافة جديدة
let currentEditId = null;// تخزين معرف الواجب الحالي المراد تعديله


// 2. الأحداث عند تحميل الصفحة (DOMContentLoaded Events)
document.addEventListener("DOMContentLoaded", () => {
    loadAssignments();    // جلب وعرض الواجبات من السيرفر
    loadUserProfile();    // عرض بيانات المستخدم المسجل دخوله
    loadCourses();        // تعبئة قائمة المواد الدراسية بالـ Select
    initBurgerMenu();     // تفعيل قائمة الموبايل الجانبية (Burger Menu)
});

// ==========================================
// 3. دوال جلب وعرض البيانات (Data Fetching & Rendering)
// ==========================================

// جلب الواجبات من السيرفر وعرضها
async function loadAssignments() {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to load assignments data.');
        
        const data = await response.json();
        allAssignments = data.assignments ? data.assignments : data; 
        
        renderTable(allAssignments); // رسم الجدول بالبيانات المستلمة
    } 
    catch (error) {
        console.error("Error loading assignments:", error);
    }
}


// عرض بيانات المدرس مباشرة من جدول الـ instructors في الـ json-server
async function loadUserProfile() {
    try {
        // 1. طلب بيانات المدرسين من السيرفر
        const response = await fetch('http://localhost:3000/instructors');
        if (!response.ok) throw new Error('Failed to fetch instructors from server.');
        
        const instructors = await response.json();
        
        // 2. اختيار المدرس (مثلاً: بنختار أول مدرس أو آخر مدرس سجل دخول، هون كمثال بنأخذ الأول أو الأخير)
        const currentInstructor = instructors.length > 0 ? instructors[instructors.length - 1] : { first_name: "Guest", last_name: "User", department: "Visitor" };

        // دمج الاسم الأول والاسم الأخير معاً
        const fullName = `${currentInstructor.first_name || ''} ${currentInstructor.last_name || ''}`.trim();

        // 3. تحديث الاسم بالـ HTML
        const nameElement = document.getElementById('user-name-display');
        if (nameElement) nameElement.textContent = fullName || "Guest User";
        
        // 4. تحديث الرتبة/الدور بالـ HTML (بنقدر نعرض التخصص أو الـ department كدور له)
        const roleElement = document.getElementById('user-role-display');
        if (roleElement) roleElement.textContent = currentInstructor.department || 'Instructor';
        
        // 5. تحديث حرف الدائرة (أول حرف من الاسم الأول)
        const avatarElement = document.getElementById('user-avatar-circle');
        if (avatarElement && currentInstructor.first_name) {
            avatarElement.textContent = currentInstructor.first_name.charAt(0).toUpperCase();
        }

    } catch (error) {
        console.error("Error loading instructor profile from server:", error);
    }
}

// تعبئة قائمة المواد مباشرة من الـ json-server (جدول courses)
async function loadCourses() {
    const courseSelect = document.getElementById('modal-course');
    if (!courseSelect) return;

    try {
        // 1. طلب بيانات المواد من الـ json-server
        const response = await fetch('http://localhost:3000/courses');
        if (!response.ok) throw new Error('Failed to fetch courses from server.');
        
        const courses = await response.json();

        // 2. تعبئة القائمة بالمواد القادمة من السيرفر
        courseSelect.innerHTML = '<option value="" disabled selected>Select a course</option>';
        
        courses.forEach(course => {
            const option = document.createElement('option');
            // بنعتمد على الـ course.name أو الـ course.title حسب كيف مسميها بملف الـ json
            const courseName = course.name || course.title;
            
            option.value = courseName;
            option.textContent = courseName;
            courseSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Error loading courses from server:", error);
    }
}

// رسم الجدول وإضافة العناصر ديناميكياً
function renderTable(assignments) {
    const tableBody = document.querySelector(".data-table tbody");
    tableBody.innerHTML = "";
    
    assignments.forEach(assignment => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <div class="item-name">${assignment.title}</div>
                <span class="item-date">${assignment.createdAt}</span>
            </td>
            <td>${assignment.course}</td>
            <td>${assignment.date}</td>
            <td>${assignment.score}</td>
            <td><span class="badge ${assignment.status.toLowerCase()}">${assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}</span></td>
            <td>
                <div style="position: relative; display: inline-block;">
                    <!-- زر القائمة المنسدلة للعمليات -->
                    <button class="btn-action" onclick="toggleActionMenu(event, '${assignment.id}')" style="background:none; border:none; cursor:pointer; font-size:18px; color:#64748b; font-weight:bold; padding: 4px 8px;">•••</button>
                    
                    <!-- القائمة المنسدلة (تعديل / حذف) -->
                    <div id="dropdown-${assignment.id}" class="action-menu" style="display: none; position: absolute; right: 0; top: 100%; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; z-index: 100; min-width: 120px; overflow: hidden; border: 1px solid #e2e8f0;">
                        <button onclick="editAssignment('${assignment.id}')" style="display: block; width: 100%; text-align: left; padding: 10px 16px; background: none; border: none; cursor: pointer; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;">Edit</button>
                        <button onclick="deleteAssignment('${assignment.id}')" style="display: block; width: 100%; text-align: left; padding: 10px 16px; background: none; border: none; cursor: pointer; font-size: 14px; color: #ef4444;">Delete</button>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}


// ==========================================
// 4. دوال التحكم بالقوائم المنسدلة والبحث (UI Actions & Search)
// ==========================================

// فتح وإغلاق قائمة الثلاث نقاط الخاصة بالصفوف
window.toggleActionMenu = function(event, id) {
    event.stopPropagation();
    
    document.querySelectorAll('.action-menu').forEach(menu => {
        if(menu.id !== `dropdown-${id}`) menu.style.display = 'none';
    });

    const menu = document.getElementById(`dropdown-${id}`);
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
};

// إغلاق جميع القوائم المنسدلة عند النقر بالخارج
window.addEventListener('click', () => {
    document.querySelectorAll('.action-menu').forEach(menu => {
        menu.style.display = 'none';
    });
});

// شريط البحث الحي (Live Search)
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        const filteredAssignments = allAssignments.filter(assignment => {
            return assignment.title.toLowerCase().includes(searchTerm) || 
                   assignment.course.toLowerCase().includes(searchTerm);
        });

        renderTable(filteredAssignments);
    });
}

// دالة تصدير الواجبات إلى ملف CSV
function exportAssignmentsToCSV() {
    // 1. التأكد من وجود بيانات
    if (!allAssignments || allAssignments.length === 0) {
        alert('No assignments available to export!');
        return;
    }

    // 2. تعريف رؤوس الأعمدة (Headers)
    let csvContent = "ID,Title,Course,Max Score,Due Date,Status\n";

    // 3. المرور على كل واجب وتعبئة بياناته
    allAssignments.forEach(assignment => {
        // بنرتب البيانات وبنحط فاصلة بينها
        const row = [
            assignment.id,
            `"${assignment.title || assignment.name || ''}"`, // حطينها بين أقواس مزدوجة عشان لو فيها مسافات ما تخرب الفواصل
            `"${assignment.course || ''}"`,
            assignment.maxScore || assignment.score || 0,
            assignment.dueDate || assignment.date || '',
            assignment.status || 'draft'
        ];
        csvContent += row.join(",") + "\n";
    });

    // 4. إنشاء ملف وهمي (Blob) بالذاكرة بنوع CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // 5. صنع رابط وهمي (Anchor) بالخلفية وكبسه لتنزيل الملف
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'assignments_report.csv');
    document.body.appendChild(link);
    
    link.click(); // النقر التلقائي لتنزيل الملف

    // تنظيف العنصر الوهمي من الصفحة بعد التنزيل
    document.body.removeChild(link);
}

// ربط الدالة بالزر فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // افترضنا إنك عطيت رابط الـ Export CSV في الـ HTML معرف (id) اسمه export-csv-btn
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exportAssignmentsToCSV();
        });
    }
});


// ==========================================
// 5. إدارة المودال (Modal Handling: Add, Edit, Delete)
// ==========================================
const modal = document.getElementById('assignment-modal');
const assignmentForm = document.getElementById('assignment-form');
const modalTitleLabel = document.querySelector('.modal-header h3');

// تبديل حالة ظهور النافذة المنبثقة
function toggleModal() {
    if (modal) modal.classList.toggle('active');
}

// فتح المودال لإنشاء واجب جديد
window.openAddModal = function() {
    isEditing = false;
    currentEditId = null;
    if(assignmentForm) assignmentForm.reset();
    if(modalTitleLabel) modalTitleLabel.textContent = "Create New Assignment";
    toggleModal();
};

// ربط أزرار الفتح والإغلاق للمودال
document.getElementById('add-assignment-btn')?.addEventListener('click', window.openAddModal);
document.getElementById('close-modal-btn')?.addEventListener('click', toggleModal);
document.getElementById('cancel-modal-btn')?.addEventListener('click', toggleModal);
window.addEventListener('click', (e) => { if (e.target === modal) toggleModal(); });

// إرسال نموذج الفورم (للإضافة POST أو التعديل PUT)
if (assignmentForm) {
    assignmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dateInput = document.getElementById('modal-date').value;
        let formattedDate = dateInput;
        if (dateInput) {
            const d = new Date(dateInput);
            formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        }

        const assignmentData = {
            title: document.getElementById('modal-title').value,
            description: document.getElementById('modal-description').value,
            course: document.getElementById('modal-course').value,
            score: document.getElementById('modal-score').value,
            date: formattedDate,
            time: document.getElementById('modal-time').value,
            status: document.getElementById('modal-status').value,
            createdAt: isEditing ? allAssignments.find(a => a.id == currentEditId).createdAt : "Created " + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };

        try {
            if (isEditing) {
                await fetch(`${apiUrl}/${currentEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assignmentData)
                });
            } else {
                await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assignmentData)
                });
            }

            toggleModal();
            loadAssignments(); 
        } catch (error) {
            console.error("Error saving assignment:", error);
        }
    });
}

// فتح المودال لتعبئة البيانات القديمة وتعديلها (Edit)
window.editAssignment = function(id) {
    isEditing = true;
    currentEditId = id;
    if(modalTitleLabel) modalTitleLabel.textContent = "Edit Assignment";
    
    const assignment = allAssignments.find(a => a.id == id);
    if(assignment) {
        document.getElementById('modal-title').value = assignment.title || '';
        document.getElementById('modal-description').value = assignment.description || '';
        document.getElementById('modal-course').value = assignment.course || '';
        document.getElementById('modal-score').value = assignment.score || '';
        document.getElementById('modal-time').value = assignment.time || '';
        document.getElementById('modal-status').value = assignment.status ? assignment.status.toLowerCase() : 'published';

        if (assignment.date) {
            const d = new Date(assignment.date);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                document.getElementById('modal-date').value = `${year}-${month}-${day}`;
            }
        }
    }
    toggleModal();
};

// حذف واجب من السيرفر (Delete)
window.deleteAssignment = async function(id) {
    if (confirm("Are you sure ?")) {
        try {
            await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
            loadAssignments(); 
        } catch (error) {
            console.error("Error deleting assignment:", error);
        }
    }
};


// ==========================================
// 6. قائمة الهواتف الجانبية (Burger Menu)
// ==========================================
function initBurgerMenu() {
    const burgerBtn = document.getElementById('burger-btn');
    const sidebar = document.querySelector('.sidebar');

    if (burgerBtn && sidebar) {
        burgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !burgerBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }
}