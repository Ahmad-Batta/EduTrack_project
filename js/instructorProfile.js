import { logout, getSession, saveSession } from "./session.js";
import { getInstructor, updateInstructor, getStudentsByInstructor } from "./apiAuth.js";
import { renderTopNav } from "./layout.js";

const session = getSession();
if (!session) {
  window.location.replace("login.html");
  throw new Error("Not logged in");
}

renderTopNav("");

const $ = (id) => document.getElementById(id);

// ---------- Toast ----------
let toastTimer;
const showToast = (text) => {
  const toast = $("toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
};

// ---------- Load the full record (the session only holds id/name/email) ----------
let user;
try {
  user = await getInstructor(session.id);
} catch (error) {
  showToast(error.message);
  throw error;
}

if (user.archived) {
  logout();
  throw new Error("Account archived");
}

// ---------- Render instructor data ----------
const fieldMap = [
  ["first_name", "first_name"],
  ["last_name", "last_name"],
  ["email", "email"],
  ["university", "University"],
  ["department", "department"],
];

const renderProfile = () => {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.name || "Trainer";

  const sb = $("sidebar-name");
  if (sb) sb.textContent = fullName;
  if ($("profile-name")) $("profile-name").textContent = fullName;
  if ($("profile-email")) $("profile-email").textContent = user.email || "";
  if ($("profile-university")) $("profile-university").textContent = user.University || user.university || "";
  if ($("profile-department")) $("profile-department").textContent = user.department || "";

  fieldMap.forEach(([inputId, key]) => {
    const el = $(inputId);
    if (el) el.value = user[key] || "";
  });
  if ($("save-btn")) $("save-btn").disabled = true;
};

renderProfile();

// ---------- Logout ----------
if ($("logout-btn")) $("logout-btn").addEventListener("click", logout);

// ---------- Tabs ----------
let studentsLoaded = false;

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    ["edit", "password", "students"].forEach((name) => {
      $(`panel-${name}`).hidden = name !== tab.dataset.tab;
    });

    if (tab.dataset.tab === "students" && !studentsLoaded) loadStudents();
  });
});

// ---------- Edit profile (PATCH) ----------
const editForm = $("edit-form");

const getEdits = () => ({
  first_name: $("first_name").value.trim(),
  last_name: $("last_name").value.trim(),
  University: $("university").value.trim(),
  department: $("department").value.trim(),
});

const isDirty = () => Object.entries(getEdits()).some(([key, value]) => value !== user[key]);

editForm.addEventListener("input", () => {
  $("save-btn").disabled = !isDirty();
  $("edit-message").textContent = "";
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const edits = getEdits();

  if (Object.values(edits).some((value) => value === "")) {
    $("edit-message").textContent = "All fields are required";
    return;
  }

  $("save-btn").disabled = true;
  try {
    user = await updateInstructor(user.id, edits);
    saveSession(user); // keeps the stored name in sync
    renderProfile();
    showToast("Profile updated ✓");
  } catch (error) {
    $("edit-message").textContent = error.message;
    $("save-btn").disabled = false;
  }
});

const deleteModal = $("delete-modal");
const deleteInput = $("delete-confirm-input");
const confirmDeleteBtn = $("confirm-delete-btn");

const closeDeleteModal = () => deleteModal && deleteModal.classList.remove("active");

if ($("open-delete-btn")) $("open-delete-btn").addEventListener("click", () => deleteModal && deleteModal.classList.add("active"));
if ($("cancel-delete-btn")) $("cancel-delete-btn").addEventListener("click", closeDeleteModal);
if ($("close-delete-x")) $("close-delete-x").addEventListener("click", closeDeleteModal);
if (deleteModal) {
  deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) closeDeleteModal();
  });
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDeleteModal();
});

if (deleteInput && confirmDeleteBtn) {
  deleteInput.addEventListener("input", () => {
    confirmDeleteBtn.disabled = deleteInput.value.trim().toLowerCase() !== user.email.toLowerCase();
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", async () => {
    confirmDeleteBtn.disabled = true;
    try {
      await updateInstructor(user.id, { archived: true });
      logout();
    } catch (error) {
      if ($("delete-message")) $("delete-message").textContent = error.message;
      confirmDeleteBtn.disabled = false;
    }
  });
}