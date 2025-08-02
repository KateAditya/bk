$(document).ready(function () {
  $(".pay-form").submit(function (e) {
    e.preventDefault();

    var formData = $(this).serialize();
    console.log("Form Data: ", formData); // Debug

    $.ajax({
      url: "http://localhost:3000/createOrder",
      type: "POST",
      data: formData,
      success: function (res) {
        console.log("Response: ", res); // Debug

        if (res.success) {
          var options = {
            key: res.key_id,
            amount: res.amount,
            currency: "INR",
            name: res.product_name,
            description: res.description,
            image: "https://dummyimage.com/600x400/000/fff",
            order_id: res.order_id,

            handler: function (response) {
              const productLink = res.product_link;
              console.log("Product Link: ", productLink);

              if (productLink) {
                Swal.fire({
                  title: "Payment Succeeded!",
                  text: "Your product is ready.",
                  icon: "success",
                  confirmButtonText: "OK",
                }).then(() => {
                  const newTab = window.open(productLink, "_blank");
                  if (
                    !newTab ||
                    newTab.closed ||
                    typeof newTab.closed === "undefined"
                  ) {
                    Swal.fire({
                      title: "Pop-up Blocked!",
                      text: "Redirecting to the page in the same tab.",
                      icon: "warning",
                      confirmButtonText: "OK",
                    }).then(() => {
                      window.location.href = productLink;
                    });
                  }
                });
              } else {
                Swal.fire({
                  title: "Error",
                  text: "Product link not found!",
                  icon: "error",
                  confirmButtonText: "OK",
                });
              }
            },

            prefill: {
              contact: res.contact,
              name: res.name,
              email: res.email,
            },
            notes: {
              description: res.description,
            },
            theme: {
              color: "#2300a3",
            },
          };

          var razorpayObject = new Razorpay(options);
          razorpayObject.on("payment.failed", function () {
            alert("Payment Failed");
          });
          razorpayObject.open();
        } else {
          alert(res.msg);
        }
      },
      error: function (xhr, status, error) {
        console.error("Error: ", error);
        alert("An error occurred while creating the order.");
      },
    });
  });
});
