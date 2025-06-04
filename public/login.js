document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Show error message div when needed
    if (errorMessage) {
      errorMessage.style.display = "none";
    }

    fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = "/dashboard.html";
        } else {
          if (errorMessage) {
            errorMessage.style.display = "block";
            errorMessage.textContent =
              data.message || "Login failed. Please check your credentials.";
          }
        }
      })
      .catch((error) => {
        if (errorMessage) {
          errorMessage.style.display = "block";
          errorMessage.textContent =
            "An error occurred. Please try again later.";
        }
        console.error("Login error:", error);
      });
  });
});
