const Razorpay = require("razorpay");
const db = require("../db");

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, msg: `Method ${req.method} Not Allowed` });
  }

  try {
    const { amount, name, mobile, email, method, product } = req.body || {};
    const numericAmount = parseInt(amount, 10);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ success: false, msg: "Invalid amount" });
    }

    const order = await razorpayInstance.orders.create({
      amount: Math.round(numericAmount * 100),
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    const productTitle = (product || name || "").toString();
    const productLink = await new Promise((resolve) => {
      if (!productTitle) return resolve("");
      db.query(
        "SELECT download_link FROM product_links WHERE title = ? LIMIT 1",
        [productTitle],
        (err, rows) => {
          if (err) return resolve("");
          resolve(rows && rows[0] && rows[0].download_link ? rows[0].download_link : "");
        }
      );
    });

    res.json({
      success: true,
      key_id: RAZORPAY_ID_KEY,
      order_id: order.id,
      amount: order.amount,
      name,
      mobile,
      email,
      method: method || "Razorpay",
      product: product || "",
      product_link: productLink || "",
    });
  } catch (_) {
    res.status(500).json({ success: false, msg: "Order creation failed" });
  }
};
