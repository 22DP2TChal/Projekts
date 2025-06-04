// app/static/js/project_applications.js

document.addEventListener("DOMContentLoaded", async () => {
  const appsMessage    = document.getElementById("appsMessage");
  const cardsContainer = document.getElementById("appsGrid");
  const logoutBtn      = document.getElementById("logoutBtn");

  logoutBtn.addEventListener("click", logout);

  // 1) Получаем projectId из URL: /projects/{id}/applications
  const pathParts = window.location.pathname.split("/");
  // Например: ["", "projects", "123", "applications"]
  const projectId = pathParts[pathParts.length - 2];

  // 2) Проверяем авторизацию и получаем текущего пользователя
  const userInfo = await requireAuth();
  if (!userInfo) return; // если не авторизован, requireAuth() редиректит на /

  // 3) Запрашиваем список заявок через API
  try {
    const resp = await fetch(
      `${API_BASE}/api/applications/projects/${projectId}/applications/`,
      {
        headers: { "Authorization": `Bearer ${getToken()}` },
      }
    );

    // 3.a) Обработка ошибок сервера
    if (resp.status === 403) {
      const data = await resp.json().catch(() => ({}));
      showMessage(data.detail || "Доступ запрещён", true);
      return;
    }
    if (resp.status === 404) {
      const data = await resp.json().catch(() => ({}));
      showMessage(data.detail || "Проект не найден", true);
      return;
    }
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      showMessage(`Ошибка: ${data.detail || JSON.stringify(data)}`, true);
      return;
    }

    // 3.b) Если всё ок — рендерим карточки
    const applications = await resp.json();
    if (!applications || applications.length === 0) {
      showMessage("Пока нет заявок на этот проект.", false);
      return;
    }

    // Очищаем контейнер и скрываем сообщение
    cardsContainer.innerHTML = "";
    appsMessage.style.display = "none";

    // 4) Создаём карточку для каждой заявки
    applications.forEach((app) => {
      const card = document.createElement("div");
      card.className = "app-card";

      // 4.a) Заголовок: номер заявки и email/ID фрилансера
      const header = document.createElement("div");
      header.className = "app-card-header";
      header.innerText = `Заявка #${app.id} от ${app.freelancer_email || app.freelancer_id}`;
      card.appendChild(header);

      // 4.b) Тело карточки: текст, цена, статус
      const body = document.createElement("div");
      body.className = "app-card-body";

      // Текст предложения
      const pText = document.createElement("p");
      pText.innerHTML = `<span class="label">Предложение:</span> ${app.proposal_text}`;
      body.appendChild(pText);

      // Предложенная цена
      const pPrice = document.createElement("p");
      pPrice.innerHTML = `<span class="label">Цена:</span> ₽${parseFloat(app.proposed_price).toFixed(2)}`;
      body.appendChild(pPrice);

      // Статус
      const pStatus = document.createElement("p");
      pStatus.innerHTML = `<span class="label">Статус:</span> ${app.status}`;
      body.appendChild(pStatus);

      card.appendChild(body);

      // 4.c) Футер карточки: дата создания
      const footer = document.createElement("div");
      footer.className = "app-card-footer";
      let createdAt = "";
      if (app.created_at) {
        const dt = new Date(app.created_at);
        createdAt = dt.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      footer.innerText = `Создано: ${createdAt}`;
      card.appendChild(footer);

      cardsContainer.appendChild(card);
    });
  } catch (err) {
    showMessage(`Сетевая ошибка: ${err.message}`, true);
  }

  // Вспомогательная функция для показа сообщений
  function showMessage(text, isError) {
    cardsContainer.innerHTML = "";
    appsMessage.innerText = text;
    appsMessage.classList.remove("error", "info");
    appsMessage.classList.add(isError ? "error" : "info");
    appsMessage.style.display = "block";
  }
});
