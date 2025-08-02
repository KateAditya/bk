const checkAuth = (req, res, next) => {
  if (!req.session) {
    console.error("No session found");
    return res
      .status(401)
      .json({ success: false, message: "No session found" });
  }

  console.log("Session:", req.session);
  console.log("Auth status:", req.session.isAuthenticated);

  if (!req.session.isAuthenticated) {
    // Check if it's an API/AJAX request by multiple methods
    const isApiRequest =
      req.path.startsWith("/api/") ||
      req.path.startsWith("/admin/") ||
      req.xhr ||
      req.headers.accept?.includes("application/json") ||
      req.headers["content-type"]?.includes("application/json") ||
      req.get("X-Requested-With") === "XMLHttpRequest";

    // If it's an API request, return JSON
    if (isApiRequest) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    // For HTML page requests, redirect to login
    return res.redirect(
      `/login.html?redirect=${encodeURIComponent(
        req.originalUrl
      )}&unauthorized=true`
    );
  }

  next();
};

// Create separate middleware for when you specifically need API-only auth
const checkAuthAPI = (req, res, next) => {
  if (!req.session || !req.session.isAuthenticated) {
    console.log("Unauthorized access attempt:", {
      path: req.path,
      session: req.session,
      headers: req.headers,
    });
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  next();
};

// Create separate middleware for when you specifically need page-only auth
const checkAuthPage = (req, res, next) => {
  if (!req.session || !req.session.isAuthenticated) {
    return res.redirect(
      `/login.html?redirect=${encodeURIComponent(
        req.originalUrl
      )}&unauthorized=true`
    );
  }
  next();
};

module.exports = { checkAuth, checkAuthAPI, checkAuthPage };
