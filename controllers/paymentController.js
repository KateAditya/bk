const Razorpay = require("razorpay");
const axios = require("axios");
const _ = require("lodash");
const retry = require("async-retry");
const db = require("../db");

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

let cachedProductLinks = {};

const refreshProductLinks = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT title, download_link FROM product_links",
      (err, results) => {
        if (err) return reject(err);

        const productLinks = {};
        results.forEach((item) => {
          productLinks[item.title] = item.download_link;
        });

        cachedProductLinks = productLinks;
        resolve(productLinks);
      }
    );
  });
};

// Initial Load
refreshProductLinks().catch(console.error);
// Refresh Every 15 Minutes
setInterval(() => {
  refreshProductLinks().catch(console.error);
}, 15 * 60 * 1000);

// Render Product Page (if needed)
const renderProductPage = (req, res) => {
  res.send("Welcome to Razorpay Payment Page!"); // Replace with res.render if using EJS
};

// Helper function to get product link
async function getProductLink(productName) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT download_link FROM product_links WHERE title = ?",
      [productName],
      (err, results) => {
        if (err) {
          console.error("Error fetching product link:", err);
          return resolve(null);
        }
        resolve(results[0]?.download_link || null);
      }
    );
  });
}

// Create Order Function
const createOrder = async (req, res) => {
  try {
    const amount = parseInt(req.body.amount, 10);
    const productName = req.body.name;

    if (!amount || !productName) {
      return res.status(400).json({
        success: false,
        msg: "Invalid payment details",
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpayInstance.orders.create(options);
    const productLink = await getProductLink(productName);

    res.status(200).json({
      success: true,
      key_id: RAZORPAY_ID_KEY,
      amount: options.amount,
      order_id: order.id,
      product_name: productName,
      description: req.body.description || `Purchase ${productName}`,
      product_link: productLink || req.body.link,
      contact: "1234567890",
      name: "Dream Stories",
      email: "dreamstories@example.com",
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to create payment order",
    });
  }
};

module.exports = {
  renderProductPage,
  createOrder,
};
