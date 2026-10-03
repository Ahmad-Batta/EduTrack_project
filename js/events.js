/* ==========================================================================
   js/events.js - Events & Schedule Management (CRUD)
   --------------------------------------------------------------------------
   This module handles complete Create, Read, Update, Delete (CRUD) operations
   for class events, workshops, and exams scheduled by the instructor.

   Features:
   - Fetches events from API endpoint (/events) with LocalStorage fallback
   - Creates new events and persists them
   - Updates existing events
   - Deletes events from schedule
   - Logs event activities in the Activity Logger feed
   - Renders event cards filtered by category (All, Event, Exam, Workshop)
   ========================================================================== */

import { api, BASE_URL } from "./api.js";
import {
  requireAuth,
  renderTopNav,
  escapeHtml,
  openModal,
  closeModal,
  showToast,
} from "./layout.js";

const ENDPOINT = "/events";
const LOCAL_STORAGE_KEY = "edutrack_events";

let currentUser = null;
let container = null;
let currentFilter = "all";
let allEventsList = [];
let allAnnouncementsList = [];

/* --------------------------------------------------------------------------
   LocalStorage & Activity Logging Helpers
   -------------------------------------------------------------------------- */

/**
 * Retrieves cached events array from localStorage
 */
function getLocalEvents() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * Saves events array into localStorage
 */
function saveLocalEvents(list) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

/**
 * Helper to push new entries into the activity log feed
 */
function logEventActivity(titleHtml) {
  if (!currentUser) return;
  const logKey = `edutrack_activity_log_${currentUser.id}`;
  try {
    const logs = JSON.parse(localStorage.getItem(logKey)) || [];
    logs.unshift({
      title: titleHtml,
      time: "Just now",
      timestamp: Date.now(),
    });
    localStorage.setItem(logKey, JSON.stringify(logs));
  } catch (err) {
    console.warn("Failed to log activity:", err);
  }
}

/* --------------------------------------------------------------------------
   API / CRUD Operations
   -------------------------------------------------------------------------- */

/**
 * Reads all events created by the logged-in trainer
 * @param {Object} user - Logged-in instructor user object
 */
export async function getEvents(user) {
  if (!user || !user.id) return [];

  try {
    const all = await api.get(ENDPOINT);
    if (Array.isArray(all)) {
      return all.filter((item) => String(item.instructor_id || item.trainerId) === String(user.id));
    }
  } catch {
    // REST API failed or unavailable -> Fall back to localStorage
  }

  const local = getLocalEvents();
  return local.filter((item) => String(item.instructor_id || item.trainerId) === String(user.id));
}

/**
 * Creates a new event entry
 * @param {Object} user - Current user
 * @param {Object} data - Event details (title, type, date, time, duration, level, location)
 */
export async function createEvent(user, data) {
  const newItem = {
    id: "evt_" + Date.now(),
    instructor_id: String(user.id),
    trainerId: String(user.id),
    title: data.title,
    type: data.type || "Event",
    date: data.date,
    time: data.time,
    duration: data.duration,
    level: data.level || "General",
    location: data.location || "Online",
    createdAt: new Date().toISOString(),
  };

  try {
    const created = await api.post(ENDPOINT, newItem);
    if (created) {
      const local = getLocalEvents();
      local.push(created);
      saveLocalEvents(local);
      logEventActivity(`Created scheduled event: <strong>${escapeHtml(newItem.title)}</strong>`);
      return created;
    }
  } catch {
    // API failure fallback to localStorage
  }

  const local = getLocalEvents();
  local.push(newItem);
  saveLocalEvents(local);
  logEventActivity(`Created scheduled event: <strong>${escapeHtml(newItem.title)}</strong>`);
  return newItem;
}

/**
 * Updates an existing event entry
 * @param {string|number} id - Event ID
 * @param {Object} data - Updated fields
 */
export async function updateEvent(id, data) {
  const patchData = {
    title: data.title,
    type: data.type,
    date: data.date,
    time: data.time,
    duration: data.duration,
    level: data.level,
    location: data.location,
  };

  try {
    await api.patch(`${ENDPOINT}/${id}`, patchData);
  } catch {
    // Fallback to local storage update if PATCH request fails
  }

  const local = getLocalEvents();
  const index = local.findIndex((item) => String(item.id) === String(id));
  if (index !== -1) {
    local[index] = { ...local[index], ...patchData };
    saveLocalEvents(local);
  }

  logEventActivity(`Updated event: <strong>${escapeHtml(data.title)}</strong>`);
}

/**
 * Deletes an event by ID
 * @param {string|number} id - Event ID to remove
 */
export async function deleteEvent(id) {
  const itemToDelete = allEventsList.find((e) => String(e.id) === String(id));

  try {
    await api.delete(`${ENDPOINT}/${id}`);
  } catch {
    // Fallback to local storage delete if DELETE request fails
  }

  const local = getLocalEvents();
  const filtered = local.filter((item) => String(item.id) !== String(id));
  saveLocalEvents(filtered);

  if (itemToDelete) {
    logEventActivity(`Removed event: <strong>${escapeHtml(itemToDelete.title)}</strong>`);
  }
}

/* --------------------------------------------------------------------------
   UI Rendering
   -------------------------------------------------------------------------- */

/**
 * Renders the list of event cards according to active filter selection
 */
export function renderEventsList() {
  if (!container) return;

  let filtered = allEventsList;
  if (currentFilter !== "all") {
    filtered = allEventsList.filter((e) => e.type === currentFilter);
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align:center; padding:32px 16px;">
        <p>No scheduled events found for this category.</p>
        <button type="button" class="btn btn-primary btn-sm" id="emptyAddEvtBtn" style="margin-top:12px;">
          + Create Event
        </button>
      </div>`;
    container.querySelector("#emptyAddEvtBtn")?.addEventListener("click", openAddEventModal);
    return;
  }

  container.innerHTML = filtered
    .map(
      (item) => `
      <article class="card event-card" data-id="${escapeHtml(item.id)}">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="badge ${item.type === "Exam" ? "badge-danger" : item.type === "Workshop" ? "badge-warning" : "badge-info"}">
              ${escapeHtml(item.type || "Event")}
            </span>
            <div style="display:flex; gap:4px;">
              <button type="button" class="btn btn-ghost btn-sm edit-evt-btn" data-id="${escapeHtml(item.id)}" title="Edit Event">✏️</button>
              <button type="button" class="btn btn-ghost btn-sm delete-evt-btn" data-id="${escapeHtml(item.id)}" style="color:var(--danger);" title="Delete Event">🗑️</button>
            </div>
          </div>
          <h4 style="font-size:1.05rem; margin-bottom:8px;">${escapeHtml(item.title)}</h4>
          <div class="event-date-box" style="margin-bottom:12px;">
            📅 ${escapeHtml(item.date || "TBD")} ${item.time ? "at " + escapeHtml(item.time) : ""}
          </div>
          <p class="muted" style="font-size:0.85rem;">
            ⏳ <strong>Duration:</strong> ${escapeHtml(item.duration || "N/A")}<br/>
            📍 <strong>Location:</strong> ${escapeHtml(item.location || "N/A")}<br/>
            🎯 <strong>Level:</strong> ${escapeHtml(item.level || "General")}
          </p>
        </div>
      </article>`
    )
    .join("");

  // Attach Edit action listeners
  container.querySelectorAll(".edit-evt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = allEventsList.find((e) => String(e.id) === String(btn.dataset.id));
      if (item) openEditEventModal(item);
    });
  });

  // Attach Delete action listeners
  container.querySelectorAll(".delete-evt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      confirmDeleteEvent(btn.dataset.id);
    });
  });
}

/**
 * Re-fetches events from server/storage and re-renders grid
 */
export async function refreshEvents() {
  allEventsList = await getEvents(currentUser);
  renderEventsList();
}

/* --------------------------------------------------------------------------
   Modal Dialog Interfaces
   -------------------------------------------------------------------------- */

/**
 * Generates event creation/editing form HTML template
 * @param {boolean} isEdit - True if rendering edit modal
 */
function eventFormHtml(isEdit = false) {
  return `
    <form id="eventForm" novalidate>
      <div class="form-group">
        <label for="evtTitle">Event Title</label>
        <input id="evtTitle" name="title" type="text" placeholder="e.g. JavaScript Hackathon Kickoff" required />
      </div>
      <div class="form-group">
        <label for="evtType">Type</label>
        <select id="evtType" name="type">
          <option value="Event">Event</option>
          <option value="Exam">Exam</option>
          <option value="Workshop">Workshop</option>
        </select>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label for="evtDate">Date</label>
          <input id="evtDate" name="date" type="date" required />
        </div>
        <div class="form-group">
          <label for="evtTime">Time</label>
          <input id="evtTime" name="time" type="text" placeholder="e.g. 3:00 PM" required />
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label for="evtDuration">Duration</label>
          <input id="evtDuration" name="duration" type="text" placeholder="e.g. 1 hour" />
        </div>
        <div class="form-group">
          <label for="evtLevel">Level / Tag</label>
          <input id="evtLevel" name="level" type="text" placeholder="e.g. Intermediate" />
        </div>
      </div>
      <div class="form-group">
        <label for="evtLocation">Location / Room</label>
        <input id="evtLocation" name="location" type="text" placeholder="e.g. Lab 201 / Zoom Link" />
      </div>
      <div class="form-actions" style="margin-top:20px;">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">
          ${isEdit ? "Update Event" : "Create Event"}
        </button>
      </div>
    </form>`;
}

/**
 * Opens modal for adding a new event
 */
export function openAddEventModal() {
  const modal = openModal({
    title: "Create New Event",
    subtitle: "Add an event, exam, or workshop to your schedule",
    bodyHtml: eventFormHtml(false),
  });

  const form = modal.querySelector("#eventForm");
  modal.querySelector("[data-close]").addEventListener("click", closeModal);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) {
      showToast("Please enter an event title", "error");
      return;
    }

    try {
      await createEvent(currentUser, {
        title,
        type: form.elements.type.value,
        date: form.elements.date.value || new Date().toISOString().split("T")[0],
        time: form.elements.time.value || "12:00 PM",
        duration: form.elements.duration.value || "1 hour",
        level: form.elements.level.value || "All levels",
        location: form.elements.location.value || "Online",
      });

      closeModal();
      showToast("Event created successfully!", "success");
      await refreshEvents();
    } catch (err) {
      showToast("Failed to create event: " + err.message, "error");
    }
  });
}

/**
 * Opens modal for editing an existing event
 * @param {Object} item - Event item data
 */
export function openEditEventModal(item) {
  const modal = openModal({
    title: "Edit Event",
    subtitle: "Modify event details and schedule",
    bodyHtml: eventFormHtml(true),
  });

  const form = modal.querySelector("#eventForm");
  form.elements.title.value = item.title || "";
  form.elements.type.value = item.type || "Event";
  form.elements.date.value = item.date || "";
  form.elements.time.value = item.time || "";
  form.elements.duration.value = item.duration || "";
  form.elements.level.value = item.level || "";
  form.elements.location.value = item.location || "";

  modal.querySelector("[data-close]").addEventListener("click", closeModal);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) {
      showToast("Please enter an event title", "error");
      return;
    }

    try {
      await updateEvent(item.id, {
        title,
        type: form.elements.type.value,
        date: form.elements.date.value,
        time: form.elements.time.value,
        duration: form.elements.duration.value,
        level: form.elements.level.value,
        location: form.elements.location.value,
      });

      closeModal();
      showToast("Event updated successfully!", "success");
      await refreshEvents();
    } catch (err) {
      showToast("Failed to update event: " + err.message, "error");
    }
  });
}

/**
 * Shows confirmation prompt before deleting an event
 * @param {string|number} id - Event ID
 */
export function confirmDeleteEvent(id) {
  openModal({
    title: "Delete Event",
    subtitle: "Are you sure you want to delete this event from your schedule?",
    bodyHtml: `
      <div class="form-actions" style="margin-top:20px; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmDelEvt">Delete Event</button>
      </div>`,
  });

  const modal = document.getElementById("modalBackdrop");
  modal?.querySelector("[data-close]")?.addEventListener("click", closeModal);
  modal?.querySelector("#confirmDelEvt")?.addEventListener("click", async () => {
    try {
      await deleteEvent(id);
      closeModal();
      showToast("Event removed from schedule", "success");
      await refreshEvents();
    } catch (err) {
      showToast("Error deleting event: " + err.message, "error");
    }
  });
}

/* --------------------------------------------------------------------------
   Initialization
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  // Ensure user is signed in
  currentUser = requireAuth();
  if (!currentUser) return;

  // Render navigation navbar
  renderTopNav("events");

  container = document.getElementById("eventsList");

  // Add event button trigger
  document.getElementById("addEventBtn")?.addEventListener("click", openAddEventModal);

  // Filter category buttons (All, Event, Exam, Workshop)
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active", "btn-primary"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderEventsList();
    });
  });

  // Initial fetch and render
  await refreshEvents();
  await refreshAnnouncements();

  // Handle direct query action (e.g., ?action=add)
  const params = new URLSearchParams(window.location.search);
  if (params.get("action") === "add") {
    openAddEventModal();
  } else if (params.get("action") === "add-announcement") {
    openAddAnnouncementModal();
  }

  document.getElementById("addAnnBtn")?.addEventListener("click", openAddAnnouncementModal);
  document.getElementById("addAnnBtnSection")?.addEventListener("click", openAddAnnouncementModal);
});

/* --------------------------------------------------------------------------
   Announcements Management
   -------------------------------------------------------------------------- */

function getLocalAnnouncements() {
  try {
    return JSON.parse(localStorage.getItem(`edutrack_announcements_${currentUser.id}`)) || [];
  } catch {
    return [];
  }
}

function saveLocalAnnouncement(ann) {
  const local = getLocalAnnouncements();
  const idx = local.findIndex((a) => String(a.id) === String(ann.id));
  if (idx >= 0) local[idx] = ann;
  else local.unshift(ann);
  localStorage.setItem(`edutrack_announcements_${currentUser.id}`, JSON.stringify(local));
}

function removeLocalAnnouncement(id) {
  const local = getLocalAnnouncements();
  const filtered = local.filter((a) => String(a.id) !== String(id));
  localStorage.setItem(`edutrack_announcements_${currentUser.id}`, JSON.stringify(filtered));
}

export async function refreshAnnouncements() {
  try {
    const res = await fetch(`${BASE_URL}/announcements`);
    if (res.ok) {
      const data = await res.json();
      allAnnouncementsList = data.filter((a) => String(a.instructor_id || a.trainerId) === String(currentUser.id));
    }
  } catch {
    // fallback
  }

  if (!allAnnouncementsList.length) {
    try {
      let rawRes = await fetch("../db.json");
      if (!rawRes.ok) rawRes = await fetch("db.json");
      if (rawRes.ok) {
        const dbData = await rawRes.json();
        allAnnouncementsList = (dbData.announcements || []).filter((a) => String(a.instructor_id || a.trainerId) === String(currentUser.id));
      }
    } catch (err) {
      console.warn("Could not load db.json announcements", err);
    }
  }

  const local = getLocalAnnouncements();
  allAnnouncementsList = [...allAnnouncementsList, ...local];
  const seen = new Set();
  allAnnouncementsList = allAnnouncementsList.filter((a) => {
    if (seen.has(String(a.id))) return false;
    seen.add(String(a.id));
    return true;
  });

  renderAnnouncementsList();
}

function renderAnnouncementsList() {
  const annContainer = document.getElementById("announcementsList");
  if (!annContainer) return;

  if (!allAnnouncementsList.length) {
    annContainer.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <p class="empty-state" style="margin-bottom:8px;">No announcements posted yet.</p>
        <button type="button" class="btn btn-sm btn-primary" id="addAnnBtnEmpty">+ Add Announcement</button>
      </div>`;
    annContainer.querySelector("#addAnnBtnEmpty")?.addEventListener("click", openAddAnnouncementModal);
    return;
  }

  annContainer.innerHTML = allAnnouncementsList
    .map((ann) => `
      <article class="announcement priority-${escapeHtml(ann.priority || "medium")}" style="padding:12px; border-left:4px solid var(--primary); background:#ffffff; border-radius:var(--radius-sm); border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="margin:0; font-size:1rem;">${escapeHtml(ann.title)}</h4>
          <div style="display:flex; gap:6px; align-items:center;">
            ${ann.priority ? `<span class="badge badge-${ann.priority === "high" ? "danger" : ann.priority === "medium" ? "warning" : "success"}" style="font-size:0.7rem;">${escapeHtml(ann.priority.toUpperCase())}</span>` : ""}
            <button type="button" class="btn btn-ghost btn-sm" data-edit-ann="${ann.id}" style="padding:2px 6px;" title="Edit">✏️</button>
            <button type="button" class="btn btn-ghost btn-sm" data-delete-ann="${ann.id}" style="padding:2px 6px; color:var(--danger);" title="Delete">🗑️</button>
          </div>
        </div>
        <p style="margin:6px 0; font-size:0.88rem;">${escapeHtml(ann.content || ann.message || ann.body || "")}</p>
        <time style="font-size:0.75rem; color:var(--muted);">${escapeHtml(ann.date || new Date().toLocaleDateString())}</time>
      </article>`)
    .join("");

  annContainer.querySelectorAll("[data-edit-ann]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const found = allAnnouncementsList.find((a) => String(a.id) === String(btn.dataset.editAnn));
      if (found) openEditAnnouncementModal(found);
    });
  });

  annContainer.querySelectorAll("[data-delete-ann]").forEach((btn) => {
    btn.addEventListener("click", () => {
      confirmDeleteAnnouncement(btn.dataset.deleteAnn);
    });
  });
}

function openAddAnnouncementModal() {
  openModal({
    title: "Post New Announcement",
    subtitle: "Broadcast a notice or reminder to your students",
    bodyHtml: `
      <form id="annForm">
        <div class="form-group">
          <label for="annTitle">Title</label>
          <input type="text" id="annTitle" required placeholder="e.g. Midterm Review Session" />
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
          <textarea id="annContent" rows="3" required placeholder="Details for students..."></textarea>
        </div>
        <div class="form-actions" style="margin-top:20px;">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Post Announcement</button>
        </div>
      </form>`,
  });

  const modal = document.getElementById("modalBackdrop");
  modal?.querySelector("[data-close]")?.addEventListener("click", closeModal);

  modal?.querySelector("#annForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = modal.querySelector("#annTitle").value.trim();
    const priority = modal.querySelector("#annPriority").value;
    const content = modal.querySelector("#annContent").value.trim();

    if (!title || !content) return;

    const newAnn = {
      id: "ann_" + Date.now(),
      instructor_id: String(currentUser.id),
      trainerId: String(currentUser.id),
      title,
      priority,
      content,
      message: content,
      date: new Date().toISOString().split("T")[0],
    };

    try {
      const res = await fetch(`${BASE_URL}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnn),
      });
      if (!res.ok) throw new Error("API failed");
      const saved = await res.json();
      allAnnouncementsList.unshift(saved);
    } catch {
      saveLocalAnnouncement(newAnn);
      allAnnouncementsList.unshift(newAnn);
    }

    closeModal();
    renderAnnouncementsList();
    logEventActivity(`Posted announcement: <strong>${escapeHtml(newAnn.title)}</strong>`);
    showToast("Announcement posted successfully", "success");
  });
}

function openEditAnnouncementModal(ann) {
  openModal({
    title: "Edit Announcement",
    subtitle: "Update announcement message and priority",
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
          <button type="submit" class="btn btn-primary">Save Changes</button>
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
      message: modal.querySelector("#editAnnContent").value.trim(),
    };

    try {
      await fetch(`${BASE_URL}/announcements/${ann.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch {
      saveLocalAnnouncement(updated);
    }

    const idx = allAnnouncementsList.findIndex((a) => String(a.id) === String(ann.id));
    if (idx >= 0) allAnnouncementsList[idx] = updated;

    closeModal();
    renderAnnouncementsList();
    logEventActivity(`Updated announcement: <strong>${escapeHtml(updated.title)}</strong>`);
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
        <button type="button" class="btn btn-danger" id="confirmDelAnnBtn">Delete</button>
      </div>`,
  });

  const modal = document.getElementById("modalBackdrop");
  modal?.querySelector("[data-close]")?.addEventListener("click", closeModal);

  modal?.querySelector("#confirmDelAnnBtn")?.addEventListener("click", async () => {
    try {
      await fetch(`${BASE_URL}/announcements/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    const deleted = allAnnouncementsList.find((a) => String(a.id) === String(id));
    removeLocalAnnouncement(id);
    allAnnouncementsList = allAnnouncementsList.filter((a) => String(a.id) !== String(id));

    closeModal();
    renderAnnouncementsList();
    if (deleted) {
      logEventActivity(`Deleted announcement: <strong>${escapeHtml(deleted.title)}</strong>`);
    }
    showToast("Announcement deleted", "info");
  });
}
