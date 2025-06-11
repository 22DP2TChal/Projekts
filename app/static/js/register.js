document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const messageDiv = document.getElementById("registerMessage");

  // Make sure the message block is hidden initially
  messageDiv.style.display = "none";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Clear previous message
    messageDiv.innerText = "";
    messageDiv.className = "message";  
    messageDiv.style.display = "none";

    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const role = document.getElementById("registerRole").value;

    try {
      console.log("[register.js] Sending POST /api/users/ (registration) with:", { email, role });
      const resp = await fetch(`${API_BASE}/api/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });

      console.log("[register.js] Response /api/users/ status =", resp.status);
      if (resp.ok) {
        const data = await resp.json();
        console.log("[register.js] Response /api/users/ body =", data);
        // Show success message
        messageDiv.classList.add("success");
        messageDiv.innerText = `Successfully registered: ${data.email}. Please log in.`;
        messageDiv.style.display = "block";
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        // Read JSON with detail field
        let errMsg = "Unknown error";
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errJson = await resp.json();
          errMsg = errJson.detail || JSON.stringify(errJson);
        } else {
          errMsg = await resp.text();
        }
        // Show error
        messageDiv.classList.add("error");
        messageDiv.innerText = errMsg;
        messageDiv.style.display = "block";
      }
    } catch (networkError) {
      messageDiv.classList.add("error");
      messageDiv.innerText = `Network error: ${networkError.message}`;
      messageDiv.style.display = "block";
    }
  });
});
