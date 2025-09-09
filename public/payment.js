$(document).ready(function () {
  $(".pay-form").on("submit", function (e) {
    e.preventDefault();

    const name = $("#payer_name").val().trim();
    const mobile = $("#payer_mobile").val().trim();
    const email = $("#payer_email").val().trim();
    const amount = $("#amount").val().trim();
    const product = $("#product_title").val().trim();

    // Basic validations
    if (!name) return alert("Please enter your name");
    const mobileRe = /^[6-9][0-9]{9}$/;
    if (!mobileRe.test(mobile)) return alert("Enter a valid 10-digit Indian mobile number starting with 6-9");
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRe.test(email)) return alert("Enter a valid email address");
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return alert("Enter a valid amount");

    $.ajax({
      url: "/createOrder",
      type: "POST",
      data: { name, mobile, email, amount: amt, product },
      success: function (res) {
        if (!res.success) return;

        const options = {
          key: res.key_id,
          amount: res.amount,
          currency: "INR",
          name: name,
          description: "Payment",
          order_id: res.order_id,
          prefill: { name, email, contact: mobile },
          handler: function (response) {
            $.ajax({
              url: "/verifyPayment",
              type: "POST",
              data: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                name,
                mobile,
                email,
                amount: res.amount,
                method: "Razorpay",
                product,
              },
              success: function () {
                try {
                  document.getElementById('pay-modal').style.display = 'none';
                  document.getElementById('pay-modal-backdrop').style.display = 'none';
                } catch (e) {}
                // If we received a product_link with the order, open it now
                try {
                  if (res.product_link) {
                    const newTab = window.open(res.product_link, '_blank');
                    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
                      window.location.href = res.product_link;
                    }
                  }
                } catch (e) {
                  if (res.product_link) window.location.href = res.product_link;
                }
              },
              error: function () {},
            });
          },
          theme: { color: "#2300a3" },
        };

        const rzp = new Razorpay(options);
        rzp.on("payment.failed", function () {
          alert("Payment Failed");
        });
        rzp.open();
      },
      error: function () {
        alert("Order request failed");
      },
    });
  });
});
