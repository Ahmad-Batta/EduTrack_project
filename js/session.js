const SESSION_KEY = "session";

// AUTH-08: create the current-user session
export const saveSession = (user) => {
  if (!user) return;
  const name = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "Trainer";
  const userPayload = {
    ...user,
    name,
    first_name: user.first_name || name.split(" ")[0] || "",
    last_name: user.last_name || name.split(" ").slice(1).join(" ") || "",
    email: user.email || "",
    University: user.University || user.university || "EduTrack University",
    department: user.department || "Academic Department"
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(userPayload));
  sessionStorage.setItem("currentUser", JSON.stringify(userPayload));
  localStorage.setItem("currentInstructor", JSON.stringify(userPayload));
};

// AUTH-10: retrieve the logged-in user, or null
export const getSession = () => {
  try {
    const rawSession = sessionStorage.getItem(SESSION_KEY);
    if (rawSession) return JSON.parse(rawSession);

    const rawUser = sessionStorage.getItem("currentUser");
    if (rawUser) return JSON.parse(rawUser);

    const rawInstructor = localStorage.getItem("currentInstructor");
    if (rawInstructor) return JSON.parse(rawInstructor);
  } catch {
    // Ignore parse errors
  }
  return null;
};

// AUTH-11: is anyone logged in?
export const isLoggedIn = () => getSession() !== null;

// AUTH-09: end the session
export const logout = () => {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem("currentUser");
  localStorage.removeItem("currentInstructor");
  const loginPath = window.location.pathname.includes("/pages/") ? "login.html" : "pages/login.html";
  window.location.href = loginPath;
};


// Call at the top of every protected page's script
export const requireAuth = () => {
  if (!isLoggedIn()) {
    const loginPath = window.location.pathname.includes("/pages/") ? "login.html" : "pages/login.html";
    window.location.replace(loginPath);
  }
};

// Call on login/signup pages so logged-in users skip them unless explicit reset parameter ?logout=1 or ?signout=1 is present
export const redirectIfLoggedIn = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("logout") === "1" || params.get("signout") === "1") {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("currentUser");
    localStorage.removeItem("currentInstructor");
    return;
  }
  if (isLoggedIn()) {
    const targetPage = window.location.pathname.includes("/pages/") ? "home.html" : "pages/home.html";
    window.location.replace(targetPage);
  }
};
