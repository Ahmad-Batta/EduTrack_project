const BASE_URL = 'http://localhost:3000';

function extractArray(data, resource) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return null;

    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.items)) return data.items;
    if (resource && Array.isArray(data[resource])) return data[resource];

    for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
            console.warn(`[api] Found array under unexpected key "${key}"`);
            return data[key];
        }
    }
    return null;
}

async function request(endpoint, options = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
        },
        ...options,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} on ${endpoint}`);
    if (response.status === 204) return null;

    const text = await response.text();
    if (!text) return null;

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        console.error('[api] Non-JSON response from', endpoint);
        return null;
    }

    const resource = endpoint.split('?')[0].split('/')[1];
    const method = (options.method || 'GET').toUpperCase();

    if (method === 'GET') {
        const arr = extractArray(data, resource);
        if (arr) {
            console.log(`[api] ${endpoint} → ${arr.length} items`);
            return arr;
        }
    }

    if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        'data' in data &&
        !('id' in data)
    ) {
        return data.data;
    }

    return data;
}

const send = (method, data) => ({ method, body: JSON.stringify(data) });

/* ---------- الكورسات ---------- */
const CourseAPI = {
    getAll: () => request('/courses'),
    getByInstructor: (instructorId) => request(`/courses?instructorId=${instructorId}`),
    create: (data) => request('/courses', send('POST', data)),
    patch: (id, data) => request(`/courses/${id}`, send('PATCH', data)),
    delete: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
};

/* ---------- الكويزات ---------- */
const QuizAPI = {
    getAll: () => request('/quizzes'),
    getByInstructor: (instructorId) => request(`/quizzes?instructorId=${instructorId}`),
    create: (data) => request('/quizzes', send('POST', data)),
    patch: (id, data) => request(`/quizzes/${id}`, send('PATCH', data)),
    delete: (id) => request(`/quizzes/${id}`, { method: 'DELETE' }),
};

/* ---------- الطلاب ---------- */
const StudentAPI = {
    getAll: () => request('/students'),
};

/* ---------- النتائج ---------- */
const ResultAPI = {
    getAll: () => request('/results'),
    getByQuizId: (quizId) => request(`/results?quizId=${quizId}`),
    create: () => request('/results', send('POST', data)),
    patch: (id, data) => request(`/results/${id}`, send('PATCH', data)),
    delete: (id) => request(`/results/${id}`, { method: 'DELETE' }),
};

/* ---------- الأنشطة ---------- */
const ActivityAPI = {
    getAll: () => request('/activities'),
    getByInstructor: (instructorId) => request(`/activities?instructorId=${instructorId}`),
    create: (data) => request('/activities', send('POST', data)),
    delete: (id) => request(`/activities/${id}`, { method: 'DELETE' }),
};

/* ---------- إضافة متوافقة مع طريقة ملك (Generic API Object) احتياطاً ---------- */
export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    delete: (path) => request(path, { method: 'DELETE' }),
};
export { BASE_URL };