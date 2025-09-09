document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  // Get API URL based on environment
  const baseUrl = window.location.origin;

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorMessage.style.display = "none";
    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: document.getElementById("username").value,
          password: document.getElementById("password").value,
        }),
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Invalid server response");
      }

      if (!response.ok) {
        let errorMsg;
        switch (response.status) {
          case 500:
            errorMsg = "Internal server error. Please try again later.";
            break;
          case 401:
            errorMsg = "Invalid username or password";
            break;
          case 429:
            errorMsg = "Too many attempts. Please try again later";
            break;
          default:
            errorMsg = data.message || `Server error (${response.status})`;
        }
        throw new Error(errorMsg);
      }

      if (data.success) {
        window.location.href = "/dashboard.html";
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        errorMessage.textContent = "Request timeout. Please try again.";
      } else {
        errorMessage.textContent =
          error.message || "Login failed. Please try again.";
      }
      errorMessage.style.display = "block";
    } finally {
      submitButton.disabled = false;
    }
  });
});
