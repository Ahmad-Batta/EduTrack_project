const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 8;

const isEmpty = (value) => !value || value.trim() === "";

// Required + minimum length check for plain text fields
const validateText = (value, label) => {
  if (isEmpty(value)) return `Enter your ${label}`;
  if (value.trim().length < MIN_NAME_LENGTH) {
    return `${label} must be at least ${MIN_NAME_LENGTH} characters`;
  }
  return null;
};

// Returns an object of errors keyed by field name ({} means valid)
export const validateSignup = (values, emailInput) => {
  const errors = {};

  const textFields = {
    first_name: "first name",
    last_name: "last name",
    university: "university or academy",
    department: "department",
  };

  for (const [field, label] of Object.entries(textFields)) {
    const message = validateText(values[field], label);
    if (message) errors[field] = message;
  }

  // Email: the browser checks the format through the input's validity
  if (isEmpty(values.email)) {
    errors.email = "Enter your email";
  } else if (!emailInput.validity.valid) {
    errors.email = "Enter a valid email address";
  }

  // Password
  const password = values.password || "";
  if (!password) {
    errors.password = "Enter a password";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Password must contain a letter and a number";
  }

  // Confirm password (only compared when the password itself is valid)
  if (!values.confirm_password) {
    errors.confirm_password = "Confirm your password";
  } else if (!errors.password && values.confirm_password !== password) {
    errors.confirm_password = "Passwords do not match";
  }

  return errors;
};