const isEmpty = (value) => !value || value.trim() === "";

// Returns an object of errors keyed by field name ({} means valid)
export const validateLogin = (values, emailInput) => {
  const errors = {};

  if (isEmpty(values.email)) {
    errors.email = "Enter your email";
  } else if (!emailInput.validity.valid) {
    errors.email = "Enter a valid email address";
  }

  // Only check that it's filled in; the real check happens against the db
  if (!values.password) {
    errors.password = "Enter your password";
  }

  return errors;
};