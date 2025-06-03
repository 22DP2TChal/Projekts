

document.addEventListener("DOMContentLoaded", async () => {
  const appsMessage = document.getElementById("appsMessage");
  const cardsContainer = document.getElementById("cardsContainer");

  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Получаем projectId из URL: /projects/{id}/applications
  const pathParts = window.location.pathname.split("/");
  const projectId = pathParts[pathParts.length - 2];

  // 1) Проверяем авторизацию
  const userInfo = await requireAuth();
  if (!userInfo) return;

  // 2) Запрашиваем заявки по API
  try {
    const resp = await fetch(
      `${API_BASE}/api/applications/projects/${projectId}/applications/`,
      {
        headers: { "Authorization": `Bearer ${getToken()}` },
      }
    );

    // Обрабатываем возможные ошибки
    if (resp.status === 403) {
      const data = await resp.json();
      showMessage(data.detail || "Доступ запрещён", true);
      return;
    }
    if (resp.status === 404) {
      const data = await resp.json();
      showMessage(data.detail || "Проект не найден", true);
      return;
    }
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      const errText = data.detail || JSON.stringify(data) || resp.statusText;
      showMessage(`Ошибка: ${errText}`, true);
      return;
    }

    // Если вернулся 200 OK
    const applications = await resp.json();

    // 3) Если заявок нет — выводим информационное сообщение
    if (!applications || applications.length === 0) {
      showMessage("Пока нет заявок на этот проект.", false);
      return;
    }

    // 4) Рисуем карточки
    appsMessage.style.display = "none"; // прячем сообщение, если раньше было
    applications.forEach((app) => {
      const card = document.createElement("div");
      card.className = "app-card";

      // Заголовок карточки: ID и email фрилансера
      const header = document.createElement("div");
      header.className = "app-card-header";
      header.innerText = `Заявка #${app.id} от ${app.freelancer_email || app.freelancer_id}`;
      card.appendChild(header);

      // Основная часть: текст, цена, статус
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

      // Подвал карточки: дата создания
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
    cardsContainer.innerHTML = ""; // очищаем карточки, если они были
    appsMessage.innerText = text;
    appsMessage.classList.remove("error", "info");
    appsMessage.classList.add(isError ? "error" : "info");
    appsMessage.style.display = "block";
  }
});
