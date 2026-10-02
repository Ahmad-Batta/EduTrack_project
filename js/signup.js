import { validateSignup } from "./validations/validateSignup.js";
import { signup } from "./apiAuth.js";

const form = document.getElementById("signup-form");
const formMessage = document.getElementById("form-message");

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

const showErrors = (errors) => {
  for (const [field, message] of Object.entries(errors)) {
    document.getElementById(`${field}-error`).textContent = message;
    form.elements[field].classList.add("invalid");
  }
  // Move focus to the first field with a problem
  form.elements[Object.keys(errors)[0]].focus();
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const values = getFormValues();
  const errors = validateSignup(values, form.elements.email);

  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  // Don't save the confirmation field
  const { confirm_password, ...user } = values;
  user.createdAt = new Date().toISOString();

  const button = form.querySelector(".btn-submit");
  button.disabled = true;

  try {
    await signup(user);
    window.location.href = "../pages/login.html";
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});