/* api.js — كل طلبات الـ HTTP بمكان واحد (أسماء الـ endpoints مطابقة لـ db.json) */
const BASE_URL = 'http://localhost:3000';

async function request(endpoint, options = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} on ${endpoint}`);
    return response.json();
}

const send = (method, data) => ({ method, body: JSON.stringify(data) });

const QuizAPI = {
    getByInstructor: (instructorId) => request(`/quizzes?instructorId=${instructorId}`),
    create: (data) => request('/quizzes', send('POST', data)),
    patch: (id, data) => request(`/quizzes/${id}`, send('PATCH', data)),
    delete: (id) => request(`/quizzes/${id}`, { method: 'DELETE' }),
};

const CourseAPI = {
    getByInstructor: (instructorId) => request(`/courses?instructorId=${instructorId}`),
    create: (data) => request('/courses', send('POST', data)),
    patch: (id, data) => request(`/courses/${id}`, send('PATCH', data)),
    delete: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
};

const StudentAPI = {
    getAll: () => request('/students'),
};

const ResultAPI = {
    getAll: () => request('/results'),
    getByQuizId: (quizId) => request(`/results?quizId=${quizId}`),
    create: (data) => request('/results', send('POST', data)),
    patch: (id, data) => request(`/results/${id}`, send('PATCH', data)),
    delete: (id) => request(`/results/${id}`, { method: 'DELETE' }),
};

const ActivityAPI = {
    getByInstructor: (instructorId) => request(`/activities?instructorId=${instructorId}`),
    create: (data) => request('/activities', send('POST', data)),
};
