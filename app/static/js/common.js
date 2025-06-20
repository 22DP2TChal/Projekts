// app/static/js/common.js

const API_BASE = "http://127.0.0.1:8000";

function saveToken(token) {
  localStorage.setItem("access_token", token);
  console.log("[common.js] saveToken: token saved to localStorage");
}

function getToken() {
  return localStorage.getItem("access_token");
}

function clearToken() {
  localStorage.removeItem("access_token");
  console.log("[common.js] clearToken: token removed from localStorage");
}

async function requireAuth() {
  const token = getToken();
  console.log("[common.js] requireAuth: token from localStorage =", token);
  if (!token) {
    console.log("[common.js] requireAuth: no token → redirecting to /");
    window.location.href = "/";
    return null;
  }

  const resp = await fetch(`${API_BASE}/api/users/me`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  console.log("[common.js] requireAuth: GET /users/me status =", resp.status);
  if (!resp.ok) {
    clearToken();
    console.log("[common.js] requireAuth: invalid token → redirecting to /");
    window.location.href = "/";
    return null;
  }
  const user = await resp.json();
  console.log("[common.js] requireAuth: /users/me response →", user);
  return user;
}

function logout() {
  clearToken();
  window.location.href = "/";
}
