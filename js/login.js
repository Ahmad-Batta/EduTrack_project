import { validateLogin } from "./validations/validateLogin.js";
import { login } from "./apiAuth.js";
import { saveSession, redirectIfLoggedIn } from "./session.js";

redirectIfLoggedIn();

const form = document.getElementById("login-form");
const formMessage = document.getElementById("form-message");

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

const showErrors = (errors) => {
  for (const [field, message] of Object.entries(errors)) {
    document.getElementById(`${field}-error`).textContent = message;
    form.elements[field].classList.add("invalid");
  }
  form.elements[Object.keys(errors)[0]].focus();
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const values = getFormValues();
  const errors = validateLogin(values, form.elements.email);

  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  const button = form.querySelector(".btn-submit");
  button.disabled = true;

  try {
    const user = await login(values.email, values.password);
    saveSession(user);
    window.location.href = "../pages/home.html";
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});