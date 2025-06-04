// app/static/js/application.js

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Разбор projectId из URL
  const pathParts = window.location.pathname.split("/");
  const projectId = parseInt(pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2]);

  // 2) Ссылки на DOM-элементы
  const projectTitleEl  = document.getElementById("projectTitle");
  const projectDescEl   = document.getElementById("projectDescription");
  const projectBudgetEl = document.getElementById("projectBudget");
  const projectStatusEl = document.getElementById("projectStatus");

  const applicationWrapper = document.getElementById("applicationWrapper");
  const logoutBtn          = document.getElementById("logoutBtn");

  // 3) Проверка токена — если есть валидный, получаем user, иначе user = null
  let user = null;
  try {
    user = await requireAuth(); // если нет токена или он невалиден: сюда упадёт и мы оставим user = null
  } catch {
    user = null;
  }

  if (user) {
    logoutBtn.style.display = "inline";
    logoutBtn.addEventListener("click", logout);
  }

  // 4) Загружаем данные о проекте (доступно любому)
  let projectData;
  try {
    const resp = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      headers: user ? { "Authorization": `Bearer ${getToken()}` } : {}
    });
    if (!resp.ok) {
      projectTitleEl.innerText = "Проект не найден";
      projectDescEl.innerText = "";
      projectBudgetEl.innerText = "-";
      projectStatusEl.innerText = "-";
      return; // Ранний выход: больше ничего не рисуем
    }
    projectData = await resp.json();
  } catch (err) {
    projectTitleEl.innerText = "Ошибка загрузки проекта";
    projectDescEl.innerText = err.message;
    projectBudgetEl.innerText = "-";
    projectStatusEl.innerText = "-";
    return;
  }

  // 5) Выводим данные
  projectTitleEl.innerText  = projectData.title;
  projectDescEl.innerText   = projectData.description || "— Нет описания —";
  projectBudgetEl.innerText = projectData.budget.toFixed(2);
  projectStatusEl.innerText = projectData.status;

  // 6) Если пользователь — фрилансер и проект «open», отрисовываем форму подачи/редактирования
  if (user && user.role === "freelancer" && projectData.status === "open") {
    // Проверим, подавал ли уже заявку
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
    } catch { existingApp = null; }

    // Создадим форму (appendChild), либо «редактировать», либо «новая»
    applicationWrapper.innerHTML = `
      <div class="application-form" id="appFormContainer">
        <h3>${existingApp ? "Редактировать заявку" : "Подать заявку"}</h3>
        <div id="appMessage" class="message"></div>
        <form id="applicationFormElement">
          <div class="form-group">
            <label for="proposalText">Ваше предложение</label>
            <textarea id="proposalText" rows="4"
              placeholder="Опишите своё видение задачи…" required></textarea>
          </div>
          <div class="form-group">
            <label for="proposalPrice">Ваша цена (₽)</label>
            <input type="number" id="proposalPrice" step="0.01" min="0.01"
                   placeholder="Например, 100.00" required />
          </div>
          <button type="submit" class="primary-btn" id="submitAppBtn">
            ${existingApp ? "Изменить заявку" : "Отправить заявку"}
          </button>
        </form>
      </div>
    `;

    // Заполним, если уже была заявка
    if (existingApp) {
      document.getElementById("proposalText").value  = existingApp.proposal_text;
      document.getElementById("proposalPrice").value = existingApp.proposed_price;
    }

    // Вешаем обработчик на submit
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
        appMessage.innerHTML = `<p class="message error">Пожалуйста, заполните все поля</p>`;
        submitBtn.disabled = false;
        return;
      }

      if (existingApp) {
        // PUT-запрос на изменение
        const body = {
          proposal_text: proposalText,
          proposed_price: parseFloat(proposalPrice),
          // статус оставляем прежним
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
            appMessage.innerHTML = `<p class="message success">Заявка успешно изменена!</p>`;
          } else {
            const errJson = await resp.json();
            const errMsg = errJson.detail || JSON.stringify(errJson);
            appMessage.innerHTML = `<p class="message error">Ошибка: ${errMsg}</p>`;
          }
        } catch (networkError) {
          appMessage.innerHTML = `<p class="message error">Сетевая ошибка: ${networkError.message}</p>`;
        } finally {
          submitBtn.disabled = false;
        }

      } else {
        // POST-запрос на создание новой заявки
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
            appMessage.innerHTML = `<p class="message success">Заявка успешно отправлена!</p>`;
            // Блокируем поля формы
            Array.from(applicationFormElem.elements).forEach((el) => el.disabled = true);
          } else {
            const errJson = await resp.json();
            const errMsg = errJson.detail || JSON.stringify(errJson);
            appMessage.innerHTML = `<p class="message error">Ошибка: ${errMsg}</p>`;
          }
        } catch (networkError) {
          appMessage.innerHTML = `<p class="message error">Сетевая ошибка: ${networkError.message}</p>`;
        } finally {
          submitBtn.disabled = false;
        }
      }
    });
  }
});
