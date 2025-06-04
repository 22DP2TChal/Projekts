// app/static/js/application.js

/**
 * Предполагается, что:
 * 1) URL страницы = http://…/projects/{project_id}
 * 2) common.js уже подключён и определяет API_BASE, getToken(), requireAuth(), logout()
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Разбор projectId из URL
  const pathParts = window.location.pathname.split("/");
  const projectId = parseInt(pathParts[pathParts.length - 1] 
                      || pathParts[pathParts.length - 2]);

  // Получаем ссылки на элементы DOM
  const projectTitleEl      = document.getElementById("projectTitle");
  const projectDescEl       = document.getElementById("projectDescription");
  const projectBudgetEl     = document.getElementById("projectBudget");
  const projectStatusEl     = document.getElementById("projectStatus");
  const appMessage          = document.getElementById("appMessage");
  const applicationForm     = document.getElementById("applicationForm");
  const applicationFormElem = document.getElementById("applicationFormElement");
  const submitBtn           = document.getElementById("submitAppBtn");

  // Обработчик “Выйти”
  document.getElementById("logoutBtn").addEventListener("click", () => {
    logout();
  });

  // 2) Проверка авторизации
  const userInfo = await requireAuth();
  if (!userInfo) return; // requireAuth() уже редиректит, если не авторизован

  // 3) Загрузка данных о проекте
  let projectData;
  try {
    const resp = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      headers: { "Authorization": `Bearer ${getToken()}` }
    });
    if (!resp.ok) {
      projectTitleEl.innerText = "Проект не найден";
      projectDescEl.innerText = "";
      projectBudgetEl.innerText = "-";
      projectStatusEl.innerText = "-";
      applicationForm.style.display = "none";
      return;
    }
    projectData = await resp.json();
  } catch (err) {
    projectTitleEl.innerText = "Ошибка загрузки проекта";
    projectDescEl.innerText = err.message;
    projectBudgetEl.innerText = "-";
    projectStatusEl.innerText = "-";
    applicationForm.style.display = "none";
    return;
  }

  // 4) Отображаем данные проекта
  projectTitleEl.innerText  = projectData.title;
  projectDescEl.innerText   = projectData.description || "— Нет описания —";
  projectBudgetEl.innerText = projectData.budget.toFixed(2);
  projectStatusEl.innerText = projectData.status;

  // Если проект закрыт — скрываем форму и выводим сообщение
  if (projectData.status !== "open") {
    applicationForm.style.display = "none";
    const info = document.createElement("p");
    info.className = "message info";
    info.innerText = "Нельзя подать заявку: проект закрыт.";
    appMessage.appendChild(info);
    return;
  }

  // 5) Проверяем, есть ли уже заявка у этого фрилансера
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
    // Если 404, оставляем existingApp = null
  } catch {
    existingApp = null;
  }

  // 6) Если заявка существует — настроим форму для редактирования
  if (existingApp) {
    // Заполняем форму текущими данными
    document.getElementById("proposalText").value  = existingApp.proposal_text;
    document.getElementById("proposalPrice").value = existingApp.proposed_price;

    // Меняем текст кнопки
    submitBtn.innerText = "Изменить заявку";

    // Вешаем единственный слушатель submit на редактирование
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

      // Собираем body для PUT: оставляем status прежним
      const body = {
        proposal_text: proposalText,
        proposed_price: parseFloat(proposalPrice),
        status: existingApp.status   // существующий статус (например, "pending")
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
          // Если пришла ошибка — показываем detail
          const errJson = await resp.json();
          const errMsg = errJson.detail || JSON.stringify(errJson);
          appMessage.innerHTML = `<p class="message error">Ошибка: ${errMsg}</p>`;
        }
      } catch (networkError) {
        appMessage.innerHTML = `<p class="message error">Сетевая ошибка: ${networkError.message}</p>`;
      } finally {
        submitBtn.disabled = false;
      }
    });

  } else {
    // 7) Если заявки нет — настраиваем форму для создания новой
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

      // Собираем body для POST: принудительно “pending”
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
          // После создания можно заблокировать форму:
          Array.from(applicationFormElem.elements).forEach((el) => {
            el.disabled = true;
          });
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
    });
  }
});
