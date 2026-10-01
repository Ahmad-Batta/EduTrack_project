// رابط الـ API تبع JSON Server (عدله إذا البورت عندك مختلف)
const apiUrl = 'http://localhost:3000/assignments';

// متغير عام عشان نقدر نوصله من دالة البحث
let allAssignments = [];
let isEditing = false;
let currentEditId = null;

async function loadAssignments() {
    try {
        // المسار لـ json-server عشان يشتغل الـ CRUD
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Failed to load assignments data.');
        }
        const data = await response.json();
        
        // حفظنا القائمة بالمتغير العام
        allAssignments = data.assignments ? data.assignments : data; 
        
        // عرض الجدول لأول مرة
        renderTable(allAssignments);

    } 
    catch (error) {
        console.error("Error loading assignments:", error);
    }
}

// دالة لجلب وعرض بيانات المستخدم المسجل دخوله
// دالة لجلب وعرض بيانات المستخدم من الـ Local Storage
function loadUserProfile() {
    // 1. بنحاول نجيب الداتا من ذاكرة المتصفح
    const storedUserData = localStorage.getItem('loggedInUser');
    
    // 2. إذا الداتا موجودة بنحولها لـ Object، وإذا مش موجودة بنعطي قيم افتراضية
    const currentUser = storedUserData ? JSON.parse(storedUserData) : { fullName: "Guest User", role: "Visitor" };

    // 3. تحديث الاسم بالـ HTML
    const nameElement = document.getElementById('user-name-display');
    if (nameElement) nameElement.textContent = currentUser.fullName;
    
    // 4. تحديث الرتبة/الدور بالـ HTML
    const roleElement = document.getElementById('user-role-display');
    if (roleElement) roleElement.textContent = currentUser.role;
    
    // 5. تحديث حرف الدائرة (أول حرف من الاسم)
    const avatarElement = document.getElementById('user-avatar-circle');
    if (avatarElement && currentUser.fullName) {
        avatarElement.textContent = currentUser.fullName.charAt(0).toUpperCase();
    }
}

// دالة مسؤولة عن رسم الجدول عشان نقدر نستخدمها بالبحث كمان
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
                    <!-- كبسة الـ 3 نقاط -->
                    <button class="btn-action" onclick="toggleActionMenu(event, '${assignment.id}')" style="background:none; border:none; cursor:pointer; font-size:18px; color:#64748b; font-weight:bold; padding: 4px 8px;">•••</button>
                    
                    <!-- القائمة المنسدلة (Dropdown) -->
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
// دالة فتح وإغلاق القائمة المنسدلة (Dropdown)
// ==========================================
window.toggleActionMenu = function(event, id) {
    event.stopPropagation(); // منع إغلاق القائمة فوراً
    
    // إغلاق أي قائمة مفتوحة مسبقاً
    document.querySelectorAll('.action-menu').forEach(menu => {
        if(menu.id !== `dropdown-${id}`) menu.style.display = 'none';
    });

    // تبديل حالة القائمة المطلوبة (فتح/إغلاق)
    const menu = document.getElementById(`dropdown-${id}`);
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
};

// إغلاق القائمة عند النقر في أي مكان فارغ بالصفحة
window.addEventListener('click', () => {
    document.querySelectorAll('.action-menu').forEach(menu => {
        menu.style.display = 'none';
    });
});


// ==========================================
// كود شريط البحث (Search Bar)
// ==========================================
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


// ==========================================
// الأكواد الخاصة بالـ Modal (الإضافة والتعديل)
// ==========================================
const modal = document.getElementById('assignment-modal');
const assignmentForm = document.getElementById('assignment-form');
const modalTitleLabel = document.querySelector('.modal-header h3');

// دالة فتح وإغلاق المودال
function toggleModal() {
    if (modal) modal.classList.toggle('active');
}

// 1. دالة موحدة لفتح المودال لإضافة واجب جديد
window.openAddModal = function() {
    isEditing = false;
    currentEditId = null;
    if(assignmentForm) assignmentForm.reset();
    if(modalTitleLabel) modalTitleLabel.textContent = "Create New Assignment";
    toggleModal();
};

// تم تعديل الـ ID هنا ليتطابق مع زر الـ HTML الجديد!
document.getElementById('add-assignment-btn')?.addEventListener('click', window.openAddModal);

// ربط أزرار الإضافة الجانبية (لو كبست على الزر اللي بالـ Sidebar)
document.querySelectorAll('a').forEach(link => {
    if(link.textContent.includes('+ Add assignment') || link.textContent.includes('+ New assignment')) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.openAddModal();
        });
    }
});

// إغلاق المودال من الأزرار أو المساحة الفاضية
document.getElementById('close-modal-btn')?.addEventListener('click', toggleModal);
document.getElementById('cancel-modal-btn')?.addEventListener('click', toggleModal);
window.addEventListener('click', (e) => { if (e.target === modal) toggleModal(); });

// 2. إرسال الفورم (سواء إضافة أو تعديل)
if (assignmentForm) {
    assignmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // جلب البيانات وتنسيق التاريخ
        const dateInput = document.getElementById('modal-date').value;
        let formattedDate = dateInput;
        if (dateInput) {
            const d = new Date(dateInput);
            formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        }

        const assignmentData = {
            title: document.getElementById('modal-title').value,
            course: document.getElementById('modal-course').value,
            score: document.getElementById('modal-score').value,
            date: formattedDate,
            status: document.getElementById('modal-status').value,
            createdAt: isEditing ? allAssignments.find(a => a.id == currentEditId).createdAt : "Created " + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };

        try {
            if (isEditing) {
                // تعديل (PUT)
                await fetch(`${apiUrl}/${currentEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assignmentData)
                });
            } else {
                // إضافة (POST)
                await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assignmentData)
                });
            }

            toggleModal();
            loadAssignments(); // بنرجع نحمل الداتا من السيرفر عشان ينعكس التغيير

        } catch (error) {
            console.error("Error saving assignment:", error);
        }
    });
}

// 3. دالة فتح المودال للتعديل (Edit) وجلب الداتا القديمة
window.editAssignment = function(id) {
    isEditing = true;
    currentEditId = id;
    if(modalTitleLabel) modalTitleLabel.textContent = "Edit Assignment";
    
    // بندور على الواجب بالمصفوفة عشان نعبي الفورم
    const assignment = allAssignments.find(a => a.id == id);
    if(assignment) {
        document.getElementById('modal-title').value = assignment.title;
        document.getElementById('modal-course').value = assignment.course;
        document.getElementById('modal-score').value = assignment.score;
        document.getElementById('modal-status').value = assignment.status ? assignment.status.toLowerCase() : 'published';

        // **تعديل مهم جداً:** تحويل صيغة التاريخ عشان يقبله الـ HTML بدون إيرور
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

// 4. دالة الحذف (Delete)
window.deleteAssignment = async function(id) {
    if (confirm("Are you sure ?")) {
        try {
            await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
            loadAssignments(); // تحديث الجدول مباشرة
        } catch (error) {
            console.error("Error deleting assignment:", error);
        }
    }
};


// 1. الصق دالة المواد تبعتك هون
async function loadCourses() {
    const courseSelect = document.getElementById('modal-course');
    if (!courseSelect) return;

    try {
        const courses = [
            { id: 1, name: "JavaScript" },
            { id: 2, name: "HTML / CSS" },
            { id: 3, name: "React.js" },
            { id: 4, name: "Spring Boot" },
            { id: 5, name: "Laravel" }
        ];

        courseSelect.innerHTML = '<option value="" disabled selected>Select a course</option>';
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.name;
            option.textContent = course.name;
            courseSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Error loading courses:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadAssignments);
document.addEventListener("DOMContentLoaded", () => {
    loadAssignments(); 
    loadUserProfile();
    loadCourses(); 
});