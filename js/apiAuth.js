const BASE_URL = "http://localhost:3000";

//singup
export const signup = async (user) => {
  // 1. Is the email already registered?
  const check = await fetch(`${BASE_URL}/instructors?email=${encodeURIComponent(user.email)}`);
  if (!check.ok) throw new Error("Could not reach the server");

  const existing = await check.json();
  if (existing.length > 0) {
    throw new Error("This email is already registered");
  }

  // 2. Work out the next id (highest existing id + 1)
  const all = await fetch(`${BASE_URL}/instructors`);
  if (!all.ok) throw new Error("Could not reach the server");

  const instructors = await all.json();
  const maxId = instructors.reduce((max, i) => Math.max(max, Number(i.id)), 0);
  const newUser = { id: String(maxId + 1), ...user };

  // 3. Create the instructor
  const response = await fetch(`${BASE_URL}/instructors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newUser),
  });
  if (!response.ok) throw new Error("Could not create the account");

  return response.json();
};


//login here
export const login = async (email, password) => {
  const response = await fetch(`${BASE_URL}/instructors?email=${encodeURIComponent(email)}`);
  if (!response.ok) throw new Error("Could not reach the server");
 
  const [user] = await response.json();
 
  // Same message for all cases so we don't reveal which one was wrong
  // (archived = soft-deleted account, treated like it doesn't exist)
  if (!user || user.archived || user.password !== password) {
    throw new Error("Incorrect email or password");
  }
 
  return user;
};


//update instructor (PATCH): profile edits, password change, soft delete
export const updateInstructor = async (id, changes) => {
  const response = await fetch(`${BASE_URL}/instructors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!response.ok) throw new Error("Could not update the account");

  return response.json();
};


//students of one instructor (GET, read only)
export const getStudentsByInstructor = async (instructorId) => {
  const response = await fetch(`${BASE_URL}/students?instructor_id=${encodeURIComponent(instructorId)}`);
  if (!response.ok) throw new Error("Could not load students");

  return response.json();
};

export const getInstructor = async (id) => {
  const response = await fetch(`${BASE_URL}/instructors/${id}`);
  if (!response.ok) throw new Error("Could not load your profile");

  return response.json();
};