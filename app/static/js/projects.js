document.addEventListener("DOMContentLoaded", async () => {
  const navWelcome      = document.getElementById("navWelcome");
  const navLogoutBtn    = document.getElementById("navLogoutBtn");
  const projectsListDiv = document.getElementById("projectsList");
  const projectsMessage = document.getElementById("projectsMessage");

  const searchInput     = document.getElementById("searchInput");
  const statusFilter    = document.getElementById("statusFilter");

  let user = null;
  try {
    // Try to get the current user; if unauthorized, requireAuth() redirects to "/"
    user = await requireAuth();
  } catch {
    // If no token or it's invalid, JS already redirected to "/", so this code won't execute further
    return;
  }

  // **Our new HTML block**
  const createBtnWrapper = document.getElementById("createProjectBtnWrapper");
  const createBtn = document.getElementById("createProjectBtn");
  
  // 1) Replace href of “Freelance System” to navigate to profile:
  const navLogo = document.getElementById("navLogo");
  if (user && navLogo) {
    navLogo.href = `/users/${user.id}`;
  }
  if (window.location.pathname.includes("/profile")) {
    if (navLogo) {
       navLogo.href = "/projects";
    }
  } else {
    // No action needed here
  }

  // The rest of the code remains unchanged...
  navLogoutBtn.addEventListener("click", logout);
  await loadProjects(user, "", "");

  // Debounce function for automatic search/filter
  let debounceTimer;
  function debounceLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const searchValue = searchInput.value.trim();
      const statusValue = statusFilter.value;
      await loadProjects(user, searchValue, statusValue);
    }, 300);
  }

  if (user && user.role === "employer" && createBtnWrapper && createBtn) {
    createBtnWrapper.style.display = "block";
    createBtn.addEventListener("click", () => {
      window.location.href = "/projects/create";
    });
  }

  searchInput.addEventListener("input", debounceLoad);
  statusFilter.addEventListener("change", debounceLoad);

  // Main function to load and render the list of projects
  async function loadProjects(user, searchValue, statusValue) {
    projectsListDiv.innerHTML = "";
    projectsMessage.innerHTML = "";
    projectsMessage.style.display = "none";

    try {
      let url = `${API_BASE}/api/projects?skip=0&limit=100`;
      if (searchValue) {
        url += `&search=${encodeURIComponent(searchValue)}`;
      }
      if (statusValue) {
        url += `&status=${encodeURIComponent(statusValue)}`;
      }

      const resp = await fetch(url, {
        headers: user ? { "Authorization": `Bearer ${getToken()}` } : {},
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      let projects = await resp.json();

      if (!projects || projects.length === 0) {
        projectsListDiv.innerHTML = "<p>No projects found.</p>";
        return;
      }

      // If user is employer, filter only their own projects
      if (user && user.role === "employer") {
        projects = projects.filter(proj => proj.employer_id === user.id);
      }

      for (const proj of projects) {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="card-header">${proj.title}</div>
          <div class="card-body">
            <p>${ proj.description || "<em>No description</em>" }</p>
            <p><strong>Budget:</strong> ₽${ proj.budget.toFixed(2) }</p>
          </div>
          <div class="card-footer">
            <span class="status">Status: ${proj.status}</span>
            <div class="card-buttons"></div>
          </div>
        `;

        const buttonsContainer = card.querySelector(".card-buttons");

        // If freelancer and project is open — “Apply/Edit Application”
        if (user && user.role === "freelancer" && proj.status === "open") {
          let hasApplied = false;
          try {
            const checkResp = await fetch(
              `${API_BASE}/api/applications/projects/${proj.id}/applications/me`,
              { headers: { "Authorization": `Bearer ${getToken()}` } }
            );
            if (checkResp.ok) hasApplied = true;
          } catch {
            hasApplied = false;
          }

          const actionBtn = document.createElement("button");
          actionBtn.className = "primary-btn";
          actionBtn.innerText = hasApplied ? "Edit Application" : "Apply";
          actionBtn.addEventListener("click", () => {
            window.location.href = `/projects/${proj.id}`;
          });
          buttonsContainer.appendChild(actionBtn);
        }

        // Guest or other roles (not employer or freelancer) — “View” (if project is open)
        if ((!user || (user.role !== "employer" && user.role !== "freelancer")) && proj.status === "open") {
          const viewBtn = document.createElement("button");
          viewBtn.className = "primary-btn";
          viewBtn.innerText = "View";
          viewBtn.addEventListener("click", () => {
            window.location.href = `/projects/${proj.id}`;
          });
          buttonsContainer.appendChild(viewBtn);
        }

        // If employer and this is their project — “View Applications”, “Statistics”, and a select to change project status
        if (user && user.role === "employer" && proj.employer_id === user.id) {
          // 1) “View Applications”
          const viewAppsBtn = document.createElement("button");
          viewAppsBtn.className = "primary-btn";
          viewAppsBtn.innerText = "View Applications";
          viewAppsBtn.addEventListener("click", () => {
            window.location.href = `/projects/${proj.id}/applications`;
          });
          buttonsContainer.appendChild(viewAppsBtn);

          // 2) “Statistics”
          const statsBtn = document.createElement("button");
          statsBtn.className = "primary-btn";
          statsBtn.style.marginLeft = "8px";
          statsBtn.innerText = "Statistics";
          statsBtn.addEventListener("click", async () => {
            try {
              const statsResp = await fetch(
                `${API_BASE}/api/projects/${proj.id}/stats`,
                { headers: { "Authorization": `Bearer ${getToken()}` } }
              );
              if (!statsResp.ok) throw new Error(`HTTP ${statsResp.status}`);
              const statsData = await statsResp.json();
              alert(
                `Project "${proj.title}"\n` +
                `– Total applications: ${statsData.application_count}\n` +
                `– Average price: ₽${statsData.avg_price.toFixed(2)}`
              );
            } catch (e) {
              alert(`Failed to fetch statistics: ${e.message}`);
            }
          });
          buttonsContainer.appendChild(statsBtn);

          // 3) Select for changing project status
          const statusSelect = document.createElement("select");
          statusSelect.style.marginLeft = "8px";

          const statuses = [
            { value: "open",        label: "Open" },
            { value: "in_progress", label: "In Progress" },
            { value: "closed",      label: "Closed" }
          ];

          statuses.forEach(({ value, label }) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.innerText = label;
            if (proj.status === value) opt.selected = true;
            statusSelect.appendChild(opt);
          });

          statusSelect.addEventListener("change", async () => {
            const newStatus = statusSelect.value;
            const body = { status: newStatus };

            try {
              const resp = await fetch(`${API_BASE}/api/projects/${proj.id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${getToken()}`
                },
                body: JSON.stringify(body)
              });

              if (resp.ok) {
                const statusSpan = card.querySelector(".status");
                statusSpan.innerHTML = `Status: ${newStatus}`;
              } else {
                let errMsg = `HTTP ${resp.status}`;
                const contentType = resp.headers.get("content-type") || "";
                if (contentType.includes("application/json")) {
                  const errJson = await resp.json();
                  errMsg = JSON.stringify(errJson, null, 2);
                }
                alert(`Failed to change status:\n${errMsg}`);
                statusSelect.value = proj.status;
              }
            } catch (err) {
              alert(`Network error while changing status: ${err.message}`);
              statusSelect.value = proj.status;
            }
          });

          buttonsContainer.appendChild(statusSelect);
        }

        projectsListDiv.appendChild(card);
      }

    } catch (err) {
      projectsMessage.classList.add("error");
      projectsMessage.innerText = `Error loading projects: ${err.message}`;
      projectsMessage.style.display = "block";
    }
  }
});
