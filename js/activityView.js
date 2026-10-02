/* ==========================================================
   activityView.js — عرض الأنشطة + نافذة السجل الكامل + زر Clear
   ========================================================== */

const ActivityView = {
    itemHTML: (a) => `
        <li class="activity-item">
            <span class="activity-tag">${escapeHTML(a.action.replace(/_/g, ' '))}</span>
            <span class="activity-desc">${escapeHTML(a.description)}</span>
            <time>${formatDateTime(a.timestamp)}</time>
        </li>`,

    // رسم خانة "Recent activity" الصغيرة في الصفحة
    async refresh() {
        const list = document.getElementById('recentActivityList');
        if (!list) return;
        const recent = await ActivityLogger.getRecentActivities(5);
        list.innerHTML = recent.length
            ? recent.map(this.itemHTML).join('')
            : '<li class="empty">No activity yet.</li>';
    },

    // رسم قائمة السجل الكامل داخل المودال
    async renderHistoryList() {
        const listEl = document.getElementById('activityHistoryList');
        if (!listEl) return;

        const history = await ActivityLogger.getActivityHistory();
        listEl.innerHTML = history.length
            ? history.map(this.itemHTML).join('')
            : '<li class="empty">No activity yet.</li>';

        // إخفاء/إظهار زر Clear حسب وجود أنشطة
        const clearBtn = document.getElementById('clearActivityBtn');
        if (clearBtn) {
            clearBtn.style.display = history.length ? 'inline-flex' : 'none';
        }
    },

    // فتح نافذة السجل الكامل
    async openHistory() {
        await this.renderHistoryList();
        openModal(document.getElementById('activityModal'));
    },

    // حذف كل السجل
    async clearHistory() {
        const confirmed = confirm(
            '⚠️ Are you sure you want to clear ALL activity history?\n\nThis action cannot be undone.'
        );
        if (!confirmed) return;

        const btn = document.getElementById('clearActivityBtn');
        const originalHTML = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '⏳ Clearing...';

        try {
            const deleted = await ActivityLogger.clearHistory();
            console.log(`[activity] Cleared ${deleted} records`);

            // تحديث القائمة داخل المودال
            await this.renderHistoryList();

            // تحديث خانة Recent activity في الصفحة
            await this.refresh();
        } catch (error) {
            console.error('Failed to clear history:', error);
            alert('Failed to clear history. Is the server running?');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    },
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeActivityBtn')?.addEventListener('click', () => {
        closeModal(document.getElementById('activityModal'));
    });

    document.getElementById('clearActivityBtn')?.addEventListener('click', () => {
        ActivityView.clearHistory();
    });
});