const Razorpay = require("razorpay");
const axios = require("axios");
const _ = require("lodash");
const retry = require("async-retry");
const db = require("./db"); // Import database connection
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

// We'll load product links from the database dynamically now
let cachedProductLinks = {};

// Function to refresh the cached product links
const refreshProductLinks = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT title, download_link FROM product_links",
      (err, results) => {
        if (err) return reject(err);

        // Format results as key-value pairs
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

// Initial load of product links
refreshProductLinks().catch(console.error);

// Refresh cache every 15 minutes (adjust as needed)
setInterval(() => {
  refreshProductLinks().catch(console.error);
}, 15 * 60 * 1000);

module.exports = async (req, res) => {
  if (req.method === "POST") {
    try {
      const amount = parseInt(req.body.amount, 10); // Ensure it's a valid number
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, msg: "Invalid amount!" });
      }

      const options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `order_rcptid_${Date.now()}`, // Unique receipt ID
      };

      const createRazorpayOrder = async () => {
        const response = await axios.post(
          "https://api.razorpay.com/v1/orders",
          options,
          {
            auth: {
              username: RAZORPAY_ID_KEY,
              password: RAZORPAY_SECRET_KEY,
            },
          }
        );
        return response.data;
      };

      const order = await retry(createRazorpayOrder, {
        retries: 3,
        factor: 2,
      });

      // Get latest product links if needed
      if (Object.keys(cachedProductLinks).length === 0) {
        await refreshProductLinks();
      }

      const productLink = _.get(cachedProductLinks, req.body.name, null);

      res.status(200).json({
        success: true,
        msg: "Order Created",
        order_id: _.get(order, "id", "N/A"),
        amount: amount * 100,
        key_id: RAZORPAY_ID_KEY,
        product_name: req.body.name,
        description: req.body.description || "No description available.",
        contact: "123456789",
        name: "DreamStories",
        email: "dreamstories@gmail.com",
        product_link: productLink || "https://example.com/product-not-found", // Fallback link
      });
    } catch (error) {
      console.error("Error creating order:", error.message);
      res.status(500).json({ success: false, msg: "Order creation failed!" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.json({ success: false, msg: `Method ${req.method} Not Allowed` });
  }
};
