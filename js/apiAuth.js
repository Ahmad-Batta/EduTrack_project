const BASE_URL = "http://localhost:3000";

export const signup = async (user) => {
  // 1. Is the email already registered?
  const check = await fetch(`${BASE_URL}/instructors?email=${encodeURIComponent(user.email)}`);
  if (!check.ok) throw new Error("Could not reach the server");

  const existing = await check.json();
  if (existing.length > 0) {
    throw new Error("This email is already registered");
  }

  // 2. Create the instructor
  const response = await fetch(`${BASE_URL}/instructors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!response.ok) throw new Error("Could not create the account");

  return response.json();
};