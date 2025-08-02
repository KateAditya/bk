document.getElementById("contact-form")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent actual form submission

    let button = document.getElementById("submit-button");
    let buttonText = button.querySelector(".button-text");
    let loaders = button.querySelector(".loaders");

    // Show loader and hide text
    buttonText.style.display = "none";
    loader.style.display = "inline-block";

    // Simulate message sending (Replace with actual API call)
    setTimeout(() => {
      alert("Message sent successfully!");

      // Hide loader and show text again
      loaders.style.display = "none";
      buttonText.style.display = "inline";
    }, 2000);
  });
