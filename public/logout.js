document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      // Show error message div when needed
      if (errorMessage) {
        errorMessage.style.display = "block";
      }

      fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            window.location.href = "/dashboard.html";
          } else {
            if (errorMessage) {
              errorMessage.textContent =
                data.message || "Login failed. Please check your credentials.";
            }
          }
        })
        .catch((error) => {
          if (errorMessage) {
            errorMessage.textContent = "An error occurred. Please try again later.";
          }
          console.error("Login error:", error);
        });
    });
  }

  function logout() {
    // Get session ID from cookie or localStorage
    const sessionId = getCookie('sessionId') || localStorage.getItem('sessionId');
    
    fetch("/api/logout", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "X-Session-ID": sessionId
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Clear any stored session data
          localStorage.removeItem('sessionId');
          // Redirect to login page
          window.location.href = "/login.html";
        } else {
          throw new Error(data.message || "Logout failed");
        }
      })
      .catch((error) => {
        console.error("Logout error:", error);
        alert("Logout failed: " + error.message);
      });
  }

  // Helper function to get cookie value
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Add event listener if logout button exists
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.removeAttribute("onclick");
    logoutButton.addEventListener("click", logout);
  }

  // Also handle logout links with class 'logout-link'
  const logoutLinks = document.querySelectorAll('.logout-link');
  logoutLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  });

  // Make logout function globally available
  window.logout = logout;
});
