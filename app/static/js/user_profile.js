// app/static/js/user_profile.js

document.addEventListener("DOMContentLoaded", async () => {
  const leaveReviewWrapper = document.getElementById("leaveReviewWrapper");
  const leaveReviewForm    = document.getElementById("leaveReviewForm");
  const leaveReviewMsg     = document.getElementById("leaveReviewMessage");
  const userReviewsSection = document.querySelector(".reviews-section");
  const userReviewsList    = document.getElementById("userReviewsList");
  const navLogo            = document.getElementById("navLogo");
  const navWelcome         = document.getElementById("navWelcome");
  const navLogoutBtn       = document.getElementById("navLogoutBtn");
  const profileContent     = document.getElementById("profileContent");

  // 1) Гибкий разбор userId: ищем последний сегмент пути, который является числом
  const parts = window.location.pathname.split("/");
  let userId = null;
  for (let i = parts.length - 1; i >= 0; i--) {
    const n = parseInt(parts[i]);
    if (!isNaN(n)) {
      userId = n;
      break;
    }
  }
  if (userId === null) {
    console.error("Не удалось извлечь ID пользователя из URL:", window.location.pathname);
    profileContent.innerHTML = "<p>Неверный адрес профиля.</p>";
    // Скрываем весь раздел отзывов
    if (userReviewsSection) userReviewsSection.style.display = "none";
    return;
  }

  // 2) Узнаём currentUser (если нет токена, requireAuth() редиректит на "/")
 let currentUser = null;
  try {
    currentUser = await requireAuth();

    if (navLogo) {
      // Если текущий URL содержит "/users/{что-то}/profile" — ведём на /projects
      if (window.location.pathname.includes("/profile")) {
        navLogo.href = "/projects";
      } else {
        // Иначе ставим ссылку на профиль текущего пользователя
        navLogo.href = `/users/${currentUser.id}/profile`;
      }
    }
  } catch {
    // Гость
    navLogoutBtn.style.display = "none";
    navWelcome.innerText = "";
  }

  // Переменная для хранения роли целевого пользователя
  let targetRole = null;

  // 3) Загружаем данные профиля (GET /api/users/{userId})
  async function loadUserProfile() {
    profileContent.innerHTML = "<p>Загрузка профиля…</p>";
    try {
      const resp = await fetch(`${API_BASE}/api/users/${userId}`, {
        headers: currentUser ? { "Authorization": `Bearer ${getToken()}` } : {}
      });
      if (!resp.ok) {
        if (resp.status === 404) {
          profileContent.innerHTML = "<p>Пользователь не найден.</p>";
          // Скрываем раздел отзывов и форму
          if (userReviewsSection) userReviewsSection.style.display = "none";
          return false; // сигнализируем, что пользователя нет
        } else {
          profileContent.innerHTML = `<p>Ошибка ${resp.status} при загрузке профиля.</p>`;
          if (userReviewsSection) userReviewsSection.style.display = "none";
          return false;
        }
      }
      const userData = await resp.json();
      // Сохраняем роль целевого пользователя
      targetRole = userData.role;
      profileContent.innerHTML = `
        <div class="profile-field"><strong>ID:</strong> ${userData.id}</div>
        <div class="profile-field"><strong>Email:</strong> ${userData.email}</div>
        <div class="profile-field"><strong>Роль:</strong> ${userData.role}</div>
        <div class="profile-field"><strong>Статус:</strong> ${userData.status}</div>
        <div class="profile-field"><strong>О себе:</strong> ${userData.about || "<em>– не указано –</em>"}</div>
      `;
      return true; // пользователь успешно загружен
    } catch (err) {
      profileContent.innerHTML = `<p>Сетевая ошибка: ${err.message}</p>`;
      if (userReviewsSection) userReviewsSection.style.display = "none";
      return false;
    }
  }
  const profileExists = await loadUserProfile();
  if (!profileExists) return;

  // 4) Загружаем все отзывы (GET /api/users/{userId}/reviews/)
  async function loadAllReviews() {
    userReviewsList.innerHTML = "<p>Загрузка отзывов…</p>";
    try {
      const resp = await fetch(`${API_BASE}/api/users/${userId}/reviews/`, {
        headers: currentUser ? { "Authorization": `Bearer ${getToken()}` } : {}
      });
      if (!resp.ok) {
        if (resp.status === 404) {
          userReviewsList.innerHTML = "<p>Пользователь не найден. Нельзя загрузить отзывы.</p>";
        } else {
          userReviewsList.innerHTML = `<p>Ошибка ${resp.status} при загрузке отзывов.</p>`;
        }
        return;
      }
      const reviews = await resp.json();
      if (!reviews.length) {
        userReviewsList.innerHTML = "<p>Пока нет отзывов об этом пользователе.</p>";
        return;
      }
      userReviewsList.innerHTML = "";
      reviews.forEach(r => {
        const card = document.createElement("div");
        card.className = "review-card";
        card.style = `
          padding: 12px;
          margin-bottom: 12px;
          background: var(--color-card-bg);
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-light);
        `;
        const authorLine = document.createElement("p");
        authorLine.innerHTML = `<strong>Отзыв от пользователя #${r.reviewer_id}:</strong>`;
        card.appendChild(authorLine);
        const ratingLine = document.createElement("p");
        ratingLine.innerHTML = `<span class="label">Рейтинг:</span> ${r.rating}`;
        card.appendChild(ratingLine);
        if (r.comment) {
          const commentLine = document.createElement("p");
          commentLine.innerHTML = `<span class="label">Комментарий:</span> ${r.comment}`;
          card.appendChild(commentLine);
        }
        const dateLine = document.createElement("small");
        const dt = new Date(r.created_at);
        dateLine.innerText = `Дата: ${dt.toLocaleDateString("ru-RU")} ${dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
        card.appendChild(dateLine);
        userReviewsList.appendChild(card);
      });
    } catch (err) {
      userReviewsList.innerHTML = `<p>Сетевая ошибка при загрузке отзывов: ${err.message}</p>`;
    }
  }
  await loadAllReviews();

  // 5) Если гость — показываем сообщение и выходим
  if (!currentUser) {
    const info = document.createElement("p");
    info.innerText = "Только зарегистрированные пользователи могут оставлять отзывы.";
    userReviewsList.parentNode.insertBefore(info, leaveReviewWrapper);
    // Скрываем форму
    leaveReviewWrapper.style.display = "none";
    return;
  }

  // 6) Нельзя оставить отзыв самому себе
  if (currentUser.id === userId) {
    leaveReviewWrapper.style.display = "none";
    return;
  }

  // 7) Нельзя, если роли совпадают
  if (currentUser.role === targetRole) {
    leaveReviewWrapper.style.display = "none";
    const info = document.createElement("p");
    info.className = "message info";
    info.innerText = "Нельзя оставлять отзыв пользователям вашей же роли.";
    userReviewsList.parentNode.insertBefore(info, leaveReviewWrapper);
    return;
  }

  // 8) Проверяем, оставлял ли currentUser уже отзыв этому пользователю
  try {
    const resp = await fetch(`${API_BASE}/api/users/${userId}/reviews/me`, {
      headers: { "Authorization": `Bearer ${getToken()}` }
    });
    if (resp.ok) {
      const myReview = await resp.json();
      leaveReviewWrapper.style.display = "none";
      const info = document.createElement("p");
      info.className = "message info";
      info.innerText = `Вы уже оставили отзыв (рейтинг ${myReview.rating}).`;
      userReviewsList.parentNode.insertBefore(info, leaveReviewWrapper);
    } else if (resp.status === 404) {
      // Нет предыдущего отзыва — показываем форму
      leaveReviewWrapper.style.display = "block";
    } else {
      // Другая ошибка — скрываем форму
      console.error("Ошибка при проверке вашего отзыва:", resp.status);
      leaveReviewWrapper.style.display = "none";
      const errInfo = document.createElement("p");
      errInfo.innerText = "Не удалось проверить возможность оставить отзыв.";
      userReviewsList.parentNode.insertBefore(errInfo, leaveReviewWrapper);
    }
  } catch (err) {
    console.error("Сетевая ошибка при проверке существующего отзыва:", err);
    leaveReviewWrapper.style.display = "none";
  }

  // 9) Сабмит формы “Оставить отзыв” (POST /api/users/{userId}/reviews/)
  leaveReviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    leaveReviewMsg.style.display = "none";

    const rating  = parseInt(document.getElementById("reviewRating").value);
    const comment = document.getElementById("reviewComment").value.trim();

    if (!rating || rating < 1 || rating > 5) {
      leaveReviewMsg.className = "message error";
      leaveReviewMsg.innerText = "Выберите корректный рейтинг (от 1 до 5).";
      leaveReviewMsg.style.display = "block";
      return;
    }

    const body = { rating: rating, comment: comment || null };

    try {
      const resp = await fetch(`${API_BASE}/api/users/${userId}/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify(body)
      });

      if (resp.status === 201) {
        leaveReviewMsg.className = "message success";
        leaveReviewMsg.innerText = "Спасибо! Ваш отзыв опубликован.";
        leaveReviewMsg.style.display = "block";
        Array.from(leaveReviewForm.elements).forEach(el => el.disabled = true);
        await loadAllReviews();
      } else {
        const contentType = resp.headers.get("content-type") || "";
        let errMsg = `Ошибка: HTTP ${resp.status}`;
        if (contentType.includes("application/json")) {
          const errJson = await resp.json();
          errMsg = errJson.detail || JSON.stringify(errJson);
        } else {
          const text = await resp.text();
          if (text) errMsg = text;
        }
        leaveReviewMsg.className = "message error";
        leaveReviewMsg.innerText = errMsg;
        leaveReviewMsg.style.display = "block";
      }
    } catch (networkError) {
      leaveReviewMsg.className = "message error";
      leaveReviewMsg.innerText = `Сетевая ошибка: ${networkError.message}`;
      leaveReviewMsg.style.display = "block";
    }
  });
});
