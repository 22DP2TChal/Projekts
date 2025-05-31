// app/static/js/register.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const messageDiv = document.getElementById("registerMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageDiv.innerHTML = "";

    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const role = document.getElementById("registerRole").value;

    try {
      console.log("[register.js] Отправляем POST /users/ (регистрация) с:", { email, role });
      const resp = await fetch(`${API_BASE}/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, role })
      });

      console.log("[register.js] Ответ /users/ статус =", resp.status);
      if (resp.ok) {
        const data = await resp.json();
        console.log("[register.js] Ответ /users/ body =", data);
        messageDiv.innerHTML = `<p class="success">Успешно зарегистрированы: ${data.email}. Пожалуйста, войдите.</p>`;
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errJson = await resp.json();
          const errMsg = errJson.detail || JSON.stringify(errJson);
          console.log("[register.js] Ошибка /users/ (JSON) =", errJson);
          messageDiv.innerHTML = `<p class="error">${errMsg}</p>`;
        } else {
          const text = await resp.text();
          console.log("[register.js] Ошибка /users/ (не JSON) =", text);
          const short = text.length > 200 ? text.slice(0, 200) + "…" : text;
          messageDiv.innerHTML = `<p class="error">Server error: ${short}</p>`;
        }
      }
    } catch (networkError) {
      console.log("[register.js] Network Error =", networkError);
      messageDiv.innerHTML = `<p class="error">Network error: ${networkError.message}</p>`;
    }
  });
});
