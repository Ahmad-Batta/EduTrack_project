import { validateSignup } from "./validations/validateSignup.js";
import { signup } from "./apiAuth.js";

const form = document.getElementById("signup-form");
const formCard = document.getElementById("form-card");
const formMessage = document.getElementById("form-message");
const button = form.querySelector(".btn-submit");
const buttonText = button.querySelector(".btn-text");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm_password");
const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");
const tagline = document.getElementById("tagline");

// ---------- Show / hide password (both fields) ----------
document.querySelectorAll(".toggle-password").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.textContent = isHidden ? "Hide" : "Show";
  });
});

// ---------- Password strength meter (visual hint only) ----------
const getStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const strengthLevels = [
  { label: "Weak", color: "#dc2626", width: "25%" },
  { label: "Fair", color: "#f59e0b", width: "50%" },
  { label: "Good", color: "#0e8f99", width: "75%" },
  { label: "Strong", color: "#16a34a", width: "100%" },
];

const updateStrength = () => {
  const password = passwordInput.value;
  if (!password) {
    strengthBar.style.width = "0";
    strengthText.textContent = "";
    return;
  }
  const level = strengthLevels[Math.max(getStrength(password) - 1, 0)];
  strengthBar.style.width = level.width;
  strengthBar.style.backgroundColor = level.color;
  strengthText.textContent = level.label;
  strengthText.style.color = level.color;
};

// ---------- Live "passwords match" feedback ----------
const updateMatch = () => {
  const matches = confirmInput.value && confirmInput.value === passwordInput.value;
  confirmInput.classList.toggle("valid", Boolean(matches));
};

passwordInput.addEventListener("input", () => {
  updateStrength();
  updateMatch();
});
confirmInput.addEventListener("input", updateMatch);

// ---------- Rotating tagline ----------
const taglines = [
  "Join instructors who spend less time on paperwork.",
  "Your whole class, finally in one place.",
  "Spot who needs help before it's too late.",
  "Great instructors deserve great tools.",
];
let taglineIndex = 0;

setInterval(() => {
  tagline.classList.add("fade-out");
  setTimeout(() => {
    taglineIndex = (taglineIndex + 1) % taglines.length;
    tagline.textContent = taglines[taglineIndex];
    tagline.classList.remove("fade-out");
  }, 400);
}, 4000);

// ---------- Form helpers ----------
// Reads every named input; trims text fields and lowercases the email
const getFormValues = () => {
  const values = Object.fromEntries(new FormData(form));
  //Take the form's fields that have name attributes and create an object using those names as the keys.

  for (const key of Object.keys(values)) {
    if (key !== "password" && key !== "confirm_password") {
      values[key] = values[key].trim();
    }
  }
  values.email = values.email.toLowerCase();

  return values;
};

const clearErrors = () => {
  form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  form.querySelectorAll(".input-field").forEach((el) => el.classList.remove("invalid"));
  formMessage.textContent = "";
};

const shakeCard = () => {
  formCard.classList.remove("shake");
  void formCard.offsetWidth; // restart the animation
  formCard.classList.add("shake");
};

const showErrors = (errors) => {
  for (const [field, message] of Object.entries(errors)) {
    document.getElementById(`${field}-error`).textContent = message;
    form.elements[field].classList.add("invalid");
  }
  // Move focus to the first field with a problem
  form.elements[Object.keys(errors)[0]].focus();
  shakeCard();
};

const setLoading = (isLoading) => {
  button.disabled = isLoading;
  button.classList.toggle("loading", isLoading);
  buttonText.textContent = isLoading ? "Creating account..." : "Create account";
};

// Clear a field's error as soon as the user edits it
form.querySelectorAll(".input-field").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    document.getElementById(`${input.name}-error`).textContent = "";
    formMessage.textContent = "";
  });
});

// ---------- Submit ----------
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const values = getFormValues();
  const errors = validateSignup(values, form.elements.email);

  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  // Save only these fields (json-server adds the id itself)
  const user = {
    first_name: values.first_name,
    last_name: values.last_name,
    email: values.email,
    password: values.password,
    University: values.university,
    department: values.department,
  };

  setLoading(true);

  try {
    await signup(user);
    window.location.href = "login.html"; // redirect right away
  } catch (error) {
    formMessage.textContent = error.message;
    shakeCard();
    setLoading(false);
  }
});