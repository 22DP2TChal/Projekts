// app/static/js/user_profile.js

document.addEventListener("DOMContentLoaded", async () => {
  // ── Навигационные элементы ───────────────────────────────────────────────
  const navLogo            = document.getElementById("navLogo");
  const navWelcome         = document.getElementById("navWelcome");
  const navLogoutBtn       = document.getElementById("navLogoutBtn");

  // ── Элементы профиля ─────────────────────────────────────────────────────
  const profileContent     = document.getElementById("profileContent");
  const editProfileWrapper = document.getElementById("editProfileWrapper");
  const editProfileForm    = document.getElementById("editProfileForm");
  const aboutText          = document.getElementById("aboutText");
  const tagsInput          = document.getElementById("tagsInput");
  const editProfileMsg     = document.getElementById("editProfileMessage");

  // ── Элементы раздела отзывов ─────────────────────────────────────────────
  const userReviewsSection = document.querySelector(".reviews-section");
  const userReviewsList    = document.getElementById("userReviewsList");
  const leaveReviewWrapper = document.getElementById("leaveReviewWrapper");
  const leaveReviewForm    = document.getElementById("leaveReviewForm");
  const leaveReviewMsg     = document.getElementById("leaveReviewMessage");

  // 1) Извлекаем userId из URL: /users/{id}/profile
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
    profileContent.innerHTML = "<p>Неверный адрес профиля.</p>";
    if (userReviewsSection) userReviewsSection.style.display = "none";
    if (editProfileWrapper) editProfileWrapper.style.display = "none";
    return;
  }

  // 2) Получаем currentUser: если не залогинен → редирект
  let currentUser = null;
  try {
    currentUser = await requireAuth();
    navLogoutBtn.style.display = "inline";
    navLogoutBtn.addEventListener("click", logout);
    navWelcome.innerText = `Привет, ${currentUser.email}`;
    if (navLogo && window.location.pathname.includes("/profile")) {
      navLogo.href = "/projects";
    }
  } catch {
    navLogoutBtn.style.display = "none";
    navWelcome.innerText = "";
  }

  // 3) Загружаем профиль пользователя: GET /api/users/{userId}
  let targetUser = null;
  try {
    profileContent.innerHTML = "<p>Загрузка профиля…</p>";
    const resp = await fetch(`${API_BASE}/api/users/${userId}`, {
      headers: currentUser ? { "Authorization": `Bearer ${getToken()}` } : {}
    });
    if (!resp.ok) {
      if (resp.status === 404) {
        profileContent.innerHTML = "<p>Пользователь не найден.</p>";
      } else {
        profileContent.innerHTML = `<p>Ошибка ${resp.status} при загрузке профиля.</p>`;
      }
      if (userReviewsSection) userReviewsSection.style.display = "none";
      if (editProfileWrapper) editProfileWrapper.style.display = "none";
      return;
    }
    targetUser = await resp.json();
    // Рендерим данные профиля, включая tags (массив объектов)
    // Собираем строку из targetUser.tags: ["Python","FastAPI"] → "Python, FastAPI"
    const tagsArray = Array.isArray(targetUser.tags)
      ? targetUser.tags.map(t => t.name)
      : [];
    const tagsString = tagsArray.join(", ");

    profileContent.innerHTML = `
      <div class="profile-field"><span class="label">ID:</span> ${targetUser.id}</div>
      <div class="profile-field"><span class="label">Email:</span> ${targetUser.email}</div>
      <div class="profile-field"><span class="label">Роль:</span> ${targetUser.role}</div>
      <div class="profile-field"><span class="label">Статус:</span> ${targetUser.status}</div>
      <div class="profile-field"><span class="label">О себе:</span> ${(targetUser.about) ? targetUser.about : "<em>– не указано –</em>"}</div>
      <div class="profile-field"><span class="label">Теги:</span> ${(tagsArray.length) ? tagsString : "<em>– нет тегов –</em>"}</div>
    `;

    // Заполняем поля формы «Редактировать профиль»
    if (aboutText && typeof targetUser.about !== "undefined") {
      aboutText.value = targetUser.about;
    }
    if (tagsInput) {
      tagsInput.value = tagsString; // строка через запятую
    }
  } catch (err) {
    profileContent.innerHTML = `<p>Сетевая ошибка: ${err.message}</p>`;
    if (userReviewsSection) userReviewsSection.style.display = "none";
    if (editProfileWrapper) editProfileWrapper.style.display = "none";
    return;
  }

  // 4) Показываем форму редактирования только если:
  //    – текущий пользователь — фрилансер (role === "freelancer")
  //    – и он просматривает СВОЙ профиль (currentUser.id === userId)
  if (currentUser 
      && currentUser.role === "freelancer" 
      && currentUser.id === userId) {
    if (editProfileWrapper) {
      editProfileWrapper.style.display = "block";
    }
  } else {
    if (editProfileWrapper) {
      editProfileWrapper.style.display = "none";
    }
  }

  // 5) Обработка сабмита формы «Редактировать профиль»
  if (editProfileForm) {
    editProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      editProfileMsg.style.display = "none";

      const newAbout = aboutText.value.trim();
      // Разбиваем строку "Python, FastAPI" → ["Python","FastAPI"]
      const newTags  = tagsInput.value
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Собираем данные в body
      const bodyData = {
        about: newAbout,
        tags:  newTags        // массив строк
      };

      try {
        const resp = await fetch(`${API_BASE}/api/users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
          },
          body: JSON.stringify(bodyData)
        });
        if (resp.ok) {
          const updated = await resp.json();

          // Обновляем “О себе” и “Теги” в profileContent
          const fields = profileContent.querySelectorAll(".profile-field");
          // fields[4] — “О себе”, fields[5] — “Теги”
          if (fields.length >= 6) {
            fields[4].innerHTML = `<span class="label">О себе:</span> ${(updated.about) ? updated.about : "<em>– не указано –</em>"}`;
            // Собираем строку из updated.tags (массив объектов {id,name})
            const updatedTagsArr    = Array.isArray(updated.tags) ? updated.tags.map(t => t.name) : [];
            const updatedTagsString = updatedTagsArr.join(", ");
            fields[5].innerHTML = `<span class="label">Теги:</span> ${updatedTagsArr.length ? updatedTagsString : "<em>– нет тегов –</em>"}`;
          }

          // Обновляем значения полей формы, чтобы сохранить их в том виде, как вернул сервер
          aboutText.value = updated.about || "";
          tagsInput.value = (updated.tags || []).map(t => t.name).join(", ");

          editProfileMsg.className = "message success";
          editProfileMsg.innerText = "Профиль успешно обновлён.";
          editProfileMsg.style.display = "block";
        } else {
          let errMsg = `Ошибка ${resp.status}`;
          const contentType = resp.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await resp.json();
            errMsg = data.detail || JSON.stringify(data);
          }
          editProfileMsg.className = "message error";
          editProfileMsg.innerText = errMsg;
          editProfileMsg.style.display = "block";
        }
      } catch (networkError) {
        editProfileMsg.className = "message error";
        editProfileMsg.innerText = `Сетевая ошибка: ${networkError.message}`;
        editProfileMsg.style.display = "block";
      }
    });
  }

  // 6) Загрузка и рендеринг отзывов (без изменений)
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

        const authorLine = document.createElement("p");
        authorLine.innerHTML = `<span class="label">Отзыв от пользователя #${r.reviewer_id}:</span>`;
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

  // 7) Логика формы «оставить отзыв» (без изменений)
  if (!currentUser) {
    const info = document.createElement("p");
    info.className = "message info";
    info.innerText = "Только зарегистрированные пользователи могут оставлять отзывы.";
    userReviewsList.parentNode.insertBefore(info, leaveReviewWrapper);
    leaveReviewWrapper.style.display = "none";
    return;
  }

  if (currentUser.id === userId || currentUser.role === targetUser.role) {
    leaveReviewWrapper.style.display = "none";
  } else {
    try {
      const respMe = await fetch(`${API_BASE}/api/users/${userId}/reviews/me`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (respMe.ok) {
        const myReview = await respMe.json();
        leaveReviewWrapper.style.display = "none";
        const info = document.createElement("p");
        info.className = "message info";
        info.innerText = `Вы уже оставили отзыв (рейтинг ${myReview.rating}).`;
        userReviewsList.parentNode.insertBefore(info, leaveReviewWrapper);
      } else if (respMe.status === 404) {
        leaveReviewWrapper.style.display = "block";
      } else {
        leaveReviewWrapper.style.display = "none";
        const errInfo = document.createElement("p");
        errInfo.className = "message error";
        errInfo.innerText = "Не удалось проверить возможность оставить отзыв.";
        userReviewsList.parentNode.insertBefore(errInfo, leaveReviewWrapper);
      }
    } catch {
      leaveReviewWrapper.style.display = "none";
    }
  }

  if (leaveReviewForm) {
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
          let errMsg = `Ошибка: HTTP ${resp.status}`;
          const contentType = resp.headers.get("content-type") || "";
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
  }
});
