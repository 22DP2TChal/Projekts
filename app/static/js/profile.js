// app/static/js/profile.js

document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn       = document.getElementById("logoutBtn");
  const profileContent  = document.getElementById("profileContent");
  const profileMessage  = document.getElementById("profileMessage");

  // Получаем user_id из URL: /users/{user_id}/profile
  const pathParts = window.location.pathname.split("/");
  // ["", "users", "{user_id}", "profile"]
  const userId = parseInt(pathParts[pathParts.length - 2]);

  // 1) Отрисовываем кнопку “Выйти” только если залогинен
  try {
    const currentUser = await requireAuth(); // если нет токена → редирект на "/"
    logoutBtn.style.display = "inline";
    logoutBtn.addEventListener("click", logout);
  } catch {
    // если гость, просто скрываем кнопку
    logoutBtn.style.display = "none";
  }

  // 2) Запрашиваем данные пользователя из API
  try {
    const resp = await fetch(`${API_BASE}/api/users/${userId}`, {
      // public endpoint? Если этот маршрут защищён, придётся удалить защищающую зависимость get_current_active_user
      // у API-роута. Предположим, что /api/users/{id} доступен всем.
      // Если /api/users/{id} требует авторизации — удалите Depends(get_current_active_user) в routers/users.py
      // или сделайте защищённым только /api/users/me.
    });

    if (!resp.ok) {
      if (resp.status === 404) {
        profileMessage.classList.add("message", "error");
        profileMessage.innerText = "Пользователь не найден.";
        profileMessage.style.display = "block";
      } else {
        profileMessage.classList.add("message", "error");
        profileMessage.innerText = `Ошибка при загрузке: ${resp.status}`;
        profileMessage.style.display = "block";
      }
      profileContent.innerHTML = "";
      return;
    }

    const userData = await resp.json();
    // Пример структуры userData: { "id": 3, "email": "user@example.com", "role": "freelancer", "status": "active" }

    // 3) Рендерим информацию о пользователе:
    profileContent.innerHTML = `
      <div class="profile-field">
        <span class="profile-label">ID:</span> ${userData.id}
      </div>
      <div class="profile-field">
        <span class="profile-label">Email:</span> ${userData.email}
      </div>
      <div class="profile-field">
        <span class="profile-label">Роль:</span> ${userData.role}
      </div>
      <div class="profile-field">
        <span class="profile-label">Статус:</span> ${userData.status}
      </div>
    `;

  } catch (err) {
    profileMessage.classList.add("message", "error");
    profileMessage.innerText = `Сетевая ошибка: ${err.message}`;
    profileMessage.style.display = "block";
    profileContent.innerHTML = "";
  }
});
