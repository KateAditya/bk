const contactForm = document.getElementById("contact-form");

if (contactForm) {
  contactForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const button = document.getElementById("submit-button");
    if (!button) return;

    const buttonText = button.querySelector(".button-text");
    const loaders =
      button.querySelector(".loaders") || button.querySelector(".loader");
    if (!buttonText || !loaders) return;

    buttonText.style.display = "none";
    loaders.style.display = "inline-block";

    setTimeout(() => {
      alert("Message sent successfully!");
      loaders.style.display = "none";
      buttonText.style.display = "inline";
    }, 2000);
  });
}
