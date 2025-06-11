document.addEventListener("DOMContentLoaded", async () => {
  // 1) Parse projectId from URL
  const pathParts = window.location.pathname.split("/");
  const projectId = parseInt(pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2]);

  // 2) DOM element references
  const projectTitleEl  = document.getElementById("projectTitle");
  const projectDescEl   = document.getElementById("projectDescription");
  const projectBudgetEl = document.getElementById("projectBudget");
  const projectStatusEl = document.getElementById("projectStatus");

  const applicationWrapper = document.getElementById("applicationWrapper");
  const logoutBtn          = document.getElementById("logoutBtn");

  // 3) Check token and get current user (or null if unauthenticated)
  let user = null;
  try {
    user = await requireAuth(); // If invalid token: this throws and user stays null
  } catch {
    user = null;
  }

  if (user) {
    logoutBtn.style.display = "inline";
    logoutBtn.addEventListener("click", logout);
  }

  // 4) Load project data (publicly accessible)
  let projectData;
  try {
    const resp = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      headers: user ? { "Authorization": `Bearer ${getToken()}` } : {}
    });
    if (!resp.ok) {
      projectTitleEl.innerText = "Project not found";
      projectDescEl.innerText = "";
      projectBudgetEl.innerText = "-";
      projectStatusEl.innerText = "-";
      return;
    }
    projectData = await resp.json();
  } catch (err) {
    projectTitleEl.innerText = "Error loading project";
    projectDescEl.innerText = err.message;
    projectBudgetEl.innerText = "-";
    projectStatusEl.innerText = "-";
    return;
  }

  // 5) Render project data
  projectTitleEl.innerText  = projectData.title;
  projectDescEl.innerText   = projectData.description || "— No description —";
  projectBudgetEl.innerText = projectData.budget.toFixed(2);
  projectStatusEl.innerText = projectData.status;

  // 6) If user is a freelancer and project is "open", render application form
  if (user && user.role === "freelancer" && projectData.status === "open") {
    let existingApp = null;
    try {
      const checkResp = await fetch(
        `${API_BASE}/api/applications/projects/${projectId}/applications/me`,
        {
          headers: { "Authorization": `Bearer ${getToken()}` }
        }
      );
      if (checkResp.ok) {
        existingApp = await checkResp.json();
      }
    } catch {
      existingApp = null;
    }

    // Render form
    applicationWrapper.innerHTML = `
      <div class="application-form" id="appFormContainer">
        <h3>${existingApp ? "Edit Application" : "Submit Application"}</h3>
        <div id="appMessage" class="message"></div>
        <form id="applicationFormElement">
          <div class="form-group">
            <label for="proposalText">Your proposal</label>
            <textarea id="proposalText" rows="4"
              placeholder="Describe your approach to the task…" required></textarea>
          </div>
          <div class="form-group">
            <label for="proposalPrice">Your price (₽)</label>
            <input type="number" id="proposalPrice" step="0.01" min="0.01"
                   placeholder="e.g., 100.00" required />
          </div>
          <button type="submit" class="primary-btn" id="submitAppBtn">
            ${existingApp ? "Update Application" : "Submit Application"}
          </button>
        </form>
      </div>
    `;

    // Pre-fill form if application exists
    if (existingApp) {
      document.getElementById("proposalText").value  = existingApp.proposal_text;
      document.getElementById("proposalPrice").value = existingApp.proposed_price;
    }

    // Handle form submission
    const applicationFormElem = document.getElementById("applicationFormElement");
    const appMessage          = document.getElementById("appMessage");
    const submitBtn           = document.getElementById("submitAppBtn");

    applicationFormElem.addEventListener("submit", async (e) => {
      e.preventDefault();
      appMessage.innerHTML = "";
      submitBtn.disabled = true;

      const proposalText  = document.getElementById("proposalText").value.trim();
      const proposalPrice = document.getElementById("proposalPrice").value.trim();

      if (!proposalText || !proposalPrice) {
        appMessage.innerHTML = `<p class="message error">Please fill in all fields.</p>`;
        submitBtn.disabled = false;
        return;
      }

      if (existingApp) {
        // Update application
        const body = {
          proposal_text: proposalText,
          proposed_price: parseFloat(proposalPrice),
        };
        try {
          const resp = await fetch(
            `${API_BASE}/api/applications/${existingApp.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
              },
              body: JSON.stringify(body)
            }
          );
          if (resp.ok) {
            appMessage.innerHTML = `<p class="message success">Application updated successfully!</p>`;
          } else {
            const errJson = await resp.json();
            const errMsg = errJson.detail || JSON.stringify(errJson);
            appMessage.innerHTML = `<p class="message error">Error: ${errMsg}</p>`;
          }
        } catch (networkError) {
          appMessage.innerHTML = `<p class="message error">Network error: ${networkError.message}</p>`;
        } finally {
          submitBtn.disabled = false;
        }

      } else {
        // Create new application
        const body = {
          proposal_text: proposalText,
          proposed_price: parseFloat(proposalPrice),
          status: "pending"
        };
        try {
          const resp = await fetch(
            `${API_BASE}/api/applications/projects/${projectId}/applications/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
              },
              body: JSON.stringify(body)
            }
          );
          if (resp.status === 201) {
            appMessage.innerHTML = `<p class="message success">Application submitted successfully!</p>`;
            Array.from(applicationFormElem.elements).forEach((el) => el.disabled = true);
          } else {
            const errJson = await resp.json();
            const errMsg = errJson.detail || JSON.stringify(errJson);
            appMessage.innerHTML = `<p class="message error">Error: ${errMsg}</p>`;
          }
        } catch (networkError) {
          appMessage.innerHTML = `<p class="message error">Network error: ${networkError.message}</p>`;
        } finally {
          submitBtn.disabled = false;
        }
      }
    });
  }
});
