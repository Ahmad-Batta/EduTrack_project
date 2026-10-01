/* utils.js — دوال مساعدة مشتركة بين كل الصفحات */

// تنظيف النصوص قبل وضعها داخل innerHTML (حماية من XSS)
const escapeHTML = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const toPercent = (score, total) => (total > 0 ? (score / total) * 100 : 0);

const openModal = (el) => el.classList.add('active');
const closeModal = (el) => el.classList.remove('active');

// إغلاق أي نافذة بزر Escape أو بالضغط خارجها
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(closeModal);
});
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeModal(e.target);
});