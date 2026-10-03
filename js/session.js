const SESSION_KEY = "session";

// AUTH-08: create the current-user session (without storeing the password)
export const saveSession = (user) => {
  const { id, first_name, last_name, email } = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, first_name, last_name, email }));
};



// AUTH-10: retrieve the logged-in user, or null
export const getSession = () => {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
};

// AUTH-11: is anyone logged in?
export const isLoggedIn = () => getSession() !== null;

// AUTH-09: end the session
export const logout = () => {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("currentInstructor");
  window.location.href = "../pages/login.html";
};


// Call at the top of every protected page's script
export const requireAuth = () => {
  if (!isLoggedIn()) {
    window.location.replace("../pages/login.html");
  }
};

// Call on login/signup pages so logged-in users skip them
export const redirectIfLoggedIn = () => {
  if (isLoggedIn()) {
    window.location.replace("../pages/dashboard.html");
  }
};