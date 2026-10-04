/* ==========================================================================
    js/home.js - Instructor Home / Landing Page Portal
    --------------------------------------------------------------------------
    This module powers the main instructor portal (home page).
    ========================================================================== */

import { BASE_URL } from "./api.js";
import {
  requireAuth,
  renderTopNav,
  escapeHtml,
  openModal,
  closeModal,
  showToast,
} from "./layout.js";

// Check if user is logged in
const user = requireAuth();
if (!user) {
  throw new Error("Unauthorized access to landing page");
}

// Render the top navigation bar
renderTopNav("home");

// Page State Variables
let announcements = [];
let events = [];
let todos = [];

// Run when the page loads
document.addEventListener("DOMContentLoaded", function () {
  setupGreeting();
  loadDashboardData();
  setupEventListeners();
  loadTodos();
});

/**
 * Sets a personalized greeting (Good morning/afternoon/evening) based on the user's local time.
 */
function setupGreeting() {
  const greetingEl = document.getElementById("homeGreeting");
  if (!greetingEl) return;

  const hour = new Date().getHours();
  let timeStr = "Good morning";
  
  if (hour >= 12 && hour < 17) {
    timeStr = "Good afternoon";
  } else if (hour >= 17) {
    timeStr = "Good evening";
  }

  const name = user.name ? user.name.split(" ")[0] : "Trainer";
  greetingEl.textContent = timeStr + ", " + name + " 👋";
}

/* --------------------------------------------------------------------------
   Data Loading
  -------------------------------------------------------------------------- */

/**
 * Fetches students, assignments, events, and announcements from the server,
 * filters them for the logged-in instructor, combines them with local storage data,
 * and updates all dashboard counts and widgets.
 */
async function loadDashboardData() {
  try {
    // Fetch data from API endpoints
    const studentsRes = await fetch(BASE_URL + "/students");
    const students = studentsRes.ok ? await studentsRes.json() : [];

    const assignmentsRes = await fetch(BASE_URL + "/assignments");
    const assignments = assignmentsRes.ok ? await assignmentsRes.json() : [];

    const eventsRes = await fetch(BASE_URL + "/events");
    events = eventsRes.ok ? await eventsRes.json() : [];

    const annRes = await fetch(BASE_URL + "/announcements");
    announcements = annRes.ok ? await annRes.json() : [];

    // Filter datasets for the logged-in instructor
    const myStudents = students.filter(function (s) {
      const trainerId = s.instructor_id || s.trainerId || s.instructorId;
      return String(trainerId) === String(user.id);
    });

    const myAssignments = assignments.filter(function (a) {
      const trainerId = a.instructor_id || a.trainerId || a.instructorId;
      return String(trainerId) === String(user.id);
    });

    const myEvents = events.filter(function (e) {
      const trainerId = e.instructor_id || e.trainerId || e.instructorId;
      return String(trainerId) === String(user.id);
    });

    announcements = announcements.filter(function (a) {
      const trainerId = a.instructor_id || a.trainerId || a.instructorId;
      return String(trainerId) === String(user.id);
    });

    // Combine with local storage items
    const localEvents = getLocalEvents().filter(function (e) {
      const trainerId = e.instructor_id || e.trainerId || e.instructorId;
      return String(trainerId) === String(user.id);
    });
    const finalEvents = myEvents.concat(localEvents);

    const localAnn = getLocalAnnouncements();
    announcements = announcements.concat(localAnn);

    // Update top summary counters
    document.getElementById("statHomeStudents").textContent = myStudents.length;
    document.getElementById("statHomeTasks").textContent = myAssignments.length;
    document.getElementById("statHomeEvents").textContent = finalEvents.length;
    document.getElementById("statHomeAnnouncements").textContent = announcements.length;

    // Render widgets
    renderEventsSummary(finalEvents);
    renderAnnouncements();
    seedActivityLogIfEmpty(myStudents, myAssignments);
    renderActivityFeed();

  } catch (error) {
    console.error("Error loading dashboard data:", error);
    const box = document.getElementById("errorBox");
    if (box) {
      box.textContent = "Failed to load dashboard data. Please refresh.";
      box.hidden = false;
    }
  }
}

/* --------------------------------------------------------------------------
   Local Storage Helpers
  -------------------------------------------------------------------------- */

/**
 * Retrieves cached events from the browser's local storage.
 */
function getLocalEvents() {
  try {
    return JSON.parse(localStorage.getItem("edutrack_events")) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Retrieves announcements specific to the logged-in user from local storage.
 */
function getLocalAnnouncements() {
  try {
    return JSON.parse(localStorage.getItem("edutrack_announcements_" + user.id)) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Saves or updates a specific announcement in local storage.
 */
function saveLocalAnnouncement(ann) {
  let local = getLocalAnnouncements();
  let foundIndex = -1;
  for (let i = 0; i < local.length; i++) {
    if (String(local[i].id) === String(ann.id)) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex >= 0) {
    local[foundIndex] = ann;
  } else {
    local.unshift(ann);
  }
  localStorage.setItem("edutrack_announcements_" + user.id, JSON.stringify(local));
}

/**
 * Removes an announcement from local storage by its ID.
 */
function removeLocalAnnouncement(id) {
  let local = getLocalAnnouncements();
  let filtered = local.filter(function (a) {
    return String(a.id) !== String(id);
  });
  localStorage.setItem("edutrack_announcements_" + user.id, JSON.stringify(filtered));
}

/* --------------------------------------------------------------------------
   Events Summary Widget
  -------------------------------------------------------------------------- */

/**
 * Renders up to 4 upcoming event cards onto the dashboard summary widget.
 */
function renderEventsSummary(myEvents) {
  const container = document.getElementById("eventsContainer");
  if (!container) return;

  if (myEvents.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:24px 12px; color:var(--muted);">
        <p style="margin-bottom:8px;">No scheduled events found.</p>
        <a href="events.html?action=add" class="btn btn-sm btn-primary">+ Schedule Event</a>
      </div>`;
    return;
  }

  let html = "";
  let limit = myEvents.length > 4 ? 4 : myEvents.length;

  for (let i = 0; i < limit; i++) {
    let ev = myEvents[i];
    let badgeClass = "badge-info";
    if (ev.type === "Exam") badgeClass = "badge-danger";
    if (ev.type === "Workshop") badgeClass = "badge-warning";

    html += `
      <div class="event-summary-card" style="padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <strong style="font-size:0.95rem;">${escapeHtml(ev.title)}</strong>
          <span class="badge ${badgeClass}" style="font-size:0.75rem;">${escapeHtml(ev.type || "Event")}</span>
        </div>
        <p style="font-size:0.84rem; color:var(--muted); margin-bottom:6px;">${escapeHtml(ev.location || "Online")}</p>
        <div style="font-size:0.78rem; color:var(--navy); font-weight:600;">
          📅 ${escapeHtml(ev.date || "TBD")} ${ev.time ? "• 🕒 " + escapeHtml(ev.time) : ""}
        </div>
      </div>`;
  }

  container.innerHTML = html;
}

/* --------------------------------------------------------------------------
   Activity History Feed
  -------------------------------------------------------------------------- */

/**
 * Gets the activity log list from local storage for the current user.
 */
function getActivityLog() {
  let key = "edutrack_activity_log_" + user.id;
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Saves the updated activity log array into local storage.
 */
function saveActivityLog(log) {
  let key = "edutrack_activity_log_" + user.id;
  localStorage.setItem(key, JSON.stringify(log));
}

/**
 * Adds a new entry to the top of the activity log and re-renders the feed.
 */
function logActivity(textHtml, timeStr) {
  let log = getActivityLog();
  log.unshift({
    title: textHtml,
    time: timeStr || "Today",
    timestamp: Date.now(),
  });
  saveActivityLog(log);
  renderActivityFeed();
}

/**
 * Generates initial baseline activity logs if the log is completely empty.
 */
function seedActivityLogIfEmpty(students, assignments) {
  let existing = getActivityLog();
  if (existing.length > 0) return;

  let initial = [];

  for (let i = 0; i < announcements.length; i++) {
    initial.push({
      title: "Announcement posted: <strong>" + escapeHtml(announcements[i].title) + "</strong>",
      time: "Today",
      timestamp: Date.now() - 1000,
    });
  }

  let studentLimit = students.length > 2 ? 2 : students.length;
  for (let i = 0; i < studentLimit; i++) {
    let s = students[i];
    let name = (s.first_name || "") + " " + (s.last_name || "");
    name = name.trim() || s.name || "Student";
    initial.push({
      title: "Added student <strong>" + escapeHtml(name) + "</strong>",
      time: "Recent",
      timestamp: Date.now() - 2000,
    });
  }

  let assignLimit = assignments.length > 2 ? 2 : assignments.length;
  for (let i = 0; i < assignLimit; i++) {
    let a = assignments[i];
    initial.push({
      title: "New task: <strong>" + escapeHtml(a.title) + "</strong>",
      time: a.due_date || "Upcoming",
      timestamp: Date.now() - 3000,
    });
  }

  saveActivityLog(initial);
}

/**
 * Renders the recent activity log items onto the feed UI element.
 */
function renderActivityFeed() {
  const feedEl = document.getElementById("activityList");
  if (!feedEl) return;

  let activities = getActivityLog();

  if (activities.length === 0) {
    feedEl.innerHTML = `<li class="muted" style="padding:12px; text-align:center;">No recent activity</li>`;
    return;
  }

  let html = "";
  let limit = activities.length > 10 ? 10 : activities.length;

  for (let i = 0; i < limit; i++) {
    let act = activities[i];
    html += `
      <li style="padding:8px 0; border-bottom:1px dashed var(--border); font-size:0.88rem; display:flex; justify-content:space-between;">
        <span class="feed-title">${act.title}</span>
        <span class="feed-meta" style="color:var(--muted); font-size:0.78rem;">${escapeHtml(act.time)}</span>
      </li>`;
  }

  feedEl.innerHTML = html;
}

/* --------------------------------------------------------------------------
   Trainer Personal To-Do List Widget
  -------------------------------------------------------------------------- */

/**
 * Loads the trainer's personal to-do list items from local storage.
 */
function loadTodos() {
  const storageKey = "edutrack_todos_" + user.id;
  try {
    todos = JSON.parse(localStorage.getItem(storageKey)) || [
      { id: 1, title: "Review student assignment submissions", done: false },
      { id: 2, title: "Prepare lecture slides for next class", done: true },
      { id: 3, title: "Grade JavaScript DOM quizzes", done: false },
    ];
  } catch (e) {
    todos = [];
  }
  renderTodos();
}

/**
 * Saves the current to-do list array to local storage and refreshes the display.
 */
function saveTodos() {
  const storageKey = "edutrack_todos_" + user.id;
  localStorage.setItem(storageKey, JSON.stringify(todos));
  renderTodos();
}

/**
 * Renders all to-do items into the task list UI and attaches interaction handlers.
 */
function renderTodos() {
  const listEl = document.getElementById("todoList");
  if (!listEl) return;

  if (todos.length === 0) {
    listEl.innerHTML = `<p class="muted" style="font-size:0.85rem; padding:12px; text-align:center;">No to-do items. Click "+ Add Task Item" above!</p>`;
    return;
  }

  let html = "";
  for (let i = 0; i < todos.length; i++) {
    let item = todos[i];
    html += `
      <div class="todo-item">
        <div class="todo-left">
          <input type="checkbox" class="todo-checkbox" data-todo-id="${item.id}" ${item.done ? "checked" : ""} />
          <span class="todo-title ${item.done ? "completed" : ""}">${escapeHtml(item.title)}</span>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-delete-todo="${item.id}" style="color:var(--danger); padding:2px 6px;">✕</button>
      </div>`;
  }

  listEl.innerHTML = html;

  // Add event listeners for checkboxes and delete buttons
  listEl.querySelectorAll(".todo-checkbox").forEach(function (cb) {
    cb.addEventListener("change", function (e) {
      let id = Number(e.target.dataset.todoId);
      for (let i = 0; i < todos.length; i++) {
        if (todos[i].id === id) {
          todos[i].done = e.target.checked;
          break;
        }
      }
      saveTodos();
    });
  });

  listEl.querySelectorAll("[data-delete-todo]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      let id = Number(btn.dataset.deleteTodo);
      todos = todos.filter(function (t) {
        return t.id !== id;
      });
      saveTodos();
    });
  });
}

/**
 * Opens a modal dialog allowing the user to create and add a new personal to-do task.
 */
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
  if (modal) {
    modal.querySelector("[data-close]")?.addEventListener("click", closeModal);
    modal.querySelector("#todoForm")?.addEventListener("submit", function (e) {
      e.preventDefault();
      let titleInput = modal.querySelector("#todoTitle");
      let title = titleInput ? titleInput.value.trim() : "";
      if (!title) return;

      todos.push({
        id: Date.now(),
        title: title,
        done: false,
      });

      saveTodos();
      closeModal();
      showToast("Task added to agenda", "success");
    });
  }
}

/* --------------------------------------------------------------------------
   Announcements Section
  -------------------------------------------------------------------------- */

/**
 * Renders all class announcements onto the announcement section UI.
 */
function renderAnnouncements() {
  const listEl = document.getElementById("announcementList");
  if (!listEl) return;

  if (announcements.length === 0) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <p class="empty-state" style="margin-bottom:8px;">No announcements posted yet.</p>
        <button type="button" class="btn btn-sm btn-primary" id="addAnnouncementBtnEmpty">+ Add Announcement</button>
      </div>`;
    listEl.querySelector("#addAnnouncementBtnEmpty")?.addEventListener("click", openAddAnnouncementModal);
    return;
  }

  let html = "";
  for (let i = 0; i < announcements.length; i++) {
    let ann = announcements[i];
    let priorityClass = ann.priority ? "priority-" + escapeHtml(ann.priority) : "priority-medium";
    
    let badgeColor = "success";
    if (ann.priority === "high") badgeColor = "danger";
    if (ann.priority === "medium") badgeColor = "warning";

    let msg = ann.content || ann.message || ann.body || "";
    let dateStr = ann.date || ann.createdAt || new Date().toLocaleDateString();

    html += `
      <article class="announcement ${priorityClass}" style="margin-bottom:12px; padding:12px; border-left:4px solid var(--primary); background:#ffffff; border-radius:var(--radius-sm);">
        <div class="announcement-head" style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="margin:0; font-size:1rem;">${escapeHtml(ann.title)}</h4>
          <div style="display:flex; gap:6px; align-items:center;">
            ${ann.priority ? `<span class="badge badge-${badgeColor}" style="font-size:0.7rem;">${escapeHtml(ann.priority.toUpperCase())}</span>` : ""}
            <button type="button" class="btn btn-ghost btn-sm" data-edit-ann="${ann.id}" style="padding:2px 6px;" title="Edit">✏️</button>
            <button type="button" class="btn btn-ghost btn-sm" data-delete-ann="${ann.id}" style="padding:2px 6px; color:var(--danger);" title="Delete">🗑️</button>
          </div>
        </div>
        <p style="margin:6px 0; font-size:0.88rem;">${escapeHtml(msg)}</p>
        <time style="font-size:0.75rem; color:var(--muted);">${escapeHtml(dateStr)}</time>
      </article>`;
  }

  listEl.innerHTML = html;

  listEl.querySelectorAll("[data-edit-ann]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      let id = btn.dataset.editAnn;
      let found = null;
      for (let i = 0; i < announcements.length; i++) {
        if (String(announcements[i].id) === String(id)) {
          found = announcements[i];
          break;
        }
      }
      if (found) openEditAnnouncementModal(found);
    });
  });

  listEl.querySelectorAll("[data-delete-ann]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      let id = btn.dataset.deleteAnn;
      confirmDeleteAnnouncement(id);
    });
  });
}

/**
 * Opens a modal dialog allowing the instructor to create and post a new announcement.
 */
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
  if (modal) {
    modal.querySelector("[data-close]")?.addEventListener("click", closeModal);
    modal.querySelector("#announcementForm")?.addEventListener("submit", async function (e) {
      e.preventDefault();
      let title = modal.querySelector("#annTitle").value.trim();
      let priority = modal.querySelector("#annPriority").value;
      let content = modal.querySelector("#annContent").value.trim();

      if (!title || !content) return;

      let newAnn = {
        id: "ann_" + Date.now(),
        instructor_id: String(user.id),
        trainerId: String(user.id),
        title: title,
        priority: priority,
        content: content,
        message: content,
        date: new Date().toISOString().split("T")[0],
      };

      try {
        let res = await fetch(BASE_URL + "/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAnn),
        });
        if (!res.ok) throw new Error("API error");
        let saved = await res.json();
        announcements.unshift(saved);
      } catch (err) {
        saveLocalAnnouncement(newAnn);
        announcements.unshift(newAnn);
      }

      closeModal();
      renderAnnouncements();
      document.getElementById("statHomeAnnouncements").textContent = announcements.length;
      logActivity("Announcement posted: <strong>" + escapeHtml(newAnn.title) + "</strong>", "Just now");
      showToast("Announcement posted successfully", "success");
    });
  }
}

/**
 * Opens a modal dialog pre-filled with an existing announcement's details so the instructor can edit it.
 */
function openEditAnnouncementModal(ann) {
  let msg = ann.content || ann.message || ann.body || "";
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
          <textarea id="editAnnContent" rows="3" required>${escapeHtml(msg)}</textarea>
        </div>
        <div class="form-actions" style="margin-top:20px;">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>`,
  });

  const modal = document.getElementById("modalBackdrop");
  if (modal) {
    modal.querySelector("[data-close]")?.addEventListener("click", closeModal);
    modal.querySelector("#editAnnForm")?.addEventListener("submit", async function (e) {
      e.preventDefault();
      
      let updated = {
        ...ann,
        title: modal.querySelector("#editAnnTitle").value.trim(),
        priority: modal.querySelector("#editAnnPriority").value,
        content: modal.querySelector("#editAnnContent").value.trim(),
        message: modal.querySelector("#editAnnContent").value.trim(),
      };

      try {
        let res = await fetch(BASE_URL + "/announcements/" + ann.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
        if (!res.ok) throw new Error("PATCH failed");
      } catch (err) {
        saveLocalAnnouncement(updated);
      }

      let idx = -1;
      for (let i = 0; i < announcements.length; i++) {
        if (String(announcements[i].id) === String(ann.id)) {
          idx = i;
          break;
        }
      }
      if (idx >= 0) announcements[idx] = updated;

      closeModal();
      renderAnnouncements();
      logActivity("Announcement updated: <strong>" + escapeHtml(updated.title) + "</strong>", "Just now");
      showToast("Announcement updated", "success");
    });
  }
}

/**
 * Opens a confirmation modal before permanently deleting an announcement.
 */
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
  if (modal) {
    modal.querySelector("[data-close]")?.addEventListener("click", closeModal);
    modal.querySelector("#confirmDeleteAnnBtn")?.addEventListener("click", async function () {
      try {
        await fetch(BASE_URL + "/announcements/" + id, { method: "DELETE" });
      } catch (e) {
        // ignore
      }

      let deletedItem = null;
      for (let i = 0; i < announcements.length; i++) {
        if (String(announcements[i].id) === String(id)) {
          deletedItem = announcements[i];
          break;
        }
      }

      removeLocalAnnouncement(id);
      announcements = announcements.filter(function (a) {
        return String(a.id) !== String(id);
      });

      closeModal();
      renderAnnouncements();
      document.getElementById("statHomeAnnouncements").textContent = announcements.length;
      
      if (deletedItem) {
        logActivity("Announcement deleted: <strong>" + escapeHtml(deletedItem.title) + "</strong>", "Just now");
      }
      showToast("Announcement deleted", "info");
    });
  }
}

/* --------------------------------------------------------------------------
   Setup Event Handlers
  -------------------------------------------------------------------------- */

/**
 * Binds click event listeners to buttons like adding announcements and tasks.
 */
function setupEventListeners() {
  const addAnnBtn = document.getElementById("addAnnouncementBtn");
  if (addAnnBtn) addAnnBtn.addEventListener("click", openAddAnnouncementModal);

  const quickAnnBtn = document.getElementById("quickAnnouncementBtn");
  if (quickAnnBtn) quickAnnBtn.addEventListener("click", openAddAnnouncementModal);

  const addTodoBtn = document.getElementById("addTodoBtn");
  if (addTodoBtn) addTodoBtn.addEventListener("click", openAddTodoModal);
}