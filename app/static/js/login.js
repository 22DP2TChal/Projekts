// app/static/js/login.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const messageDiv = document.getElementById("loginMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageDiv.innerHTML = "";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    // Посмотрим, что лежит в API_BASE и email/password перед fetch:
    console.log("▶▶▶ [login.js] API_BASE =", API_BASE);
    console.log("▶▶▶ [login.js] Email =", email, ", Password =", password);

    // Формируем данные
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    // Делаем fetch, окружим максимально подробным логированием
    let resp;
    try {
      console.log("▶▶▶ [login.js] Перед fetch на URL:", `${API_BASE}/users/login`);
      resp = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData
      });
      console.log("▶▶▶ [login.js] fetch завершился, resp =", resp);
    } catch (networkError) {
      console.error("‼️ [login.js] Ошибка при вызове fetch:", networkError);
      messageDiv.innerHTML = `<p class="error">Network Error: ${networkError.message}</p>`;
      return;
    }

    // Если fetch не выбросил исключение, посмотрим статус
    console.log("▶▶▶ [login.js] HTTP-статус ответа:", resp.status);

    // Попробуем разобрать тело ответа (даже если статус не 200)
    let bodyText;
    try {
      bodyText = await resp.text();
      console.log("▶▶▶ [login.js] Текст ответа от сервера:", bodyText);
    } catch (parseError) {
      console.error("‼️ [login.js] Не удалось прочитать тело ответа:", parseError);
    }

    // Если статус 200 и JSON, преобразуем и сохраняем токен
    if (resp.ok) {
      try {
        const data = JSON.parse(bodyText);
        console.log("▶▶▶ [login.js] Parsed JSON:", data);
        if (data.access_token) {
          saveToken(data.access_token);
          console.log("▶▶▶ [login.js] После saveToken, localStorage =", localStorage.getItem("access_token"));
          window.location.href = "/projects";
        } else {
          console.error("‼️ [login.js] В ответе нет access_token!");
          messageDiv.innerHTML = `<p class="error">Нет поля access_token в ответе</p>`;
        }
      } catch (jsonError) {
        console.error("‼️ [login.js] Ошибка при парсинге JSON:", jsonError);
        messageDiv.innerHTML = `<p class="error">Неверный JSON: ${bodyText}</p>`;
      }
    } else {
      // Если статус не OK (не 200–299), выводим текст ошибки
      console.warn("⚠️ [login.js] Ответ сервера с ошибкой, статус =", resp.status);
      messageDiv.innerHTML = `<p class="error">Ошибка сервера: ${resp.status}</p>`;
    }
  });
});
