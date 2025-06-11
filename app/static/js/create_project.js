document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const createForm = document.getElementById("createProjectForm");
  const messageDiv = document.getElementById("createProjectMessage");
  const titleInput = document.getElementById("projectTitle");
  const descriptionInput = document.getElementById("projectDescription");
  const budgetInput = document.getElementById("projectBudget");

  let user = null;
  try {
    user = await requireAuth();
  } catch {
    return;
  }

  logoutBtn.style.display = "inline";
  logoutBtn.addEventListener("click", logout);

  if (user.role !== "employer") {
    createForm.style.display = "none";
    messageDiv.classList.add("message", "error");
    messageDiv.innerText = "Only employers can create projects.";
    messageDiv.style.display = "block";
    return;
  }

  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageDiv.innerHTML = "";
    messageDiv.className = "message";
    messageDiv.style.display = "none";

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const budget = parseFloat(budgetInput.value);

    if (!title || isNaN(budget) || budget <= 0) {
      messageDiv.classList.add("error");
      messageDiv.innerText = "Please enter a valid title and budget.";
      messageDiv.style.display = "block";
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/projects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({ title, description, budget, status: "open" })
      });

      if (resp.ok) {
        const newProj = await resp.json();
        messageDiv.classList.add("message", "success");
        messageDiv.innerText = `Project created: ${newProj.title}`;
        messageDiv.style.display = "block";
        titleInput.value = "";
        descriptionInput.value = "";
        budgetInput.value = "";
        setTimeout(() => {
          window.location.href = "/projects";
        }, 2000);
      } else {
        const contentType = resp.headers.get("content-type") || "";
        let errMsg = "Unknown error";
        if (contentType.includes("application/json")) {
          const errJson = await resp.json();
          errMsg = errJson.detail || JSON.stringify(errJson);
        } else {
          errMsg = await resp.text();
        }
        messageDiv.classList.add("message", "error");
        messageDiv.innerText = errMsg;
        messageDiv.style.display = "block";
      }
    } catch (err) {
      messageDiv.classList.add("message", "error");
      messageDiv.innerText = `Network error: ${err.message}`;
      messageDiv.style.display = "block";
    }
  });
});
