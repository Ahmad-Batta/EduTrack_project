/* ==========================================================
   js/home.js - Home / Landing Page Logic & Announcements CRUD
   ========================================================== */

import { BASE_URL } from "./api.js";
import {
  requireAuth,
  renderTopNav,
  escapeHtml,
  openModal,
  closeModal,
  showToast,
} from "./layout.js";

const user = requireAuth();
if (!user) {
  throw new Error("Unauthorized");
}

renderTopNav("home");

/* ---------- State ---------- */
let announcements = [];
let events = [];
let todos = [];

/* ---------- Initialization ---------- */
document.addEventListener("DOMContentLoaded", () => {
  setupGreeting();
  loadDashboardData();
  setupEventListeners();
  loadTodos();
});

function setupGreeting() {
  const greetingEl = document.getElementById("homeGreeting");
  if (!greetingEl) return;
  const hour = new Date().getHours();
  let timeStr = "Good morning";
  if (hour >= 12 && hour < 17) timeStr = "Good afternoon";
  else if (hour >= 17) timeStr = "Good evening";

  const name = user.name ? user.name.split(" ")[0] : "Trainer";
  greetingEl.textContent = `${timeStr}, ${name} 👋`;
}

/* ---------- Load Data ---------- */
async function loadDashboardData() {
  try {
    // Fetch students, assignments, events, announcements in parallel
    const [studentsRes, assignmentsRes, eventsRes, annRes] = await Promise.allSettled([
      fetch(`${BASE_URL}/students`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${BASE_URL}/assignments`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${BASE_URL}/events`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${BASE_URL}/announcements`).then((r) => (r.ok ? r.json() : [])),
    ]);

    let students = studentsRes.status === "fulfilled" ? studentsRes.value : [];
    let assignments = assignmentsRes.status === "fulfilled" ? assignmentsRes.value : [];
    events = eventsRes.status === "fulfilled" ? eventsRes.value : [];
    announcements = annRes.status === "fulfilled" ? annRes.value : [];

    // Fallback if db.json fetched directly
    if (!students.length || !assignments.length) {
      try {
        const rawRes = await fetch("db.json");
        if (rawRes.ok) {
          const dbData = await rawRes.json();
          if (!students.length) students = dbData.students || [];
          if (!assignments.length) assignments = dbData.assignments || [];
          if (!events.length) events = dbData.events || [];
          if (!announcements.length) announcements = dbData.announcements || [];
        }
      } catch (err) {
        console.warn("Direct db.json fallback failed", err);
      }
    }

    // Isolated Data per trainer
    const myStudents = students.filter((s) => String(s.instructor_id || s.trainerId) === String(user.id));
    const myAssignments = assignments.filter((a) => String(a.instructor_id || a.trainerId) === String(user.id));
    const myEvents = events.filter((e) => String(e.instructor_id || e.trainerId) === String(user.id));
    announcements = announcements.filter((a) => String(a.instructor_id || a.trainerId) === String(user.id));

    // Also include local storage announcements
    const localAnn = getLocalAnnouncements();
    announcements = [...announcements, ...localAnn];

    // Remove duplicates by id
    const seen = new Set();
    announcements = announcements.filter((a) => {
      if (seen.has(String(a.id))) return false;
      seen.add(String(a.id));
      return true;
    });

    // Update Quick Stat Counts
    document.getElementById("statHomeStudents").textContent = myStudents.length;
    document.getElementById("statHomeTasks").textContent = myAssignments.length;
    document.getElementById("statHomeEvents").textContent = myEvents.length;
    document.getElementById("statHomeAnnouncements").textContent = announcements.length;

    // Render Components
    renderEventsSummary(myEvents);
    renderAnnouncements();
    seedActivityLogIfEmpty(myStudents, myAssignments);
    renderActivityFeed();
  } catch (error) {
    console.error("Error loading home data:", error);
    showErrorBox("Failed to load dashboard data. Please try refreshing.");
  }
}

function showErrorBox(msg) {
  const box = document.getElementById("errorBox");
  if (!box) return;
  box.textContent = msg;
  box.hidden = false;
}

/* ---------- Events Summary ---------- */
function renderEventsSummary(myEvents) {
  const container = document.getElementById("eventsContainer");
  if (!container) return;

  if (!myEvents.length) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:24px 12px; color:var(--muted);">
        <p style="margin-bottom:8px;">No scheduled events found.</p>
        <a href="events.html?action=add" class="btn btn-sm btn-primary">+ Schedule Event</a>
      </div>`;
    return;
  }

  container.innerHTML = myEvents
    .slice(0, 4)
    .map((ev) => `
      <div class="event-summary-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <strong style="font-size:0.95rem;">${escapeHtml(ev.title)}</strong>
          <span class="badge badge-info" style="font-size:0.75rem;">${escapeHtml(ev.type || "Event")}</span>
        </div>
        <p style="font-size:0.84rem; color:var(--muted); margin-bottom:6px;">${escapeHtml(ev.description || "No details")}</p>
        <div style="font-size:0.78rem; color:var(--navy); font-weight:600;">
          📅 ${escapeHtml(ev.date || "TBD")} ${ev.time ? "• 🕒 " + escapeHtml(ev.time) : ""}
        </div>
      </div>
    `)
    .join("");
}

/* ---------- Activity Feed ---------- */
function getActivityLog() {
  const key = `edutrack_activity_log_${user.id}`;
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveActivityLog(log) {
  const key = `edutrack_activity_log_${user.id}`;
  localStorage.setItem(key, JSON.stringify(log));
}

function logActivity(textHtml, timeStr = "Today") {
  const log = getActivityLog();
  log.unshift({
    title: textHtml,
    time: timeStr,
    timestamp: Date.now(),
  });
  saveActivityLog(log);
  renderActivityFeed();
}

function seedActivityLogIfEmpty(students, assignments) {
  const existing = getActivityLog();
  if (existing.length) return;

  const initial = [];

  // Default initial announcements in activity log
  announcements.forEach((ann) => {
    initial.push({
      title: `Announcement posted: <strong>${escapeHtml(ann.title)}</strong>`,
      time: "Today",
      timestamp: Date.now() - 1000,
    });
  });

  // Default students in activity log
  students.slice(0, 2).forEach((s) => {
    const name = `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.name || "Student";
    initial.push({
      title: `Added student <strong>${escapeHtml(name)}</strong>`,
      time: "Recent",
      timestamp: Date.now() - 2000,
    });
  });

  // Default tasks
  assignments.slice(0, 2).forEach((a) => {
    initial.push({
      title: `New task: <strong>${escapeHtml(a.title)}</strong>`,
      time: a.due_date || "Upcoming",
      timestamp: Date.now() - 3000,
    });
  });

  saveActivityLog(initial);
}

function renderActivityFeed() {
  const feedEl = document.getElementById("activityList");
  if (!feedEl) return;

  const activities = getActivityLog();

  if (!activities.length) {
    feedEl.innerHTML = `<li class="muted" style="padding:12px; text-align:center;">No recent activity</li>`;
    return;
  }

  feedEl.innerHTML = activities
    .slice(0, 10)
    .map(
      (act) => `
      <li>
        <span class="feed-title">${act.title}</span>
        <span class="feed-meta">${escapeHtml(act.time)}</span>
      </li>`
    )
    .join("");
}

/* ---------- Trainer To-Do List ---------- */
function loadTodos() {
  const storageKey = `edutrack_todos_${user.id}`;
  try {
    todos = JSON.parse(localStorage.getItem(storageKey)) || [
      { id: 1, title: "Review student assignment submissions", done: false },
      { id: 2, title: "Prepare lecture slides for next class", done: true },
      { id: 3, title: "Grade JavaScript DOM quizzes", done: false },
    ];
  } catch {
    todos = [];
  }
  renderTodos();
}

function saveTodos() {
  const storageKey = `edutrack_todos_${user.id}`;
  localStorage.setItem(storageKey, JSON.stringify(todos));
  renderTodos();
}

function renderTodos() {
  const listEl = document.getElementById("todoList");
  if (!listEl) return;

  if (!todos.length) {
    listEl.innerHTML = `<p class="muted" style="font-size:0.85rem; padding:12px; text-align:center;">No to-do items. Click "+ Add Task Item" above!</p>`;
    return;
  }

  listEl.innerHTML = todos
    .map(
      (item) => `
      <div class="todo-item">
        <div class="todo-left">
          <input type="checkbox" class="todo-checkbox" data-todo-id="${item.id}" ${item.done ? "checked" : ""} />
          <span class="todo-title ${item.done ? "completed" : ""}">${escapeHtml(item.title)}</span>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-delete-todo="${item.id}" style="color:var(--danger); padding:2px 6px;">✕</button>
      </div>`
    )
    .join("");

  // Event Listeners for checkboxes and delete
  listEl.querySelectorAll(".todo-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = Number(e.target.dataset.todoId);
      const found = todos.find((t) => t.id === id);
      if (found) {
        found.done = e.target.checked;
        saveTodos();
      }
    });
  });

  listEl.querySelectorAll("[data-delete-todo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.deleteTodo);
      todos = todos.filter((t) => t.id !== id);
      saveTodos();
    });
  });
}

function openAddTodoModal() {
  openModal({
    title: "Add To-Do Item",
    subtitle: "Add a personal task item to your daily agenda",
    bodyHtml: `
      <form id="todoForm">
        <div class="form-group">
          <label for="todoTitle">Task Description</label>
          <input type="text" id="todoTitle" required placeholder="e.g. Grade midterm assignments" />
        </div>
        <div class="form-actions" style="margin-top:20px;">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Add Task</button>
        </div>
      </form>`,
  });

  const modal = document.getElementById("modalBackdrop");
  modal?.querySelector("[data-close]")?.addEventListener("click", closeModal);

  modal?.querySelector("#todoForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = modal.querySelector("#todoTitle").value.trim();
    if (!title) return;

    todos.push({
      id: Date.now(),
      title,
      done: false,
    });

    saveTodos();
    closeModal();
    showToast("Task added to agenda", "success");
  });
}

/* ---------- Announcements CRUD ---------- */
function getLocalAnnouncements() {
  try {
    const data = JSON.parse(localStorage.getItem(`edutrack_announcements_${user.id}`)) || [];
    return data;
  } catch {
    return [];
  }
}

function saveLocalAnnouncement(ann) {
  const local = getLocalAnnouncements();
  const idx = local.findIndex((a) => String(a.id) === String(ann.id));
  if (idx >= 0) {
    local[idx] = ann;
  } else {
    local.unshift(ann);
  }
  localStorage.setItem(`edutrack_announcements_${user.id}`, JSON.stringify(local));
}

function removeLocalAnnouncement(id) {
  const local = getLocalAnnouncements();
  const filtered = local.filter((a) => String(a.id) !== String(id));
  localStorage.setItem(`edutrack_announcements_${user.id}`, JSON.stringify(filtered));
}

function renderAnnouncements() {
  const listEl = document.getElementById("announcementList");
  if (!listEl) return;

  if (!announcements.length) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <p class="empty-state" style="margin-bottom:8px;">No announcements posted yet.</p>
        <button type="button" class="btn btn-sm btn-primary" id="addAnnouncementBtnEmpty">+ Add Announcement</button>
      </div>`;
    listEl.querySelector("#addAnnouncementBtnEmpty")?.addEventListener("click", openAddAnnouncementModal);
    return;
  }

  listEl.innerHTML = announcements
    .map((ann) => {
      const priorityClass = ann.priority ? `priority-${escapeHtml(ann.priority)}` : "priority-medium";
      return `
      <article class="announcement ${priorityClass}">
        <div class="announcement-head">
          <h4>${escapeHtml(ann.title)}</h4>
          <div style="display:flex; gap:6px; align-items:center;">
            ${ann.priority ? `<span class="badge badge-${ann.priority === "high" ? "danger" : ann.priority === "medium" ? "warning" : "success"}" style="font-size:0.7rem;">${escapeHtml(ann.priority.toUpperCase())}</span>` : ""}
            <button type="button" class="btn btn-ghost btn-sm" data-edit-ann="${ann.id}" style="padding:2px 6px;" title="Edit">✏️</button>
            <button type="button" class="btn btn-ghost btn-sm" data-delete-ann="${ann.id}" style="padding:2px 6px; color:var(--danger);" title="Delete">🗑️</button>
          </div>
        </div>
        <p>${escapeHtml(ann.content || ann.message || ann.body || "")}</p>
        <time>${escapeHtml(ann.date || ann.createdAt || new Date().toLocaleDateString())}</time>
      </article>`;
    })
    .join("");

  // Attach Edit and Delete listeners
  listEl.querySelectorAll("[data-edit-ann]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.editAnn;
      const found = announcements.find((a) => String(a.id) === String(id));
      if (found) openEditAnnouncementModal(found);
    });
  });

  listEl.querySelectorAll("[data-delete-ann]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.deleteAnn;
      confirmDeleteAnnouncement(id);
    });
  });
}

function openAddAnnouncementModal() {
  openModal({
    title: "Post New Announcement",
    subtitle: "Share reminders and notices with your classes",
    bodyHtml: `
      <form id="announcementForm">
        <div class="form-group">
          <label for="annTitle">Title</label>
          <input type="text" id="annTitle" required placeholder="e.g. Midterm Progress Exam Reminder" />
        </div>
        <div class="form-group">
          <label for="annPriority">Priority</label>
          <select id="annPriority">
            <option value="low">Low Priority</option>
            <option value="medium" selected>Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>
        <div class="form-group">
          <label for="annContent">Message</label>
          <textarea id="annContent" rows="3" required placeholder="Write announcement details here..."></textarea>
        </div>
        <div class="form-actions" style="margin-top:20px;">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Post Announcement</button>
        </div>
      </form>`,
  });

  const modal = document.getElementById("modalBackdrop");
  modal?.querySelector("[data-close]")?.addEventListener("click", closeModal);

  modal?.querySelector("#announcementForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = modal.querySelector("#annTitle").value.trim();
    const priority = modal.querySelector("#annPriority").value;
    const content = modal.querySelector("#annContent").value.trim();

    if (!title || !content) return;

    const newAnn = {
      id: "ann_" + Date.now(),
      instructor_id: String(user.id),
      trainerId: String(user.id),
      title,
      priority,
      content,
      date: new Date().toISOString().split("T")[0],
    };

    // Try POST to API
    try {
      const res = await fetch(`${BASE_URL}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnn),
      });
      if (!res.ok) throw new Error("API error");
      const saved = await res.json();
      announcements.unshift(saved);
    } catch {
      // Fallback
      saveLocalAnnouncement(newAnn);
      announcements.unshift(newAnn);
    }

    closeModal();
    renderAnnouncements();
    document.getElementById("statHomeAnnouncements").textContent = announcements.length;
    logActivity(`Announcement posted: <strong>${escapeHtml(newAnn.title)}</strong>`, "Just now");
    showToast("Announcement posted successfully", "success");
  });
}

function openEditAnnouncementModal(ann) {
  openModal({
    title: "Edit Announcement",
    subtitle: "Update notice details",
    bodyHtml: `
      <form id="editAnnForm">
        <div class="form-group">
          <label for="editAnnTitle">Title</label>
          <input type="text" id="editAnnTitle" required value="${escapeHtml(ann.title)}" />
        </div>
        <div class="form-group">
          <label for="editAnnPriority">Priority</label>
          <select id="editAnnPriority">
            <option value="low" ${ann.priority === "low" ? "selected" : ""}>Low Priority</option>
            <option value="medium" ${ann.priority === "medium" || !ann.priority ? "selected" : ""}>Medium Priority</option>
            <option value="high" ${ann.priority === "high" ? "selected" : ""}>High Priority</option>
          </select>
        </div>
        <div class="form-group">
          <label for="editAnnContent">Message</label>
          <textarea id="editAnnContent" rows="3" required>${escapeHtml(ann.content || ann.message || ann.body || "")}</textarea>
        </div>
        <div class="form-actions" style="margin-top:20px;">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes (PUT/PATCH)</button>
        </div>
      </form>`,
  });

  const modal = document.getElementById("modalBackdrop");
  modal?.querySelector("[data-close]")?.addEventListener("click", closeModal);

  modal?.querySelector("#editAnnForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updated = {
      ...ann,
      title: modal.querySelector("#editAnnTitle").value.trim(),
      priority: modal.querySelector("#editAnnPriority").value,
      content: modal.querySelector("#editAnnContent").value.trim(),
    };

    // Try PATCH or PUT to API
    try {
      const res = await fetch(`${BASE_URL}/announcements/${ann.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("PATCH failed");
    } catch {
      saveLocalAnnouncement(updated);
    }

    const idx = announcements.findIndex((a) => String(a.id) === String(ann.id));
    if (idx >= 0) announcements[idx] = updated;

    closeModal();
    renderAnnouncements();
    logActivity(`Announcement updated: <strong>${escapeHtml(updated.title)}</strong>`, "Just now");
    showToast("Announcement updated", "success");
  });
}

function confirmDeleteAnnouncement(id) {
  openModal({
    title: "Delete Announcement",
    subtitle: "Are you sure you want to delete this announcement?",
    bodyHtml: `
      <div class="form-actions" style="margin-top:16px;">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmDeleteAnnBtn">Delete</button>
      </div>`,
  });

  const modal = document.getElementById("modalBackdrop");
  modal?.querySelector("[data-close]")?.addEventListener("click", closeModal);

  modal?.querySelector("#confirmDeleteAnnBtn")?.addEventListener("click", async () => {
    try {
      await fetch(`${BASE_URL}/announcements/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    const deletedItem = announcements.find((a) => String(a.id) === String(id));
    removeLocalAnnouncement(id);
    announcements = announcements.filter((a) => String(a.id) !== String(id));

    closeModal();
    renderAnnouncements();
    document.getElementById("statHomeAnnouncements").textContent = announcements.length;
    if (deletedItem) {
      logActivity(`Announcement deleted: <strong>${escapeHtml(deletedItem.title)}</strong>`, "Just now");
    }
    showToast("Announcement deleted", "info");
  });
}

/* ---------- Setup Event Listeners ---------- */
function setupEventListeners() {
  document.getElementById("addAnnouncementBtn")?.addEventListener("click", openAddAnnouncementModal);
  document.getElementById("quickAnnouncementBtn")?.addEventListener("click", openAddAnnouncementModal);
  document.getElementById("addTodoBtn")?.addEventListener("click", openAddTodoModal);
}
