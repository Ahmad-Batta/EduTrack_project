/* activityView.js — عرض الأنشطة الأخيرة + نافذة السجل الكامل */
const ActivityView = {
    itemHTML: (a) => `
        <li class="activity-item">
            <span class="activity-tag">${escapeHTML(a.action.replace(/_/g, ' '))}</span>
            <span class="activity-desc">${escapeHTML(a.description)}</span>
            <time>${formatDateTime(a.timestamp)}</time>
        </li>`,

    async refresh() {
        const list = document.getElementById('recentActivityList');
        if (!list) return;
        const recent = await ActivityLogger.getRecentActivities(5);
        list.innerHTML = recent.length ? recent.map(this.itemHTML).join('') : '<li class="empty">No activity yet.</li>';
    },

    async openHistory() {
        const history = await ActivityLogger.getActivityHistory();
        document.getElementById('activityHistoryList').innerHTML =
            history.length ? history.map(this.itemHTML).join('') : '<li class="empty">No activity yet.</li>';
        openModal(document.getElementById('activityModal'));
    },
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeActivityBtn')?.addEventListener('click', () => closeModal(document.getElementById('activityModal')));
});
