import { validateLogin } from "./validations/validateLogin.js";
import { login } from "./apiAuth.js";
import { saveSession, redirectIfLoggedIn } from "./session.js";

redirectIfLoggedIn();

const form = document.getElementById("login-form");
const formCard = document.getElementById("form-card");
const formMessage = document.getElementById("form-message");
const button = form.querySelector(".btn-submit");
const buttonText = button.querySelector(".btn-text");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("toggle-password");
const tagline = document.getElementById("tagline");



// ---------- Show / hide password ----------
togglePassword.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePassword.textContent = isHidden ? "Hide" : "Show";
});

// ---------- Rotating tagline ----------
const taglines = [
  "Your students are counting on clear progress.",
  "Less paperwork, more teaching.",
  "Every grade tells a story. See it clearly.",
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
// Trims and lowercases the email; the password is left untouched
const getFormValues = () => {
  const values = Object.fromEntries(new FormData(form));
  values.email = values.email.trim().toLowerCase();
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
  form.elements[Object.keys(errors)[0]].focus();
  shakeCard();
};

const setLoading = (isLoading) => {
  button.disabled = isLoading;
  button.classList.toggle("loading", isLoading);
  buttonText.textContent = isLoading ? "Signing in..." : "Log in";
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
  const errors = validateLogin(values, form.elements.email);

  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  setLoading(true);

  try {
    const user = await login(values.email, values.password);



    saveSession(user);

    // Success state, then redirect
    button.classList.remove("loading");
    button.classList.add("success");
    buttonText.textContent = "Welcome back! ✓";
    setTimeout(() => {
      window.location.href = "../pages/home.html";
    }, 700);
  } catch (error) {
    formMessage.textContent = error.message;
    shakeCard();
    setLoading(false);
  }
});