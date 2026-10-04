/* ==========================================================
   layout.js - shared by every page (Top Nav Bar, Auth, Modals, Toast)
   ========================================================== */

const HOME_PAGE = "home.html";

/* ---------- Session ---------- */

/** Returns the logged-in user ({ id, name, email, university, department }) or null. */
export function getCurrentUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem("session")) ||
                 JSON.parse(sessionStorage.getItem("currentUser")) ||
                 JSON.parse(localStorage.getItem("currentInstructor"));
    if (user && user.id) {
      if (!user.name) {
        user.name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "Trainer";
      }
      return user;
    }
  } catch {
    // Fallback
  }
  return null;
}

/** Call at the top of protected pages. Redirects to login if not authenticated. */
export function requireAuth() {
  const user = getCurrentUser();
  if (!user || !user.id) {
    const loginPath = window.location.pathname.includes("/pages/") ? "login.html" : "pages/login.html";
    window.location.replace(loginPath);
    return null;
  }
  return user;
}

export function logout() {
  sessionStorage.removeItem("session");
  sessionStorage.removeItem("currentUser");
  localStorage.removeItem("currentInstructor");
  const loginPath = window.location.pathname.includes("/pages/") ? "login.html" : "pages/login.html";
  window.location.href = loginPath;
}

/* ---------- Safe text ---------- */

/** Escape user text before putting it inside innerHTML. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Top Navbar ---------- */

const NAV_LINKS = [
  { key: "home", href: "home.html", label: "Home" },
  { key: "dashboard", href: "dashboard.html", label: "Dashboard" },
  { key: "students", href: "students.html", label: "Students" },
  { key: "tasks", href: "tasks.html", label: "Tasks" },
  { key: "quizzes", href: "quizzes.html", label: "Quizzes" },
  { key: "courses", href: "courses.html", label: "Courses" },
  { key: "events", href: "events.html", label: "Events & Announcements" },
];

/**
 * Open profile modal with trainer details and logout option
 */
export function openProfileModal() {
  const profileUrl = window.location.pathname.includes("/pages/") ? "instructorProfile.html" : "pages/instructorProfile.html";
  window.location.href = profileUrl;
}

/**
 * Fills <header id="navbar"> or <aside id="sidebar"> with top navigation.
 * @param {"home"|"dashboard"|"students"|"tasks"|"quizzes"|"courses"|"events"} activeKey
 */
export function renderTopNav(activeKey) {
  const container = document.getElementById("navbar") || document.getElementById("sidebar") || document.querySelector(".top-navbar");
  const user = getCurrentUser();
  if (!container || !user) return;

  const initial = escapeHtml((user.name || "T").trim().charAt(0).toUpperCase());
  const firstName = escapeHtml((user.name || "Trainer").split(" ")[0]);

  const linksHtml = NAV_LINKS.map(
    (link) => `
      <a href="${link.href}" class="nav-link ${link.key === activeKey ? "active" : ""}"
         ${link.key === activeKey ? 'aria-current="page"' : ""}>
        ${link.label}
      </a>`
  ).join("");

  container.className = "top-navbar";
  container.innerHTML = `
    <div class="nav-container">
      <div class="nav-brand">
        <a href="home.html" class="logo">
          <span class="brand-mark">E</span>
          <span class="logo-text">
            EduTrack
            <span class="logo-sub">Academic Management</span>
          </span>
        </a>
      </div>

      <nav class="nav-links-desktop" aria-label="Main navigation">
        ${linksHtml}
      </nav>

      <div class="nav-right">
        <button type="button" class="btn btn-ghost btn-sm" id="logoutBtn" title="Log out" style="color:var(--danger); border:1px solid var(--border);">
          Logout
        </button>
        <button type="button" class="profile-btn" id="profileBtn" title="View Profile" aria-label="Trainer Profile">
          <div class="avatar">${initial}</div>
          <div class="profile-copy">
            <span class="profile-name">${firstName}</span>
            <span class="profile-role">Instructor</span>
          </div>
        </button>

        <button type="button" class="hamburger-btn" id="hamburgerBtn" aria-label="Toggle Navigation Menu" aria-expanded="false">
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
        </button>
      </div>
    </div>

    <div class="mobile-menu" id="mobileMenu" hidden>
      <nav aria-label="Mobile navigation">
        ${linksHtml}
        <div class="mobile-menu-divider"></div>
        <button type="button" class="btn btn-ghost" id="mobileProfileBtn" style="width:100%; text-align:left; justify-content:flex-start;">
          👤 View Profile
        </button>
        <button type="button" class="btn btn-danger btn-sm" id="mobileLogoutBtn" style="width:100%; margin-top:8px;">
          Logout
        </button>
      </nav>
    </div>`;

  // Listeners
  container.querySelector("#logoutBtn")?.addEventListener("click", logout);
  container.querySelector("#profileBtn")?.addEventListener("click", openProfileModal);
  container.querySelector("#mobileProfileBtn")?.addEventListener("click", () => {
    toggleMobileMenu(false);
    openProfileModal();
  });
  container.querySelector("#mobileLogoutBtn")?.addEventListener("click", logout);

  const hamBtn = container.querySelector("#hamburgerBtn");
  const mobileMenu = container.querySelector("#mobileMenu");

  function toggleMobileMenu(show) {
    const isExpanded = show !== undefined ? show : mobileMenu.hidden;
    mobileMenu.hidden = !isExpanded;
    hamBtn.setAttribute("aria-expanded", String(isExpanded));
    hamBtn.classList.toggle("open", isExpanded);
  }

  hamBtn?.addEventListener("click", () => toggleMobileMenu());
}

// Keep renderSidebar as an alias for backward compatibility
export const renderSidebar = renderTopNav;

/* ---------- Toast ---------- */

/** showToast("Saved", "success") | showToast("Failed", "error") */
export function showToast(message, type = "info") {
  let stack = document.getElementById("toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toast-stack";
    stack.setAttribute("role", "status");
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ---------- Modal ---------- */

let lastFocused = null;

function onEscape(event) {
  if (event.key === "Escape") closeModal();
}

/**
 * Opens a modal. Returns the modal element so you can attach listeners to your form.
 * Click on the backdrop or press Esc to close.
 */
export function openModal({ title, subtitle = "", bodyHtml = "" }) {
  closeModal();
  lastFocused = document.activeElement;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "modalBackdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <h2 id="modalTitle">${escapeHtml(title)}</h2>
      ${subtitle ? `<p class="modal-sub">${escapeHtml(subtitle)}</p>` : ""}
      ${bodyHtml}
    </div>`;

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", onEscape);
  document.body.appendChild(backdrop);

  const firstField = backdrop.querySelector("input, select, textarea, button");
  if (firstField) firstField.focus();

  return backdrop.querySelector(".modal");
}

export function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  if (backdrop) backdrop.remove();
  document.removeEventListener("keydown", onEscape);
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  lastFocused = null;
}
