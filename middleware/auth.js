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
    // If it's an API request, return JSON
    if (req.path.startsWith("/api/") || req.xhr) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    // For HTML page requests, redirect to login
    return res.redirect(
      `/login.html?redirect=${req.originalUrl}&unauthorized=true`
    );
  }
  next();
};

module.exports = { checkAuth };
