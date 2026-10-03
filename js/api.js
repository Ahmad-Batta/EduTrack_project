/* ==========================================================
   api.js - generic JSON Server helper
   Person 2 owns this file. This starter version has the same
   interface they agreed on, so it can be replaced without
   touching any other file:

     api.get("/students")
     api.post("/students", body)
     api.put("/students/1", body)
     api.patch("/students/1", changes)
     api.delete("/students/1")
   ========================================================== */

export const BASE_URL = "http://localhost:3000";

async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only rejects on network failure (server down, CORS, etc.)
    throw new Error("Cannot reach the server. Make sure JSON Server is running.");
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${method} ${path} (${response.status})`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
