/* ==========================================================================
    js/events.js - Events & Schedule Management (Simplified)
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

function getLocalEvents() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    return [];
  }
}

function saveLocalEvents(list) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

function logEventActivity(titleHtml) {
  if (!currentUser) return;
  
  const logKey = "edutrack_activity_log_" + currentUser.id;
  try {
    let logs = [];
    const savedLogs = localStorage.getItem(logKey);
    if (savedLogs) {
      logs = JSON.parse(savedLogs);
    }

    logs.unshift({
      title: titleHtml,
      time: "Just now",
      timestamp: Date.now(),
    });

    logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    localStorage.setItem(logKey, JSON.stringify(logs));
  } catch (err) {
    console.warn("Failed to log activity:", err);
  }
}

/* --------------------------------------------------------------------------
   API / CRUD Operations (Events)
   -------------------------------------------------------------------------- */

export async function getEvents(user) {
  if (!user || !user.id) return [];

  let allData = [];
  try {
    allData = await api.get(ENDPOINT);
  } catch (err) {
    // API failed, we will use local storage
  }

  // If API didn't return an array, fall back to localStorage
  if (!Array.isArray(allData) || allData.length === 0) {
    allData = getLocalEvents();
  }

  // Filter events belonging only to the current user
  const userEvents = [];
  for (let i = 0; i < allData.length; i++) {
    const item = allData[i];
    const ownerId = item.instructor_id || item.trainerId;
    if (String(ownerId) === String(user.id)) {
      userEvents.push(item);
    }
  }

  return userEvents;
}

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
      logEventActivity("Created scheduled event: <strong>" + escapeHtml(newItem.title) + "</strong>");
      return created;
    }
  } catch (err) {
    // API failed, save to local storage only
  }

  const local = getLocalEvents();
  local.push(newItem);
  saveLocalEvents(local);
  logEventActivity("Created scheduled event: <strong>" + escapeHtml(newItem.title) + "</strong>");
  return newItem;
}

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
    await api.patch(ENDPOINT + "/" + id, patchData);
  } catch (err) {
    // Ignore API error, update locally anyway
  }

  const local = getLocalEvents();
  for (let i = 0; i < local.length; i++) {
    if (String(local[i].id) === String(id)) {
      local[i] = Object.assign({}, local[i], patchData);
      break;
    }
  }
  saveLocalEvents(local);

  logEventActivity("Updated event: <strong>" + escapeHtml(data.title) + "</strong>");
}

export async function deleteEvent(id) {
  let itemToDelete = null;
  for (let i = 0; i < allEventsList.length; i++) {
    if (String(allEventsList[i].id) === String(id)) {
      itemToDelete = allEventsList[i];
      break;
    }
  }

  try {
    await api.delete(ENDPOINT + "/" + id);
  } catch (err) {
    // Ignore API error
  }

  const local = getLocalEvents();
  const remainingEvents = [];
  for (let i = 0; i < local.length; i++) {
    if (String(local[i].id) !== String(id)) {
      remainingEvents.push(local[i]);
    }
  }
  saveLocalEvents(remainingEvents);

  if (itemToDelete) {
    logEventActivity("Removed event: <strong>" + escapeHtml(itemToDelete.title) + "</strong>");
  }
}

/* --------------------------------------------------------------------------
   UI Rendering (Events)
   -------------------------------------------------------------------------- */

export function renderEventsList() {
  if (!container) return;

  // Filter events by category
  let filtered = [];
  for (let i = 0; i < allEventsList.length; i++) {
    const event = allEventsList[i];
    if (currentFilter === "all" || event.type === currentFilter) {
      filtered.push(event);
    }
  }

  // If no events match, show empty state
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align:center; padding:32px 16px;">
        <p>No scheduled events found for this category.</p>
        <button type="button" class="btn btn-primary btn-sm" id="emptyAddEvtBtn" style="margin-top:12px;">
          + Create Event
        </button>
      </div>`;
    
    const emptyBtn = container.querySelector("#emptyAddEvtBtn");
    if (emptyBtn) {
      emptyBtn.addEventListener("click", openAddEventModal);
    }
    return;
  }

  // Build HTML string using a loop
  let htmlCards = "";
  for (let i = 0; i < filtered.length; i++) {
    const item = filtered.valueOf()[i]; // or filtered[i]
    
    // Choose badge color based on type
    let badgeClass = "badge-info";
    if (item.type === "Exam") badgeClass = "badge-danger";
    if (item.type === "Workshop") badgeClass = "badge-warning";

    const timeDisplay = item.time ? " at " + escapeHtml(item.time) : "";

    htmlCards += `
      <article class="card event-card" data-id="${escapeHtml(item.id)}">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="badge ${badgeClass}">
              ${escapeHtml(item.type || "Event")}
            </span>
            <div style="display:flex; gap:4px;">
              <button type="button" class="btn btn-ghost btn-sm edit-evt-btn" data-id="${escapeHtml(item.id)}" title="Edit Event">✏️</button>
              <button type="button" class="btn btn-ghost btn-sm delete-evt-btn" data-id="${escapeHtml(item.id)}" style="color:var(--danger);" title="Delete Event">🗑️</button>
            </div>
          </div>
          <h4 style="font-size:1.05rem; margin-bottom:8px;">${escapeHtml(item.title)}</h4>
          <div class="event-date-box" style="margin-bottom:12px;">
            📅 ${escapeHtml(item.date || "TBD")}${timeDisplay}
          </div>
          <p class="muted" style="font-size:0.85rem;">
            ⏳ <strong>Duration:</strong> ${escapeHtml(item.duration || "N/A")}<br/>
            📍 <strong>Location:</strong> ${escapeHtml(item.location || "N/A")}<br/>
            🎯 <strong>Level:</strong> ${escapeHtml(item.level || "General")}
          </p>
        </div>
      </article>`;
  }

  container.innerHTML = htmlCards;

  // Attach event listeners to Edit buttons
  const editButtons = container.querySelectorAll(".edit-evt-btn");
  for (let i = 0; i < editButtons.length; i++) {
    editButtons[i].addEventListener("click", function() {
      const idToEdit = this.getAttribute("data-id");
      let targetItem = null;
      for (let j = 0; j < allEventsList.length; j++) {
        if (String(allEventsList[j].id) === String(idToEdit)) {
          targetItem = allEventsList[j];
          break;
        }
      }
      if (targetItem) openEditEventModal(targetItem);
    });
  }

  // Attach event listeners to Delete buttons
  const deleteButtons = container.querySelectorAll(".delete-evt-btn");
  for (let i = 0; i < deleteButtons.length; i++) {
    deleteButtons[i].addEventListener("click", function() {
      const idToDelete = this.getAttribute("data-id");
      confirmDeleteEvent(idToDelete);
    });
  }
}

export async function refreshEvents() {
  allEventsList = await getEvents(currentUser);
  renderEventsList();
}

/* --------------------------------------------------------------------------
   Modal Dialogs & Initialization
   -------------------------------------------------------------------------- */

function eventFormHtml(isEdit) {
  const buttonText = isEdit ? "Update Event" : "Create Event";
  const todayStr = new Date().toISOString().split("T")[0];
  const req = ' <span style="color:var(--danger, #ef4444);">*</span>';
  return `
    <form id="eventForm" novalidate>
      <div id="eventFormError" class="error-box" style="margin-bottom: 12px; padding: 8px 12px; background-color: #fee2e2; border: 1px solid #ef4444; color: #991b1b; border-radius: 4px; font-size: 0.88rem;" hidden></div>
      <div class="form-group">
        <label for="evtTitle">Event Title${req}</label>
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
          <label for="evtDate">Date${req}</label>
          <input id="evtDate" name="date" type="date" min="${todayStr}" required />
        </div>
        <div class="form-group">
          <label for="evtTime">Time${req}</label>
          <input id="evtTime" name="time" type="text" placeholder="e.g. 3:00 PM" required />
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label for="evtDuration">Duration (at least 15 mins)${req}</label>
          <input id="evtDuration" name="duration" type="text" placeholder="e.g. 1 hour or 15 mins" required />
        </div>
        <div class="form-group">
          <label for="evtLevel">Level / Tag</label>
          <input id="evtLevel" name="level" type="text" placeholder="e.g. Intermediate" />
        </div>
      </div>
      <div class="form-group">
        <label for="evtLocation">Location / Room${req}</label>
        <input id="evtLocation" name="location" type="text" placeholder="e.g. Lab 201 / Zoom Link" required />
      </div>
      <div class="form-actions" style="margin-top:20px;">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">${buttonText}</button>
      </div>
    </form>`;
}

export function openAddEventModal() {
  const modal = openModal({
    title: "Create New Event",
    subtitle: "Add an event, exam, or workshop to your schedule",
    bodyHtml: eventFormHtml(false),
  });

  const form = modal.querySelector("#eventForm");
  modal.querySelector("[data-close]").addEventListener("click", closeModal);

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    const errorBox = form.querySelector("#eventFormError");
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = "";
    }

  const titleVal = form.elements.title.value.trim();
  const dateVal = form.elements.date.value;
  const timeVal = form.elements.time.value.trim();
  const durationVal = form.elements.duration.value.trim();
  const locationVal = form.elements.location.value.trim();

  if (!titleVal || !dateVal || !timeVal || !durationVal || !locationVal) {
      if (errorBox) {
      errorBox.textContent = "Please fill in all mandatory fields (Title, Date, Time, Duration, Location).";
        errorBox.hidden = false;
      }
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
  if (dateVal < todayStr) {
      if (errorBox) {
        errorBox.textContent = "Date cannot be in the past.";
        errorBox.hidden = false;
      }
      return;
    }

  // Parse time for 24-hour range validation
  let isValidTime = false;
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]\s*(AM|PM|am|pm)?$/.test(timeVal)) {
    isValidTime = true;
  } else if (/^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM|am|pm)$/i.test(timeVal)) {
    isValidTime = true;
  }

  if (!isValidTime) {
    if (errorBox) {
      errorBox.textContent = "Please enter a valid time (e.g. 14:30 or 2:30 PM within 24-hour range).";
      errorBox.hidden = false;
    }
    return;
  }

  // Parse duration for at least 15 mins check
  let durationMins = 0;
  const minsMatch = durationVal.match(/(\d+)\s*(m|min|minute|minutes)/i);
  const hoursMatch = durationVal.match(/(\d+(\.\d+)?)\s*(h|hr|hour|hours)/i);

  if (hoursMatch) {
    durationMins += parseFloat(hoursMatch[1]) * 60;
  }
  if (minsMatch) {
    durationMins += parseInt(minsMatch[1], 10);
  }
  if (!minsMatch && !hoursMatch && !isNaN(parseFloat(durationVal))) {
    durationMins = parseFloat(durationVal);
  }

  if (durationMins < 15) {
    if (errorBox) {
      errorBox.textContent = "Event duration must be at least 15 minutes (e.g. 15 mins, 1 hour).";
      errorBox.hidden = false;
    }
    return;
  }

    try {
      await createEvent(currentUser, {
        title: titleVal,
        type: form.elements.type.value,
        date: dateVal,
        time: timeVal,
        duration: durationVal,
        level: form.elements.level.value || "All levels",
        location: locationVal,
      });

      closeModal();
      showToast("Event created successfully!", "success");
      await refreshEvents();
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = "Failed to create event: " + err.message;
        errorBox.hidden = false;
      }
    }
  });
}

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

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    const errorBox = form.querySelector("#eventFormError");
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = "";
    }

    const titleInput = form.elements.title.value.trim();
    if (!titleInput) {
      if (errorBox) {
        errorBox.textContent = "Please enter an event title.";
        errorBox.hidden = false;
      }
      return;
    }

    const selectedDate = form.elements.date.value;
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate && selectedDate < todayStr) {
      if (errorBox) {
        errorBox.textContent = "Date cannot be in the past.";
        errorBox.hidden = false;
      }
      return;
    }

    try {
      await updateEvent(item.id, {
        title: titleInput,
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
      if (errorBox) {
        errorBox.textContent = "Failed to update event: " + err.message;
        errorBox.hidden = false;
      }
    }
  });
}

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
  if (modal) {
    modal.querySelector("[data-close]")?.addEventListener("click", closeModal);
    modal.querySelector("#confirmDelEvt")?.addEventListener("click", async function() {
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
}

/* --------------------------------------------------------------------------
   App Initialization Hook
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async function() {
  currentUser = requireAuth();
  if (!currentUser) return;

  renderTopNav("events");
  container = document.getElementById("eventsList");

  const addEventBtn = document.getElementById("addEventBtn");
  if (addEventBtn) {
    addEventBtn.addEventListener("click", openAddEventModal);
  }

  // Filter category buttons logic
  const filterBtns = document.querySelectorAll(".filter-btn");
  for (let i = 0; i < filterBtns.length; i++) {
    filterBtns[i].addEventListener("click", function() {
      for (let j = 0; j < filterBtns.length; j++) {
        filterBtns[j].classList.remove("active", "btn-primary");
      }
      this.classList.add("active");
      currentFilter = this.getAttribute("data-filter");
      renderEventsList();
    });
  }

  await refreshEvents();
  await refreshAnnouncements();

  // URL Query Parameters check (e.g. ?action=add)
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
   Announcements Management (Simplified)
   -------------------------------------------------------------------------- */

function getLocalAnnouncements() {
  try {
    const key = "edutrack_announcements_" + currentUser.id;
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
    return [];
  } catch (err) {
    return [];
  }
}

function saveLocalAnnouncement(ann) {
  const local = getLocalAnnouncements();
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

  localStorage.setItem("edutrack_announcements_" + currentUser.id, JSON.stringify(local));
}

function removeLocalAnnouncement(id) {
  const local = getLocalAnnouncements();
  const filtered = [];
  for (let i = 0; i < local.length; i++) {
    if (String(local[i].id) !== String(id)) {
      filtered.push(local[i]);
    }
  }
  localStorage.setItem("edutrack_announcements_" + currentUser.id, JSON.stringify(filtered));
}

export async function refreshAnnouncements() {
  let serverAnnouncements = [];
  try {
    const res = await fetch(BASE_URL + "/announcements");
    if (res.ok) {
      const data = await res.json();
      for (let i = 0; i < data.length; i++) {
        const ownerId = data[i].instructor_id || data[i].trainerId;
        if (String(ownerId) === String(currentUser.id)) {
          serverAnnouncements.push(data[i]);
        }
      }
    }
  } catch (err) {
    // API failed, skip
  }

  if (serverAnnouncements.length === 0) {
    try {
      let rawRes = await fetch("../db.json");
      if (!rawRes.ok) rawRes = await fetch("db.json");
      if (rawRes.ok) {
        const dbData = await rawRes.json();
        const dbAnn = dbData.announcements || [];
        for (let i = 0; i < dbAnn.length; i++) {
          const ownerId = dbAnn[i].instructor_id || dbAnn[i].trainerId;
          if (String(ownerId) === String(currentUser.id)) {
            serverAnnouncements.push(dbAnn[i]);
          }
        }
      }
    } catch (err) {
      console.warn("Could not load db.json announcements", err);
    }
  }

  // Combine server announcements with local ones
  const local = getLocalAnnouncements();
  const combined = serverAnnouncements.concat(local);

  // Remove duplicates
  allAnnouncementsList = [];
  const seenIds = new Set();
  for (let i = 0; i < combined.length; i++) {
    const idStr = String(combined[i].id);
    if (!seenIds.has(idStr)) {
      seenIds.add(idStr);
      allAnnouncementsList.push(combined[i]);
    }
  }

  renderAnnouncementsList();
}

function renderAnnouncementsList() {
  const annContainer = document.getElementById("announcementsList");
  if (!annContainer) return;

  if (allAnnouncementsList.length === 0) {
    annContainer.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <p class="empty-state" style="margin-bottom:8px;">No announcements posted yet.</p>
      </div>`;
    annContainer.querySelector("#addAnnBtnEmpty")?.addEventListener("click", openAddAnnouncementModal);
    return;
  }

  let htmlCards = "";
  for (let i = 0; i < allAnnouncementsList.length; i++) {
    const ann = allAnnouncementsList[i];
    const priority = ann.priority || "medium";
    
    let badgeColor = "success";
    if (priority === "high") badgeColor = "danger";
    if (priority === "medium") badgeColor = "warning";

    const badgeHtml = ann.priority 
      ? `<span class="badge badge-${badgeColor}" style="font-size:0.7rem;">${escapeHtml(priority.toUpperCase())}</span>` 
      : "";

    const messageContent = ann.content || ann.message || ann.body || "";
    const dateText = ann.date || new Date().toLocaleDateString();

    htmlCards += `
      <article class="announcement priority-${escapeHtml(priority)}" style="padding:12px; border-left:4px solid var(--primary); background:#ffffff; border-radius:var(--radius-sm); border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="margin:0; font-size:1rem;">${escapeHtml(ann.title)}</h4>
          <div style="display:flex; gap:6px; align-items:center;">
            ${badgeHtml}
            <button type="button" class="btn btn-ghost btn-sm" data-edit-ann="${ann.id}" style="padding:2px 6px;" title="Edit">✏️</button>
            <button type="button" class="btn btn-ghost btn-sm" data-delete-ann="${ann.id}" style="padding:2px 6px; color:var(--danger);" title="Delete">🗑️</button>
          </div>
        </div>
        <p style="margin:6px 0; font-size:0.88rem;">${escapeHtml(messageContent)}</p>
        <time style="font-size:0.75rem; color:var(--muted);">${escapeHtml(dateText)}</time>
      </article>`;
  }

  annContainer.innerHTML = htmlCards;

  // Add event listeners for editing/deleting announcements
  const editBtns = annContainer.querySelectorAll("[data-edit-ann]");
  for (let i = 0; i < editBtns.length; i++) {
    editBtns[i].addEventListener("click", function() {
      const annId = this.getAttribute("data-edit-ann");
      let foundAnn = null;
      for (let j = 0; j < allAnnouncementsList.length; j++) {
        if (String(allAnnouncementsList[j].id) === String(annId)) {
          foundAnn = allAnnouncementsList[j];
          break;
        }
      }
      if (foundAnn) openEditAnnouncementModal(foundAnn);
    });
  }

  const deleteBtns = annContainer.querySelectorAll("[data-delete-ann]");
  for (let i = 0; i < deleteBtns.length; i++) {
    deleteBtns[i].addEventListener("click", function() {
      const annId = this.getAttribute("data-delete-ann");
      confirmDeleteAnnouncement(annId);
    });
  }
}

function openAddAnnouncementModal() {
  openModal({
    title: "Post New Announcement",
    subtitle: "Broadcast a notice or reminder to your students",
    bodyHtml: `
      <form id="annForm" novalidate>
        <div id="eventsAnnFormError" class="error-box" style="margin-bottom: 12px; padding: 8px 12px; background-color: #fee2e2; border: 1px solid #ef4444; color: #991b1b; border-radius: 4px; font-size: 0.88rem;" hidden></div>
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
  if (modal) {
    modal.querySelector("[data-close]")?.addEventListener("click", closeModal);
    
    const form = modal.querySelector("#annForm");
    if (form) {
      form.addEventListener("submit", async function(e) {
        e.preventDefault();
        const errorBox = modal.querySelector("#eventsAnnFormError");
        if (errorBox) {
          errorBox.hidden = true;
          errorBox.textContent = "";
        }

        const title = modal.querySelector("#annTitle").value.trim();
        const priority = modal.querySelector("#annPriority").value;
        const content = modal.querySelector("#annContent").value.trim();

        if (!title || !content) {
          if (errorBox) {
            errorBox.textContent = "Title and message content are required.";
            errorBox.hidden = false;
          }
          return;
        }

        const newAnn = {
          id: "ann_" + Date.now(),
          instructor_id: String(currentUser.id),
          trainerId: String(currentUser.id),
          title: title,
          priority: priority,
          content: content,
          message: content,
          date: new Date().toISOString().split("T")[0],
        };

        try {
          const res = await fetch(BASE_URL + "/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAnn),
          });
          if (!res.ok) throw new Error("API failed");
          const saved = await res.json();
          allAnnouncementsList.unshift(saved);
        } catch (err) {
          saveLocalAnnouncement(newAnn);
          allAnnouncementsList.unshift(newAnn);
        }

        closeModal();
        renderAnnouncementsList();
        logEventActivity("Posted announcement: <strong>" + escapeHtml(newAnn.title) + "</strong>");
        showToast("Announcement posted successfully", "success");
      });
    }
  }
}

function openEditAnnouncementModal(ann) {
  const currentContent = ann.content || ann.message || ann.body || "";
  const lowSelected = ann.priority === "low" ? "selected" : "";
  const medSelected = (ann.priority === "medium" || !ann.priority) ? "selected" : "";
  const highSelected = ann.priority === "high" ? "selected" : "";

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
            <option value="low" ${lowSelected}>Low Priority</option>
            <option value="medium" ${medSelected}>Medium Priority</option>
            <option value="high" ${highSelected}>High Priority</option>
          </select>
        </div>
        <div class="form-group">
          <label for="editAnnContent">Message</label>
          <textarea id="editAnnContent" rows="3" required>${escapeHtml(currentContent)}</textarea>
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

    const form = modal.querySelector("#editAnnForm");
    if (form) {
      form.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const updatedTitle = modal.querySelector("#editAnnTitle").value.trim();
        const updatedPriority = modal.querySelector("#editAnnPriority").value;
        const updatedContent = modal.querySelector("#editAnnContent").value.trim();

        const updated = Object.assign({}, ann, {
          title: updatedTitle,
          priority: updatedPriority,
          content: updatedContent,
          message: updatedContent,
        });

        try {
          await fetch(BASE_URL + "/announcements/" + ann.id, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });
        } catch (err) {
          saveLocalAnnouncement(updated);
        }

        let foundIndex = -1;
        for (let i = 0; i < allAnnouncementsList.length; i++) {
          if (String(allAnnouncementsList[i].id) === String(ann.id)) {
            foundIndex = i;
            break;
          }
        }
        if (foundIndex >= 0) {
          allAnnouncementsList[foundIndex] = updated;
        }

        closeModal();
        renderAnnouncementsList();
        logEventActivity("Updated announcement: <strong>" + escapeHtml(updated.title) + "</strong>");
        showToast("Announcement updated", "success");
      });
    }
  }
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
  if (modal) {
    modal.querySelector("[data-close]")?.addEventListener("click", closeModal);

    modal.querySelector("#confirmDelAnnBtn")?.addEventListener("click", async function() {
      try {
        await fetch(BASE_URL + "/announcements/" + id, { method: "DELETE" });
      } catch (err) {
        // Ignore network errors
      }

      let deletedItem = null;
      for (let i = 0; i < allAnnouncementsList.length; i++) {
        if (String(allAnnouncementsList[i].id) === String(id)) {
          deletedItem = allAnnouncementsList[i];
          break;
        }
      }

      removeLocalAnnouncement(id);

      const newList = [];
      for (let i = 0; i < allAnnouncementsList.length; i++) {
        if (String(allAnnouncementsList[i].id) !== String(id)) {
          newList.push(allAnnouncementsList[i]);
        }
      }
      allAnnouncementsList = newList;

      closeModal();
      renderAnnouncementsList();
      
      if (deletedItem) {
        logEventActivity("Deleted announcement: <strong>" + escapeHtml(deletedItem.title) + "</strong>");
      }
      showToast("Announcement deleted", "info");
    });
  }
}