const Razorpay = require("razorpay");
const crypto = require("crypto");
const db = require("../db");
const { appendPaymentRow } = require("../utils/googleSheetsHelper");

const {
  RAZORPAY_ID_KEY,
  RAZORPAY_SECRET_KEY,
} = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

// Render Product Page (if needed)
const renderProductPage = (req, res) => {
  res.send("Welcome to Razorpay Payment Page!");
};

// Create Razorpay order
const createOrder = async (req, res) => {
  try {
    const { amount, name, mobile, email, method, product } = req.body;

    const numericAmount = parseInt(amount, 10);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ success: false, msg: "Invalid amount" });
    }

    const order = await razorpayInstance.orders.create({
      amount: Math.round(numericAmount * 100),
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    // Lookup product download link from DB using provided product title (fallback to name)
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
    res.status(500).json({ success: false, msg: "Failed to create order" });
  }
};

// Verify Razorpay signature and append to Google Sheet
const verifyAndRecord = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      mobile,
      email,
      amount,
      method,
      product,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, msg: "Missing payment data" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_SECRET_KEY)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;
    if (!isAuthentic) {
      return res.status(400).json({ success: false, msg: "Signature mismatch" });
    }

    const amountInRupees = (parseInt(amount, 10) || 0) / 100;

    let recorded = true;
    try {
      await appendPaymentRow({
        name: name || "",
        mobile: mobile || "",
        email: email || "",
        amount: amountInRupees,
        paymentId: razorpay_payment_id,
        status: "Success",
        dateStr: undefined,
        timeStr: undefined,
        method: method || "Razorpay",
        product: product || "",
      });
    } catch (_) {
      recorded = false;
    }

    res.json({ success: true, msg: recorded ? "Payment verified and recorded" : "Payment verified" });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Verification failed" });
  }
};

module.exports = {
  renderProductPage,
  createOrder,
  verifyAndRecord,
};
