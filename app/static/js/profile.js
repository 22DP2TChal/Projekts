// app/static/js/profile.js

document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn      = document.getElementById("logoutBtn");
  const profileContent = document.getElementById("profileContent");
  const profileMessage = document.getElementById("profileMessage");

  // Get user_id from URL: /users/{user_id}/profile
  const pathParts = window.location.pathname.split("/");
  // ["", "users", "{user_id}", "profile"]
  const userId = parseInt(pathParts[pathParts.length - 2]);

  // 1) Show logout button only if logged in
  try {
    const currentUser = await requireAuth(); // redirects to "/" if no token
    logoutBtn.style.display = "inline";
    logoutBtn.addEventListener("click", logout);
  } catch {
    // If guest, just hide logout button
    logoutBtn.style.display = "none";
  }

  // 2) Fetch user data from API
  try {
    const resp = await fetch(`${API_BASE}/api/users/${userId}`);
    // Assuming this endpoint is public. If it requires auth, adjust backend accordingly.

    if (!resp.ok) {
      if (resp.status === 404) {
        profileMessage.classList.add("message", "error");
        profileMessage.innerText = "User not found.";
      } else {
        profileMessage.classList.add("message", "error");
        profileMessage.innerText = `Loading error: ${resp.status}`;
      }
      profileMessage.style.display = "block";
      profileContent.innerHTML = "";
      return;
    }

    const userData = await resp.json();
    // Example userData: { "id": 3, "email": "user@example.com", "role": "freelancer", "status": "active" }

    // 3) Render user info
    profileContent.innerHTML = `
      <div class="profile-field">
        <span class="profile-label">ID:</span> ${userData.id}
      </div>
      <div class="profile-field">
        <span class="profile-label">Email:</span> ${userData.email}
      </div>
      <div class="profile-field">
        <span class="profile-label">Role:</span> ${userData.role}
      </div>
      <div class="profile-field">
        <span class="profile-label">Status:</span> ${userData.status}
      </div>
    `;
  } catch (err) {
    profileMessage.classList.add("message", "error");
    profileMessage.innerText = `Network error: ${err.message}`;
    profileMessage.style.display = "block";
    profileContent.innerHTML = "";
  }
});
