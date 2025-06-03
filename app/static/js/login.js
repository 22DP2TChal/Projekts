// app/static/js/login.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const messageDiv = document.getElementById("loginMessage");

  // Скрываем сообщение при загрузке страницы
  messageDiv.style.display = "none";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Очищаем предыдущие сообщения и скрываем блок
    messageDiv.innerText = "";
    messageDiv.className = "message"; // сбрасываем возможные классы error/success
    messageDiv.style.display = "none";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    // Формируем formData для OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append("grant_type", "password");
    formData.append("username", email);
    formData.append("password", password);

    try {
      console.log("[login.js] Перед fetch на URL:", `${API_BASE}/api/users/login`);
      const resp = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });

      console.log("[login.js] HTTP-статус ответа:", resp.status);

      if (resp.ok) {
        // 200 OK: получаем токен и редиректим
        const data = await resp.json();
        console.log("[login.js] Токен получен:", data.access_token);
        saveToken(data.access_token);
        window.location.href = "/projects";
      } else {
        // Статус не 200: читаем JSON с полем detail
        let errMsg = "Неизвестная ошибка";
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errJson = await resp.json();
          errMsg = errJson.detail || JSON.stringify(errJson);
        } else {
          errMsg = await resp.text();
        }
        console.warn("[login.js] Ответ сервера с ошибкой, статус =", resp.status, "; текст:", errMsg);

        // Показываем блок с ошибкой
        messageDiv.classList.add("error");
        messageDiv.innerText = errMsg;
        messageDiv.style.display = "block";
      }
    } catch (networkError) {
      console.error("[login.js] Network error:", networkError);
      messageDiv.classList.add("error");
      messageDiv.innerText = `Сетевая ошибка: ${networkError.message}`;
      messageDiv.style.display = "block";
    }
  });
});
