// app/static/js/register.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const messageDiv = document.getElementById("registerMessage");

  // убедимся, что блок скрыт изначально
  messageDiv.style.display = "none";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    // очищаем предыдущее сообщение
    messageDiv.innerText = "";
    messageDiv.className = "message";  
    messageDiv.style.display = "none";

    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const role = document.getElementById("registerRole").value;

    try {
      console.log("[register.js] Отправляем POST /api/users/ (регистрация) с:", { email, role });
      const resp = await fetch(`${API_BASE}/api/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });

      console.log("[register.js] Ответ /api/users/ статус =", resp.status);
      if (resp.ok) {
        const data = await resp.json();
        console.log("[register.js] Ответ /api/users/ body =", data);
        // показываем success-сообщение
        messageDiv.classList.add("success");
        messageDiv.innerText = `Успешно зарегистрированы: ${data.email}. Пожалуйста, войдите.`;
        messageDiv.style.display = "block";
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        // читаем JSON с полем detail
        let errMsg = "Неизвестная ошибка";
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errJson = await resp.json();
          errMsg = errJson.detail || JSON.stringify(errJson);
        } else {
          errMsg = await resp.text();
        }
        // выводим ошибку
        messageDiv.classList.add("error");
        messageDiv.innerText = errMsg;
        messageDiv.style.display = "block";
      }
    } catch (networkError) {
      messageDiv.classList.add("error");
      messageDiv.innerText = `Network error: ${networkError.message}`;
      messageDiv.style.display = "block";
    }
  });
});
