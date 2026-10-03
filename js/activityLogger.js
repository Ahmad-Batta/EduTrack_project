/* ==========================================================
   activityLogger.js — تسجيل وجلب وحذف سجل الأنشطة
   متوافق مع json-server v1 (fallback محلي عند فشل الفلترة)
   ========================================================== */

const ActivityLogger = {
    // 1. تسجيل نشاط جديد
    async logActivity(action, description) {
        try {
            return await ActivityAPI.create({
                instructorId: Auth.getCurrentInstructor().id,
                action,
                description,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Failed to log activity:', error);
        }
    },

    // 2. السجل الكامل من الأحدث للأقدم
    async getActivityHistory() {
        try {
            const instructorId = Auth.getCurrentInstructor().id;

            let logs = await ActivityAPI.getByInstructor(instructorId);

            // fallback: لو السيرفر ما فلترش، نجيب الكل ونفلتر محلياً
            if (!Array.isArray(logs) || logs.length === 0) {
                console.warn('[activity] Server filter returned empty, falling back to full list');
                const all = await ActivityAPI.getAll();
                if (Array.isArray(all)) {
                    logs = all.filter(a => String(a.instructorId) === String(instructorId));
                }
            }

            if (!Array.isArray(logs)) return [];

            return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('Failed to fetch activity history:', error);
            return [];
        }
    },

    // 3. آخر الأنشطة فقط (الافتراضي 5)
    async getRecentActivities(limit = 5) {
        return (await this.getActivityHistory()).slice(0, limit);
    },

    // 4. حذف كل سجل المعلم الحالي
    async clearHistory() {
        const logs = await this.getActivityHistory();
        if (!logs.length) return 0;

        await Promise.all(
            logs.map(log => ActivityAPI.delete(log.id))
        );
        return logs.length;
    },
};