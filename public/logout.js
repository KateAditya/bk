document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Show error message div when needed
    errorMessage.style.display = "block";

    fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = "/dashboard.html";
        } else {
          errorMessage.textContent =
            data.message || "Login failed. Please check your credentials.";
        }
      })
      .catch((error) => {
        errorMessage.textContent = "An error occurred. Please try again later.";
        console.error("Login error:", error);
      });
  });

  function logout() {
    fetch("/api/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = "/public/login.html";
        } else {
          throw new Error(data.message || "Logout failed");
        }
      })
      .catch((error) => {
        console.error("Logout error:", error);
        alert("Logout failed: " + error.message);
      });
  }

  // Optional: add event listener if logout button exists
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.removeAttribute("onclick");
    logoutButton.addEventListener("click", logout);
  }
});
