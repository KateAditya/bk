(function () {
  // Initialize EmailJS with your public key
  emailjs.init("cpZ1TQaAFUFX5sE0Y"); // Replace with your EmailJS Public Key
})();

function sendEmail(e) {
  e.preventDefault(); // Prevent default form submission

  // Disable the submit button to prevent multiple submissions
  const submitButton = document.getElementById("submit-button");
  submitButton.disabled = true; // Disable the button
  submitButton.innerHTML = `<span class="loader"></span> Sending...`;

  // Collect form data
  const firstName = document.getElementById("first-name").value;
  const lastName = document.getElementById("last-name").value;
  const email = document.getElementById("email").value;
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;

  // Validate the form fields
  if (!firstName || !lastName || !email || !subject || !message) {
    alert("All fields are required!");
    submitButton.disabled = false; // Re-enable the button if validation fails
    submitButton.innerHTML = "Send Message";
    return;
  }

  // Set up parameters for EmailJS
  const templateParams = {
    first_name: firstName,
    last_name: lastName,
    email_id: email,
    subject: subject,
    message: message,
  };

  // Send email via EmailJS
  emailjs
    .send("service_wwk4g84", "template_xvc9jkc", templateParams)
    .then(function (response) {
      alert("Message sent successfully! We will connect with you shortly!!");
    })
    .catch(function (error) {
      alert("Failed to send message. Please try again later.");
    })
    .finally(() => {
      // Re-enable the button and reset its text after sending
      submitButton.disabled = false;
      submitButton.innerHTML = "Send Message";
    });
}

// Add event listener to the form submit
document.querySelector("form").addEventListener("submit", sendEmail);
