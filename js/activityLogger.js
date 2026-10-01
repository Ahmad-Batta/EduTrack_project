/* activityLogger.js — تسجيل وجلب سجل الأنشطة (معزول لكل مدرّس) */
const ActivityLogger = {
    // 1. تسجيل نشاط جديد، مثال: logActivity('CREATE_QUIZ', 'Created quiz: JS Basics')
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
            const logs = await ActivityAPI.getByInstructor(Auth.getCurrentInstructor().id);
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
};
