import { requireAuth, renderTopNav } from "./layout.js";

requireAuth();
renderTopNav("tasks");

// Global Variables
const apiUrl = 'http://localhost:3000/assignments';
let allAssignments = [];
let isEditing = false;
let currentEditId = null;

// DOMContentLoaded Events
document.addEventListener("DOMContentLoaded", () => {
    loadAssignments();
    loadCourses();
});

// Load assignments from JSON server
async function loadAssignments() {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to load assignments data.');
        
        const data = await response.json();
        allAssignments = data.assignments ? data.assignments : data; 
        
        renderTable(allAssignments);
    } 
    catch (error) {
        console.error("Error loading assignments:", error);
    }
}

function getLocalCourses() {
    try {
        return JSON.parse(localStorage.getItem('edutrack_courses')) || [];
    } catch {
        return [];
    }
}

function normalizeCourse(c) {
    if (!c || typeof c !== 'object') return null;
    const title = c.title || c.name || 'Untitled Course';
    const code = c.code || c.major || 'COURSE';
    const instructorId = c.instructorId || c.instructor_id || null;
    return {
        ...c,
        id: String(c.id),
        title,
        code,
        description: c.description || '',
        instructorId,
        instructor_id: instructorId
    };
}

// Populate course options in modal dropdown
async function loadCourses() {
    const courseSelect = document.getElementById('modal-course');
    if (!courseSelect) return;

    let apiCourses = [];
    try {
        const response = await fetch('http://localhost:3000/courses');
        if (response.ok) {
            const raw = await response.json();
            if (Array.isArray(raw)) apiCourses = raw;
        }
    } catch (error) {
        console.error("Error loading courses from server:", error);
    }

    const localList = getLocalCourses();
    const combinedRaw = [...apiCourses, ...localList];

    const courseMap = new Map();
    combinedRaw.forEach(item => {
        const norm = normalizeCourse(item);
        if (norm && norm.id) {
            courseMap.set(norm.id, norm);
        }
    });

    let currentInstructorId = null;
    try {
        const session = JSON.parse(sessionStorage.getItem('session')) ||
                        JSON.parse(sessionStorage.getItem('currentUser')) ||
                        JSON.parse(localStorage.getItem('currentInstructor'));
        if (session && session.id) currentInstructorId = String(session.id);
    } catch {
        currentInstructorId = null;
    }

    const courses = Array.from(courseMap.values()).filter(c => {
        if (!c.instructorId || !currentInstructorId) return true;
        return String(c.instructorId) === currentInstructorId;
    });

    courseSelect.innerHTML = '<option value="" disabled selected>Select a course</option>';

    if (courses.length === 0) {
        courseSelect.innerHTML += '<option value="" disabled>No courses available</option>';
        return;
    }

    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.title;
        option.textContent = `${course.title} (${course.code})`;
        courseSelect.appendChild(option);
    });
}

// Render Table
function renderTable(assignments) {
    const tableBody = document.querySelector(".data-table tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    if (assignments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty">No assignments found.</td></tr>`;
        return;
    }

    assignments.forEach(assignment => {
        const row = document.createElement("tr");

        const statusClass = (assignment.status || 'draft').toLowerCase();
        const statusText = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);

        row.innerHTML = `
            <td>
                <div class="item-name">${assignment.title}</div>
                <span class="item-date">${assignment.createdAt || ''}</span>
            </td>
            <td>${assignment.course}</td>
            <td>${assignment.date}</td>
            <td>${assignment.score}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-container">
                    <button type="button" class="btn-action" onclick="toggleActionMenu(event, '${assignment.id}')" aria-label="Actions">•••</button>
                    
                    <div id="dropdown-${assignment.id}" class="action-menu">
                        <button type="button" onclick="editAssignment('${assignment.id}')">Edit</button>
                        <button type="button" class="delete-btn" onclick="deleteAssignment('${assignment.id}')">Delete</button>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Action menu handling
window.toggleActionMenu = function(event, id) {
    event.stopPropagation();
    
    document.querySelectorAll('.action-menu').forEach(menu => {
        if (menu.id !== `dropdown-${id}`) menu.classList.remove('active');
    });

    const menu = document.getElementById(`dropdown-${id}`);
    if (menu) {
        menu.classList.toggle('active');
    }
};

window.addEventListener('click', () => {
    document.querySelectorAll('.action-menu').forEach(menu => {
        menu.classList.remove('active');
    });
});

// Live Search
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        const filteredAssignments = allAssignments.filter(assignment => {
            return (assignment.title && assignment.title.toLowerCase().includes(searchTerm)) ||
                   (assignment.course && assignment.course.toLowerCase().includes(searchTerm));
        });

        renderTable(filteredAssignments);
    });
}

// Modal handling
const modal = document.getElementById('assignment-modal');
const assignmentForm = document.getElementById('assignment-form');
const modalTitleLabel = document.getElementById('modal-heading') || document.querySelector('.modal-header h2') || document.querySelector('.modal-header h3');

function toggleModal() {
    if (modal) modal.classList.toggle('active');
}

window.openAddModal = function() {
    isEditing = false;
    currentEditId = null;
    if (assignmentForm) assignmentForm.reset();
    if (modalTitleLabel) modalTitleLabel.textContent = "Create New Assignment";
    toggleModal();
};

document.getElementById('add-assignment-btn')?.addEventListener('click', window.openAddModal);
document.getElementById('close-modal-btn')?.addEventListener('click', toggleModal);
document.getElementById('cancel-modal-btn')?.addEventListener('click', toggleModal);
window.addEventListener('click', (e) => { if (e.target === modal) toggleModal(); });

// Form submission
if (assignmentForm) {
    assignmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dateInput = document.getElementById('modal-date').value;
        let formattedDate = dateInput;
        if (dateInput) {
            const d = new Date(dateInput);
            formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        }

        const assignmentData = {
            title: document.getElementById('modal-title').value,
            description: document.getElementById('modal-description').value,
            course: document.getElementById('modal-course').value,
            score: document.getElementById('modal-score').value,
            date: formattedDate,
            time: document.getElementById('modal-time').value,
            status: document.getElementById('modal-status').value,
            createdAt: isEditing
                ? (allAssignments.find(a => a.id == currentEditId)?.createdAt || "Created " + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                : "Created " + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };

        try {
            if (isEditing) {
                await fetch(`${apiUrl}/${currentEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assignmentData)
                });
            } else {
                await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assignmentData)
                });
            }

            toggleModal();
            loadAssignments(); 
        } catch (error) {
            console.error("Error saving assignment:", error);
        }
    });
}

// Edit assignment
window.editAssignment = function(id) {
    isEditing = true;
    currentEditId = id;
    if (modalTitleLabel) modalTitleLabel.textContent = "Edit Assignment";
    
    const assignment = allAssignments.find(a => a.id == id);
    if (assignment) {
        document.getElementById('modal-title').value = assignment.title || '';
        document.getElementById('modal-description').value = assignment.description || '';
        document.getElementById('modal-course').value = assignment.course || '';
        document.getElementById('modal-score').value = assignment.score || '';
        document.getElementById('modal-time').value = assignment.time || '';
        document.getElementById('modal-status').value = assignment.status ? assignment.status.toLowerCase() : 'published';

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

// Delete assignment
window.deleteAssignment = async function(id) {
    if (confirm("Are you sure you want to delete this assignment?")) {
        try {
            await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
            loadAssignments(); 
        } catch (error) {
            console.error("Error deleting assignment:", error);
        }
    }
};
