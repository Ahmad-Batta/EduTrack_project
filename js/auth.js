// ==========================================
// auth.js - إدارة جلسات المعلمين وتحديث واجهة المستخدم
// ==========================================

const Auth = {
    // 1. جلب المعلم الحالي من LocalStorage (أو تعيين المعلم الافتراضي إذا لم يوجد)
    getCurrentInstructor() {
        let instructor = null;
        try {
            instructor = JSON.parse(localStorage.getItem('currentInstructor'));
        } catch {
            instructor = null;
        }
        if (!instructor || !instructor.id) {
            instructor = {
                id: "1",
                name: "Naser Bader",
                email: "naser.bader@example.com"
            };
            localStorage.setItem('currentInstructor', JSON.stringify(instructor));
        }
        return instructor;
    },

    // 2. تعيين معلم جديد وتحديث الجلسة مع إعادة تحميل الصفحة
    setCurrentInstructor(instructor) {
        if (!instructor || !instructor.id) {
            console.error("Invalid instructor data");
            return;
        }
        localStorage.setItem('currentInstructor', JSON.stringify(instructor));
        window.location.reload();
    },

    // 3. التبديل إلى معلم آخر باستخدام الـ ID عبر الاستعلام من الخادم
    async switchInstructorById(instructorId) {
        try {
            const response = await fetch(`${BASE_URL}/instructors/${instructorId}`);
            if (!response.ok) throw new Error('Instructor not found');
            const instructor = await response.json();
            this.setCurrentInstructor(instructor);
        } catch (error) {
            console.error('Failed to switch instructor:', error);
        }
    },

    // 4. عرض اسم المعلم والصورة الرمزية (Avatar) في القائمة الجانبية ديناميكياً
    renderSidebarProfile() {
        const current = this.getCurrentInstructor();

        const userNameEl = document.querySelector('.user-profile .user-name');
        const avatarEl = document.querySelector('.user-profile .avatar');

        if (userNameEl) {
            userNameEl.textContent = current.name;
        }
        if (avatarEl) {
            avatarEl.textContent = current.name ? current.name.charAt(0).toUpperCase() : 'U';
        }
    },

    // 5. مسح الجلسة وإعادة الضبط
    clearSession() {
        localStorage.removeItem('currentInstructor');
        window.location.reload();
    }
};

// تشغيل تحديث البروفايل تلقائياً فور اكتمال تحميل عناصر الصفحة
document.addEventListener('DOMContentLoaded', () => {
    Auth.renderSidebarProfile();
});