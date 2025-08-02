document.addEventListener("DOMContentLoaded", () => {
    // Simulate loading time (e.g., 2 seconds)
    setTimeout(() => {
        // Hide the loader
        const loader = document.getElementById("page-loader");
        loader.style.display = "none";

        // Show the main content
        const mainContent = document.getElementById("main-content");
        mainContent.style.display = "block";
    }, 1000); // Adjust the delay time as needed
});
