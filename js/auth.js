// ==========================================
// auth.js - إدارة جلسات المعلمين وتحديث واجهة المستخدم
// ==========================================

const Auth = {
    // 1. Get current logged in instructor
    getCurrentInstructor() {
        let session = null;
        try {
            session = JSON.parse(sessionStorage.getItem('session')) ||
                      JSON.parse(sessionStorage.getItem('currentUser')) ||
                      JSON.parse(localStorage.getItem('currentInstructor'));
        } catch {
            session = null;
        }
        if (!session || !session.id) {
            const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
            window.location.replace(loginPath);
            return { id: null, name: '', email: '' };
        }
        const name = session.name || `${session.first_name || ''} ${session.last_name || ''}`.trim() || 'Trainer';
        return {
            id: session.id,
            name,
            email: session.email || ''
        };
    },

    // 2. Set current instructor and sync session
    setCurrentInstructor(instructor) {
        if (!instructor || !instructor.id) {
            console.error("Invalid instructor data");
            return;
        }
        const name = instructor.name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim() || 'Trainer';
        const payload = { ...instructor, name };
        sessionStorage.setItem('session', JSON.stringify(payload));
        sessionStorage.setItem('currentUser', JSON.stringify(payload));
        localStorage.setItem('currentInstructor', JSON.stringify(payload));
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

    const profileEl = document.querySelector('.user-profile');
    const userNameEl = document.querySelector('.user-profile .user-name');
    const avatarEl = document.querySelector('.user-profile .avatar');

    if (userNameEl) userNameEl.textContent = current.name;
    if (avatarEl) avatarEl.textContent = current.name ? current.name.charAt(0).toUpperCase() : 'U';

    if (profileEl) {
        profileEl.style.cursor = 'pointer';
        profileEl.title = 'View my profile';
        profileEl.addEventListener('click', () => {
            window.location.href = 'instructorProfile.html';
        });
    }
},

    // 5. Clear session and logout
    clearSession() {
        sessionStorage.removeItem('session');
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('currentInstructor');
        const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
        window.location.href = loginPath;
    }
};

// تشغيل تحديث البروفايل تلقائياً فور اكتمال تحميل عناصر الصفحة
document.addEventListener('DOMContentLoaded', () => {
    Auth.renderSidebarProfile();
});