document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  // Get base URL from current location
  const baseUrl = window.location.origin;

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorMessage.style.display = "none";

    try {
      const response = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: document.getElementById("username").value,
          password: document.getElementById("password").value,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();
      if (data.success) {
        window.location.href = `${baseUrl}${data.redirectUrl}`;
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      errorMessage.style.display = "block";
      errorMessage.textContent =
        error.message || "An error occurred during login";
      console.error("Login error:", error);
    }
  });
});
