document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorMessage.style.display = "none";

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: document.getElementById("username").value,
          password: document.getElementById("password").value,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        window.location.href = data.redirectUrl || "/dashboard.html";
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      errorMessage.style.display = "block";
      errorMessage.textContent =
        error.message || "An error occurred during login";
    }
  });
});
