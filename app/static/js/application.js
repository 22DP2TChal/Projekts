// app/static/js/application.js

/**
 * Для этого скрипта предполагается:
 * 1) URL страницы имеет формат http://127.0.0.1:8000/projects/{project_id}
 * 2) common.js уже подключён и определяет API_BASE, saveToken(), getToken(), requireAuth(), logout()
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Получаем project_id из URL: например, /projects/123
  const pathParts = window.location.pathname.split("/");
  const projectId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

  const projectTitleEl = document.getElementById("projectTitle");
  const projectDescEl = document.getElementById("projectDescription");
  const projectBudgetEl = document.getElementById("projectBudget");
  const projectStatusEl = document.getElementById("projectStatus");

  const appMessage = document.getElementById("appMessage");
  const applicationForm = document.getElementById("applicationForm");
  const submitBtn = document.getElementById("submitAppBtn");

  // При клике "Выйти"
  document.getElementById("logoutBtn").addEventListener("click", () => {
    logout();
  });

  // 1) Сначала проверим авторизацию: если не авторизован, редиректит на /
  const userInfo = await requireAuth();
  if (!userInfo) {
    // requireAuth уже перенаправит, если пользователь не авторизован
    return;

  
  }

  // 2) Загружаем данные о проекте (через API)
  let projectData;
  try {
    const resp = await fetch(`${API_BASE}/api/projects/${projectId}`);
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

  // 3) Заполняем карточку проекта
  projectTitleEl.innerText = projectData.title;
  projectDescEl.innerText = projectData.description || "— Нет описания —";
  projectBudgetEl.innerText = projectData.budget.toFixed(2);
  projectStatusEl.innerText = projectData.status;

  // Если проект не "open", скрываем форму и показываем сообщение
 if (projectData.status !== "open") {
    applicationForm.style.display = "none";
    const msg = document.createElement("p");
    msg.className = "message";
    msg.innerText = "Нельзя подать заявку: проект закрыт.";
    appMessage.appendChild(msg);
    return;
  }
   // 3.1) Кнопка «Смотреть заявки» (для работодателя)
  if (userInfo.role === "employer" && userInfo.id === projectData.employer_id) {
    const appsBtn = document.createElement("button");
    appsBtn.innerText = "Смотреть заявки";
    appsBtn.style.marginBottom = "16px";
    appsBtn.addEventListener("click", () => {
      window.location.href = `/projects/${projectId}/applications`;
    });
    const projectCard = document.getElementById("projectCard");
    projectCard.insertAdjacentElement("beforebegin", appsBtn);
  }


 

 
  // 4) Проверяем, подавал ли этот фрилансер уже заявку на этот проект
  try {
    const meResp = await fetch(
      `${API_BASE}/api/applications/projects/${projectId}/applications/me`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );
    if (meResp.ok) {
      // Если 200, значит заявка уже есть
      appMessage.innerHTML = `<p class="message error">You have already applied to this project</p>`;
      // Делаем все поля формы неактивными:
      Array.from(applicationForm.elements).forEach((el) => {
        el.disabled = true;
      });
      return;
    }
    // Если 404, значит заявки нет — показываем форму ниже
    if (meResp.status !== 404) {
      // Если получили что-то отличное от 200 и 404, показываем ошибку:
      const errJson = await meResp.json();
      appMessage.innerHTML = `<p class="message error">Ошибка проверки заявки: ${errJson.detail || JSON.stringify(errJson)}</p>`;
      Array.from(applicationForm.elements).forEach((el) => {
        el.disabled = true;
      });
      return;
    }
    // Если меResp.status == 404, значит заявки нет — оставляем форму активной
  } catch (err) {
    appMessage.innerHTML = `<p class="message error">Network error при проверке заявки: ${err.message}</p>`;
    Array.from(applicationForm.elements).forEach((el) => {
      el.disabled = true;
    });
    return;
  }

  // 5) Обработка submit формы (только если заявки ещё не было)
  applicationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    appMessage.innerHTML = "";   // очистили старые сообщения
    submitBtn.disabled = true;   // блокируем кнопку, пока идёт запрос

    const proposalText = document.getElementById("proposalText").value.trim();
    const proposalPrice = document.getElementById("proposalPrice").value.trim();
    if (!proposalText || !proposalPrice) {
      appMessage.innerHTML = `<p class="message error">Пожалуйста, заполните все поля</p>`;
      submitBtn.disabled = false;
      return;
    }

    const body = {
      proposal_text: proposalText,
      proposed_price: parseFloat(proposalPrice),
      status: "pending", // при создании заявка уходит в статус "pending"
    };

    try {
      const resp = await fetch(
        `${API_BASE}/api/applications/projects/${projectId}/applications/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (resp.status === 201) {
        appMessage.innerHTML = `<p class="message success">Заявка успешно отправлена!</p>`;
        applicationForm.reset();
        // После успешной отправки делаем поля неактивными:
        Array.from(applicationForm.elements).forEach((el) => {
          el.disabled = true;
        });
      } else {
        const errJson = await resp.json();
        const errMsg = errJson.detail || JSON.stringify(errJson);
        appMessage.innerHTML = `<p class="message error">Ошибка: ${errMsg}</p>`;
        submitBtn.disabled = false;
      }
    } catch (networkError) {
      appMessage.innerHTML = `<p class="message error">Network error: ${networkError.message}</p>`;
      submitBtn.disabled = false;
    }
  });
});
