// app/static/js/projects.js

document.addEventListener("DOMContentLoaded", async () => {
  const navWelcome       = document.getElementById("navWelcome");
  const navLogoutBtn     = document.getElementById("navLogoutBtn");
  const projectsListDiv  = document.getElementById("projectsList");
  const projectsMessage  = document.getElementById("projectsMessage");
  const createWrapper    = document.getElementById("createProjectWrapper");
  const createForm       = document.getElementById("createProjectForm");
  const createMsg        = document.getElementById("createProjectMessage");

  // 1) Проверяем токен и получаем пользователя
  const user = await requireAuth();
  if (!user) return;  // requireAuth() сам сделает редирект, если токен невалидный

  navLogoutBtn.addEventListener("click", logout);

  // Признак того, что фронт может стилизовать в зависимости от роли
  document.body.classList.add(user.role);

  // 2) Загружаем и отрисовываем список проектов
  await loadProjects(user);

  // 3) Если роль = employer, показываем форму создания проекта
  if (user.role === "employer") {
    createWrapper.classList.remove("hidden");
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      createMsg.innerHTML = "";

      const title       = document.getElementById("projectTitle").value.trim();
      const description = document.getElementById("projectDescription").value.trim();
      const budget      = parseFloat(document.getElementById("projectBudget").value);

      try {
        const token = getToken();
        if (!token) throw new Error("Неавторизованный");

        const resp = await fetch(`${API_BASE}/api/projects/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ title, description, budget, status: "open" })
        });
        if (resp.ok) {
          const newProj = await resp.json();
          createMsg.innerHTML = `<p class="message success">Проект создан: ${newProj.title}</p>`;
          // Очищаем поля
          document.getElementById("projectTitle").value       = "";
          document.getElementById("projectDescription").value = "";
          document.getElementById("projectBudget").value      = "";
          // Перерисуем список
          await loadProjects(user);
        } else {
          const contentType = resp.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errJson = await resp.json();
            const errMsg = errJson.detail || JSON.stringify(errJson);
            createMsg.innerHTML = `<p class="message error">${errMsg}</p>`;
          } else {
            const text = await resp.text();
            const short = text.length > 200 ? text.slice(0, 200) + "…" : text;
            createMsg.innerHTML = `<p class="message error">Server error: ${short}</p>`;
          }
        }
      } catch (err) {
        createMsg.innerHTML = `<p class="message error">${err.message}</p>`;
      }
    });
  } else {
    createWrapper.classList.add("hidden");
  }
});


/**
 * Загрузка списка проектов и отрисовка в #projectsList.
 * Для каждого проекта, если роль === "freelancer", проверяем,
 * подавал ли уже текущий пользователь заявку, и деактивируем кнопку.
 */
async function loadProjects(user) {
  const projectsListDiv = document.getElementById("projectsList");
  const projectsMessage = document.getElementById("projectsMessage");
  projectsListDiv.innerHTML = "";
  projectsMessage.innerHTML = "";

  try {
    const resp = await fetch(`${API_BASE}/api/projects/`, {
      headers: { "Authorization": `Bearer ${getToken()}` }
    });
    if (!resp.ok) {
      throw new Error("Не удалось получить список проектов");
    }

    let projects = await resp.json();

    if (projects.length === 0) {
      projectsListDiv.innerHTML = "<p>Пока нет проектов.</p>";
      return;
    }

    // Если роль = "employer" – показываем только свои проекты (по желанию),
    // но сохраняем сортировку уже по времени (бэкенд должен вернуть их отсортированными):
    if (user.role === "employer") {
      projects = projects.filter(proj => proj.employer_id === user.id);
    }

    // -----------------------------------------
    // Основная идея: для каждого проекта, если роль=freelancer,
    // делаем запрос GET /api/applications/projects/{id}/applications/me,
    // чтобы узнать, есть ли у нас уже «своя» заявка на этот проект.
    // -----------------------------------------
    for (const proj of projects) {
      const card = document.createElement("div");
      card.className = "card";

      // Основной HTML-карточки (тело + футер)
      card.innerHTML = `
        <div class="card-header">${proj.title}</div>
        <div class="card-body">
          <p>${ proj.description || "<em>Без описания</em>" }</p>
          <p><strong>Бюджет:</strong> ₽${ proj.budget.toFixed(2) }</p>
        </div>
        <div class="card-footer">
          <span class="status">Статус: ${proj.status}</span>
          <div class="card-buttons"></div>
        </div>
      `;

      const buttonsContainer = card.querySelector(".card-buttons");

      // 1) Если фрилансер и проект открыт – по умолчанию добавляем кнопку
      if (user.role === "freelancer" && proj.status === "open") {
        // Сначала создаём кнопку, но НЕ добавляем её сразу:
        const applyBtn = document.createElement("button");
        applyBtn.className = "primary-btn";
        applyBtn.innerText = "Подать заявку";
        // Клик переводит на страницу деталей проекта:
        applyBtn.addEventListener("click", () => {
          window.location.href = `/projects/${proj.id}`;
        });

        // Проверяем, подавал ли текущий фрилансер заявку на этот проект:
        try {
          const checkResp = await fetch(
            `${API_BASE}/api/applications/projects/${proj.id}/applications/me`,
            { headers: { "Authorization": `Bearer ${getToken()}` } }
          );
          if (checkResp.status === 200) {
            // У фрилансера уже есть заявка → делаем кнопку неактивной
            applyBtn.innerText = "Заявка отправлена";
            // (CSS: button.primary-btn:disabled уже окрашивает её в серый)
          }
        } catch (err) {
          // Если любая сетевая или неожиданная ошибка – просто оставляем кнопку активной
        }

        buttonsContainer.appendChild(applyBtn);
      }

      // 2) Если работодатель и это его проект – добавляем «Смотреть заявки»
      if (user.role === "employer" && proj.employer_id === user.id) {
        const viewAppsBtn = document.createElement("button");
        viewAppsBtn.className = "primary-btn";
        viewAppsBtn.innerText = "Смотреть заявки";
        viewAppsBtn.addEventListener("click", () => {
          window.location.href = `/projects/${proj.id}/applications`;
        });
        buttonsContainer.appendChild(viewAppsBtn);
      }

      projectsListDiv.appendChild(card);
    }

  } catch (err) {
    projectsMessage.innerHTML = `<p class="message error">${err.message}</p>`;
  }
}
