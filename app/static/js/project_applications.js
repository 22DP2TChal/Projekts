// app/static/js/project_applications.js

document.addEventListener("DOMContentLoaded", async () => {
  const appsMessage    = document.getElementById("appsMessage");
  const cardsContainer = document.getElementById("appsGrid");
  const logoutBtn      = document.getElementById("logoutBtn");

  logoutBtn.addEventListener("click", logout);

  // 1) Extract projectId from URL: /projects/{id}/applications
  const pathParts = window.location.pathname.split("/");
  const projectId = pathParts[pathParts.length - 2];

  // 2) Check authorization and get current user
  const userInfo = await requireAuth();
  if (!userInfo) return; // if not authorized, requireAuth redirects to "/"

  // 3) Fetch applications list from API
  try {
    const resp = await fetch(
      `${API_BASE}/api/applications/projects/${projectId}/applications/`,
      {
        headers: { "Authorization": `Bearer ${getToken()}` },
      }
    );

    if (resp.status === 403) {
      const data = await resp.json().catch(() => ({}));
      showMessage(data.detail || "Access denied", true);
      return;
    }
    if (resp.status === 404) {
      const data = await resp.json().catch(() => ({}));
      showMessage(data.detail || "Project not found", true);
      return;
    }
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      showMessage(`Error: ${data.detail || JSON.stringify(data)}`, true);
      return;
    }

    const applications = await resp.json();
    if (!applications || applications.length === 0) {
      showMessage("No applications yet for this project.", false);
      return;
    }

    cardsContainer.innerHTML = "";
    appsMessage.style.display = "none";

    for (const app of applications) {
      let freelancerData = null;
      try {
        const userResp = await fetch(
          `${API_BASE}/api/users/${app.freelancer_id}`,
          { headers: { "Authorization": `Bearer ${getToken()}` } }
        );
        if (userResp.ok) {
          freelancerData = await userResp.json();
        }
      } catch {
        freelancerData = null;
      }

      const card = document.createElement("div");
      card.className = "app-card";

      const header = document.createElement("div");
      header.className = "app-card-header";
      header.innerText = freelancerData
        ? `Application #${app.id} from ${freelancerData.email}`
        : `Application #${app.id} from ID ${app.freelancer_id}`;
      card.appendChild(header);

      const body = document.createElement("div");
      body.className = "app-card-body";

      if (freelancerData) {
        const pEmail = document.createElement("p");
        pEmail.innerHTML = `<span class="label">Email:</span> ${freelancerData.email}`;
        body.appendChild(pEmail);

        const pRole = document.createElement("p");
        pRole.innerHTML = `<span class="label">Role:</span> ${freelancerData.role}`;
        body.appendChild(pRole);

        const pStatus = document.createElement("p");
        pStatus.innerHTML = `<span class="label">Status:</span> ${freelancerData.status}`;
        body.appendChild(pStatus);

        if (freelancerData.about) {
          const pAbout = document.createElement("p");
          pAbout.innerHTML = `<span class="label">About:</span> ${freelancerData.about}`;
          body.appendChild(pAbout);
        }
      }

      const pText = document.createElement("p");
      pText.innerHTML = `<span class="label">Proposal:</span> ${app.proposal_text}`;
      body.appendChild(pText);

      const pPrice = document.createElement("p");
      pPrice.innerHTML = `<span class="label">Price:</span> ₽${parseFloat(app.proposed_price).toFixed(2)}`;
      body.appendChild(pPrice);

      const pAppStatus = document.createElement("p");
      pAppStatus.innerHTML = `<span class="label">Status:</span> ${app.status}`;
      body.appendChild(pAppStatus);

      card.appendChild(body);

      // Add “View Profile” button
      const footer = document.createElement("div");
      footer.className = "app-card-footer";

      if (freelancerData) {
        const btn = document.createElement("button");
        btn.innerText = "View Profile";
        btn.className = "primary-btn";
        btn.addEventListener("click", () => {
          window.location.href = `/users/${freelancerData.id}/profile`;
        });
        footer.appendChild(btn);
      }

      card.appendChild(footer);
      cardsContainer.appendChild(card);
    }
  } catch (err) {
    showMessage(`Network error: ${err.message}`, true);
  }

  function showMessage(text, isError) {
    cardsContainer.innerHTML = "";
    appsMessage.innerText = text;
    appsMessage.classList.remove("error", "info");
    appsMessage.classList.add(isError ? "error" : "info");
    appsMessage.style.display = "block";
  }
});
