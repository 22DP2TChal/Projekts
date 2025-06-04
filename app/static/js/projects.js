// app/static/js/projects.js

document.addEventListener("DOMContentLoaded", async () => {
  const navWelcome      = document.getElementById("navWelcome");
  const navLogoutBtn    = document.getElementById("navLogoutBtn");
  const projectsListDiv = document.getElementById("projectsList");
  const projectsMessage = document.getElementById("projectsMessage");

  const searchInput     = document.getElementById("searchInput");
  const statusFilter    = document.getElementById("statusFilter");

  let user = null;
  try {
    user = await requireAuth();
  } catch {
    // Гость может видеть список проектов без авторизации
  }

  if (user) {
    navWelcome.innerText = `Добро пожаловать, ${user.email}`;
    navLogoutBtn.style.display = "inline";
    navLogoutBtn.addEventListener("click", logout);
  }

  // Начальная загрузка проектов
  await loadProjects(user, "", "");

  // Дебаунс-функция для автоматического поиска/фильтрации
  let debounceTimer;
  function debounceLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const searchValue = searchInput.value.trim();
      const statusValue = statusFilter.value;
      await loadProjects(user, searchValue, statusValue);
    }, 300);
  }

  searchInput.addEventListener("input", debounceLoad);
  statusFilter.addEventListener("change", debounceLoad);

  // Основная функция загрузки и отрисовки списка проектов
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
        projectsListDiv.innerHTML = "<p>Проектов не найдено.</p>";
        return;
      }

      // Если работодатель, показываем только свои проекты
      if (user && user.role === "employer") {
        projects = projects.filter(proj => proj.employer_id === user.id);
      }

      for (const proj of projects) {
        const card = document.createElement("div");
        card.className = "card";
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

        // Если фрилансер и проект открыт — «Подать/Редактировать заявку»
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
          actionBtn.innerText = hasApplied ? "Редактировать заявку" : "Подать заявку";
          actionBtn.addEventListener("click", () => {
            window.location.href = `/projects/${proj.id}`;
          });
          buttonsContainer.appendChild(actionBtn);
        }

        // Гость — просто «Смотреть» (если проект открыт)
        if (!user || (user.role !== "employer" && user.role !== "freelancer")) {
          if (proj.status === "open") {
            const viewBtn = document.createElement("button");
            viewBtn.className = "primary-btn";
            viewBtn.innerText = "Смотреть";
            viewBtn.addEventListener("click", () => {
              window.location.href = `/projects/${proj.id}`;
            });
            buttonsContainer.appendChild(viewBtn);
          }
        }

        // Если работодатель — «Смотреть заявки», «Статистика» и селект для смены статуса
        if (user && user.role === "employer" && proj.employer_id === user.id) {
          // 1) Кнопка «Смотреть заявки»
          const viewAppsBtn = document.createElement("button");
          viewAppsBtn.className = "primary-btn";
          viewAppsBtn.innerText = "Смотреть заявки";
          viewAppsBtn.addEventListener("click", () => {
            window.location.href = `/projects/${proj.id}/applications`;
          });
          buttonsContainer.appendChild(viewAppsBtn);

          // 2) Кнопка «Статистика»
          const statsBtn = document.createElement("button");
          statsBtn.className = "primary-btn";
          statsBtn.style.marginLeft = "8px";
          statsBtn.innerText = "Статистика";
          statsBtn.addEventListener("click", async () => {
            try {
              const statsResp = await fetch(
                `${API_BASE}/api/projects/${proj.id}/stats`,
                { headers: { "Authorization": `Bearer ${getToken()}` } }
              );
              if (!statsResp.ok) throw new Error(`HTTP ${statsResp.status}`);
              const statsData = await statsResp.json();
              alert(
                `Проект "${proj.title}"\n` +
                `– Всего заявок: ${statsData.application_count}\n` +
                `– Средняя цена: ₽${statsData.avg_price.toFixed(2)}`
              );
            } catch (e) {
              alert(`Не удалось получить статистику: ${e.message}`);
            }
          });
          buttonsContainer.appendChild(statsBtn);

          // 3) Селект для смены статуса проекта
          const statusSelect = document.createElement("select");
          statusSelect.style.marginLeft = "8px";

          const statuses = [
            { value: "open",        label: "Открыт" },
            { value: "in_progress", label: "В работе" },
            { value: "closed",      label: "Закрыт" }
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
                statusSpan.innerHTML = `Статус: ${newStatus}`;
              } else {
                let errMsg = `HTTP ${resp.status}`;
                const contentType = resp.headers.get("content-type") || "";
                if (contentType.includes("application/json")) {
                  const errJson = await resp.json();
                  errMsg = JSON.stringify(errJson, null, 2);
                }
                alert(`Не удалось изменить статус:\n${errMsg}`);
                statusSelect.value = proj.status;
              }
            } catch (err) {
              alert(`Сетевая ошибка при изменении статуса: ${err.message}`);
              statusSelect.value = proj.status;
            }
          });

          buttonsContainer.appendChild(statusSelect);
        }

        projectsListDiv.appendChild(card);
      }

    } catch (err) {
      projectsMessage.classList.add("error");
      projectsMessage.innerText = `Ошибка при загрузке проектов: ${err.message}`;
      projectsMessage.style.display = "block";
    }
  }
});
