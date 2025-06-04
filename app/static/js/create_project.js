// app/static/js/create_project.js

document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn        = document.getElementById("logoutBtn");
  const createForm       = document.getElementById("createProjectForm");
  const messageDiv       = document.getElementById("createProjectMessage");
  const titleInput       = document.getElementById("projectTitle");
  const descriptionInput = document.getElementById("projectDescription");
  const budgetInput      = document.getElementById("projectBudget");

  // 1) Проверяем авторизацию и получаем пользователя
  let user = null;
  try {
    user = await requireAuth(); // если не авторизован, редиректит на "/"
  } catch {
    return;
  }

  // 2) Показываем кнопку «Выйти»
  logoutBtn.style.display = "inline";
  logoutBtn.addEventListener("click", logout);

  // 3) Проверяем роль — только employer
  if (user.role !== "employer") {
    createForm.style.display = "none";
    messageDiv.classList.add("message", "error");
    messageDiv.innerText = "Только работодатели могут создавать проекты.";
    messageDiv.style.display = "block";
    return;
  }

  // 4) Обработчик отправки формы
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageDiv.innerHTML = "";
    messageDiv.className = "message";
    messageDiv.style.display = "none";

    const title       = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const budget      = parseFloat(budgetInput.value);

    if (!title || isNaN(budget) || budget <= 0) {
      messageDiv.classList.add("error");
      messageDiv.innerText = "Пожалуйста, введите корректные заголовок и бюджет.";
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
        messageDiv.innerText = `Проект создан: ${newProj.title}`;
        messageDiv.style.display = "block";
        // Очищаем поля
        titleInput.value = "";
        descriptionInput.value = "";
        budgetInput.value = "";
        // Через пару секунд можно перенаправить на список проектов
        setTimeout(() => {
          window.location.href = "/projects";
        }, 2000);
      } else {
        const contentType = resp.headers.get("content-type") || "";
        let errMsg = "Неизвестная ошибка";
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
      messageDiv.innerText = `Сетевая ошибка: ${err.message}`;
      messageDiv.style.display = "block";
    }
  });
});
