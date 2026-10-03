import { logout, getSession, saveSession } from "./session.js";
import { getInstructor, updateInstructor, getStudentsByInstructor } from "./apiAuth.js";

const session = getSession();
if (!session) {
  window.location.replace("login.html");
  throw new Error("Not logged in");
}

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
  const fullName = `${user.first_name} ${user.last_name}`;

  $("sidebar-name").textContent = fullName;
  $("profile-name").textContent = fullName;
  $("profile-email").textContent = user.email;
  $("profile-university").textContent = user.University;
  $("profile-department").textContent = user.department;

  fieldMap.forEach(([inputId, key]) => ($(inputId).value = user[key]));
  $("save-btn").disabled = true;
};

renderProfile();

// ---------- Logout ----------
$("logout-btn").addEventListener("click", logout);

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

// ---------- Change password (PATCH) ----------
const passwordForm = $("password-form");

passwordForm.addEventListener("input", () => ($("password-message").textContent = ""));

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const current = $("current_password").value;
  const next = $("new_password").value;
  const confirm = $("confirm_new_password").value;
  const message = $("password-message");

  if (!current || !next || !confirm) {
    message.textContent = "All fields are required";
  } else if (current !== user.password) {
    message.textContent = "Current password is incorrect";
  } else if (next.length < 8) {
    message.textContent = "New password must be at least 8 characters";
  } else if (next === current) {
    message.textContent = "New password must be different from the current one";
  } else if (next !== confirm) {
    message.textContent = "Passwords do not match";
  } else {
    $("password-btn").disabled = true;
    try {
      user = await updateInstructor(user.id, { password: next });
      passwordForm.reset();
      showToast("Password updated ✓");
    } catch (error) {
      message.textContent = error.message;
    } finally {
      $("password-btn").disabled = false;
    }
  }
});

// ---------- My students (GET, read only) ----------
const loadStudents = async () => {
  const status = $("students-status");
  const table = $("students-table");
  const body = $("students-body");

  try {
    const students = await getStudentsByInstructor(user.id);
    studentsLoaded = true;
    $("students-count").textContent = `${students.length} student${students.length === 1 ? "" : "s"}`;

    if (students.length === 0) {
      status.textContent = "You have no students yet.";
      return;
    }

    body.innerHTML = "";
    students.forEach((student) => {
      const row = document.createElement("tr");
      const cells = [
        `${student.first_name} ${student.last_name}`,
        student.email,
        student.major,
        student.University_id,
      ];

      cells.forEach((text) => {
        const cell = document.createElement("td");
        cell.textContent = text ?? "—";
        row.appendChild(cell);
      });
      body.appendChild(row);
    });

    status.hidden = true;
    table.hidden = false;
  } catch (error) {
    status.textContent = error.message;
  }
};

// ---------- Delete account (soft delete: PATCH archived) ----------
const deleteModal = $("delete-modal");
const deleteInput = $("delete-confirm-input");
const confirmDeleteBtn = $("confirm-delete-btn");

const openDeleteModal = () => {
  $("delete-email").textContent = user.email;
  deleteInput.value = "";
  confirmDeleteBtn.disabled = true;
  $("delete-message").textContent = "";
  deleteModal.classList.add("active");
  deleteInput.focus();
};

const closeDeleteModal = () => deleteModal.classList.remove("active");

$("open-delete-btn").addEventListener("click", openDeleteModal);
$("cancel-delete-btn").addEventListener("click", closeDeleteModal);
$("close-delete-x").addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (event) => {
  if (event.target === deleteModal) closeDeleteModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDeleteModal();
});

deleteInput.addEventListener("input", () => {
  confirmDeleteBtn.disabled = deleteInput.value.trim().toLowerCase() !== user.email.toLowerCase();
});

confirmDeleteBtn.addEventListener("click", async () => {
  confirmDeleteBtn.disabled = true;
  try {
    await updateInstructor(user.id, { archived: true });
    logout();
  } catch (error) {
    $("delete-message").textContent = error.message;
    confirmDeleteBtn.disabled = false;
  }
});