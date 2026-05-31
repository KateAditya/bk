const contactForm = document.getElementById("contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const form = this;
    const formData = new FormData(form);
    const submitButton = document.getElementById("submit-button");
    const loader = document.getElementById("loader");
    const buttonText = submitButton
      ? submitButton.querySelector(".button-text")
      : null;

    if (!submitButton || !loader || !buttonText) return;

    buttonText.style.display = "none";
    loader.style.display = "inline-block";
    submitButton.disabled = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch("https://formsubmit.co/ajax/1e0414ae65d9aeea6119ddb52495a7a3", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          Swal.fire({
            title: "We Will Connect You Shortly!!",
            text: "Message Sent Successfully",
            icon: "success",
            confirmButtonText: "Done",
          });

          form.reset();
        } else {
          Swal.fire({
            title: "Error",
            text: "Failed to Send Message. Please Try Again Later.",
            icon: "error",
            confirmButtonText: "Done",
          });
        }
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          Swal.fire({
            title: "Timeout",
            text: "Request took too long. Please try again.",
            icon: "warning",
            confirmButtonText: "OK",
          });
        } else {
          Swal.fire({
            title: "Error",
            text: "Failed to Send Message. Please Try Again Later.",
            icon: "error",
            confirmButtonText: "Done",
          });
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        buttonText.style.display = "inline";
        loader.style.display = "none";
        submitButton.disabled = false;
      });
  });
}

function validateContactInput(event) {
  let key = event.key;

  // Allow only numbers (0-9), and prevent anything else
  if (!/^[0-9]$/.test(key)) {
    event.preventDefault();
  }
}
