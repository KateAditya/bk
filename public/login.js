document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    console.log("Attempting login with:", { username, password });

    fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    })
      .then((response) => {
        console.log("Login response status:", response.status);
        return response.json();
      })
      .then((data) => {
        console.log("Login response data:", data);
        if (data.success) {
          window.location.href = "/dashboard.html";
        } else {
          errorMessage.style.display = "block";
          errorMessage.textContent =
            data.message || "Login failed. Please check your credentials.";
        }
      })
      .catch((error) => {
        console.error("Login error:", error);
        errorMessage.style.display = "block";
        errorMessage.textContent = "An error occurred. Please try again later.";
      });
  });
});
