// app/static/js/projects.js

document.addEventListener("DOMContentLoaded", async () => {
  const navWelcome = document.getElementById("navWelcome");
  const navLogoutBtn = document.getElementById("navLogoutBtn");
  const projectsListDiv = document.getElementById("projectsList");
  const projectsMessage = document.getElementById("projectsMessage");
  const createWrapper = document.getElementById("createProjectWrapper");
  const createForm = document.getElementById("createProjectForm");
  const createMsg = document.getElementById("createProjectMessage");

  // 1) Проверяем токен и получаем пользователя
  const user = await requireAuth();
  console.log("[projects.js] requireAuth вернул:", user);
  if (!user) return;  // если токен не валиден, requireAuth() уже сделал редирект
  navWelcome.innerText = `Привет, ${user.email}!`;
  navLogoutBtn.addEventListener("click", logout);

  // 2) Загружаем список проектов
  await loadProjects(user);

  // 3) Если роль = employer, показываем форму создания и вешаем обработчик
  if (user.role === "employer") {
    createWrapper.classList.remove("hidden");

    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      createMsg.innerHTML = "";

      const title = document.getElementById("projectTitle").value.trim();
      const description = document.getElementById("projectDescription").value.trim();
      const budget = parseFloat(document.getElementById("projectBudget").value);

      try {
        const token = getToken();
        console.log("[projects.js] Создание проекта, токен =", token);
        if (!token) throw new Error("Неавторизованный");

        // POST /api/projects/
        const resp = await fetch(`${API_BASE}/api/projects/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ title, description, budget, status: "open" })
        });
        console.log("[projects.js] Ответ POST /api/projects/ статус =", resp.status);
        if (resp.ok) {
          const newProj = await resp.json();
          console.log("[projects.js] Новый проект =", newProj);
          createMsg.innerHTML = `<p class="success">Проект создан: ${newProj.title}</p>`;
          document.getElementById("projectTitle").value = "";
          document.getElementById("projectDescription").value = "";
          document.getElementById("projectBudget").value = "";
          await loadProjects(user);
        } else {
          const contentType = resp.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errJson = await resp.json();
            const errMsg = errJson.detail || JSON.stringify(errJson);
            console.log("[projects.js] Ошибка POST /api/projects/ (JSON) =", errJson);
            createMsg.innerHTML = `<p class="error">${errMsg}</p>`;
          } else {
            const text = await resp.text();
            console.log("[projects.js] Ошибка POST /api/projects/ (не JSON) =", text);
            const short = text.length > 200 ? text.slice(0, 200) + "…" : text;
            createMsg.innerHTML = `<p class="error">Server error: ${short}</p>`;
          }
        }
      } catch (err) {
        console.log("[projects.js] Exception при создании проекта =", err);
        createMsg.innerHTML = `<p class="error">${err.message}</p>`;
      }
    });
  } else {
    createWrapper.classList.add("hidden");
  }
});

/**
 * Загрузка списка проектов и отрисовка в #projectsList
 * @param {object} user — текущий залогиненный пользователь
 */
async function loadProjects(user) {
  const projectsListDiv = document.getElementById("projectsList");
  const projectsMessage = document.getElementById("projectsMessage");
  projectsListDiv.innerHTML = "";
  projectsMessage.innerHTML = "";

  try {
    console.log("[projects.js] Загрузка списка проектов…");
    const resp = await fetch(`${API_BASE}/api/projects/`, {
      headers: {
        "Authorization": `Bearer ${getToken()}`
      }
    });
    console.log("[projects.js] Ответ GET /api/projects/ статус =", resp.status);
    if (!resp.ok) {
      throw new Error("Не удалось получить список проектов");
    }
    const projects = await resp.json();
    console.log("[projects.js] Список проектов =", projects);

    if (projects.length === 0) {
      projectsListDiv.innerHTML = "<p>Пока нет проектов.</p>";
      return;
    }

    // ...внутри loadProjects(user) после получения массива projects:
  projects.forEach(proj => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-header">${proj.title}</div>
      <div class="card-body">
        <p>${proj.description || "<em>Без описания</em>"}</p>
        <p><strong>Бюджет:</strong> ₽${proj.budget.toFixed(2)}</p>
      </div>
      <div class="card-footer">
        <span class="status">Статус: ${proj.status}</span>
        <div>
          ${user.role === "freelancer" && proj.status === "open"
            ? `<button class="primary-btn" onclick="window.location.href='/projects/${proj.id}'">Подать заявку</button>`
            : ""}
          ${user.role === "employer" && proj.employer_id === user.id
            ? `<button class="primary-btn" onclick="window.location.href='/projects/${proj.id}/applications'">Смотреть заявки</button>`
            : ""}
        </div>
      </div>
    `;

    document.getElementById("projectsList").appendChild(card);
  });

  } catch (err) {
    console.log("[projects.js] Ошибка при загрузке проектов =", err);
    projectsMessage.innerHTML = `<p class="error">${err.message}</p>`;
  }
}
