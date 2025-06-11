// app/static/js/login.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const messageDiv = document.getElementById("loginMessage");

  // Hide message on page load
  messageDiv.style.display = "none";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Clear previous messages and hide the message box
    messageDiv.innerText = "";
    messageDiv.className = "message"; // reset possible error/success classes
    messageDiv.style.display = "none";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    // Prepare formData for OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append("grant_type", "password");
    formData.append("username", email);
    formData.append("password", password);

    try {
      console.log("[login.js] Sending fetch to URL:", `${API_BASE}/api/users/login`);
      const resp = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });

      console.log("[login.js] Response HTTP status:", resp.status);

      if (resp.ok) {
        // 200 OK: get token and redirect
        const data = await resp.json();
        console.log("[login.js] Token received:", data.access_token);
        saveToken(data.access_token);
        window.location.href = "/projects";
      } else {
        // Non-200 status: read JSON with 'detail' field
        let errMsg = "Unknown error";
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errJson = await resp.json();
          errMsg = errJson.detail || JSON.stringify(errJson);
        } else {
          errMsg = await resp.text();
        }
        console.warn("[login.js] Server error response, status =", resp.status, "; message:", errMsg);

        // Show error message
        messageDiv.classList.add("error");
        messageDiv.innerText = errMsg;
        messageDiv.style.display = "block";
      }
    } catch (networkError) {
      console.error("[login.js] Network error:", networkError);
      messageDiv.classList.add("error");
      messageDiv.innerText = `Network error: ${networkError.message}`;
      messageDiv.style.display = "block";
    }
  });
});
