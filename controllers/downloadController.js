const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const db = require("../db"); // Adjust path as needed

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { token, payment, product } = req.query;

    if (!token || !payment) {
      return res.status(400).json({
        error: "Missing required parameters",
      });
    }

    // Verify token and payment in database
    const query =
      "SELECT * FROM payments WHERE download_token = ? AND payment_id = ?";
    db.query(query, [token, payment], async (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Server error" });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({
          error: "Invalid token or payment",
        });
      }

      const payment = results[0];

      // Get file path based on product
      const downloadsPath = path.join(__dirname, "..", "downloads");
      const productFileName = `${payment.product.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}.zip`;
      const filePath = path.join(downloadsPath, productFileName);

      try {
        await fs.access(filePath);
        res.download(filePath, productFileName, (err) => {
          if (err) {
            console.error("Download error:", err);
            return res.status(500).json({
              error: "Download failed",
            });
          }
        });
      } catch (error) {
        console.error("File access error:", error);
        return res.status(404).json({
          error: "File not found",
        });
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
