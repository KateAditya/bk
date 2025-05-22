const express = require("express");
const router = express.Router();
const db = require("./db");

// Get all product links
router.get("/product-links", (req, res) => {
  const sql =
    "SELECT id, title, download_link FROM product_links ORDER BY id DESC";

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add new product link
router.post("/product-links", (req, res) => {
  const { title, download_link } = req.body;

  if (!title || !download_link) {
    return res
      .status(400)
      .json({ error: "Title and download link are required" });
  }

  // First verify that the product exists in products table
  db.query(
    "SELECT title FROM products WHERE title = ?",
    [title],
    (err, products) => {
      if (err) return res.status(500).json({ error: err.message });

      if (products.length === 0) {
        return res
          .status(404)
          .json({ error: "Product title does not exist in products table" });
      }

      // Insert the link with the product title
      const sql =
        "INSERT INTO product_links (title, download_link) VALUES (?, ?)";
      db.query(sql, [title, download_link], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
          message: "✅ Product link added",
          id: result.insertId,
        });
      });
    }
  );
});

// Update product link
router.put("/product-links/:id", (req, res) => {
  const linkId = req.params.id;
  const { title, download_link } = req.body;

  if (!title || !download_link) {
    return res
      .status(400)
      .json({ error: "Title and download link are required" });
  }

  // First verify that the product exists in products table
  db.query(
    "SELECT title FROM products WHERE title = ?",
    [title],
    (err, products) => {
      if (err) return res.status(500).json({ error: err.message });

      if (products.length === 0) {
        return res
          .status(404)
          .json({ error: "Product title does not exist in products table" });
      }

      // Update the link with new title and download link
      const sql =
        "UPDATE product_links SET title = ?, download_link = ? WHERE id = ?";
      db.query(sql, [title, download_link, linkId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Product link not found" });
        }
        res.json({ message: "✅ Product link updated" });
      });
    }
  );
});

// Delete product link
router.delete("/product-links/:id", (req, res) => {
  const linkId = req.params.id;
  db.query(
    "DELETE FROM product_links WHERE id = ?",
    [linkId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Product link not found" });
      }
      res.json({ message: "✅ Product link deleted" });
    }
  );
});

// Get all product titles from products table
router.get("/product-titles", (req, res) => {
  const sql = "SELECT title FROM products ORDER BY title";

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Bulk import product links
router.post("/product-links/bulk", (req, res) => {
  const links = req.body;
  const titles = Object.keys(links);

  if (titles.length === 0) {
    return res.status(400).json({ error: "No links provided" });
  }

  // Get all existing products to validate titles
  db.query("SELECT title FROM products", (err, products) => {
    if (err) return res.status(500).json({ error: err.message });

    const validProductTitles = new Set(products.map((p) => p.title));
    const values = [];
    const invalidTitles = [];

    // Prepare values for bulk insert, checking each title exists
    titles.forEach((title) => {
      if (validProductTitles.has(title)) {
        values.push([title, links[title]]);
      } else {
        invalidTitles.push(title);
      }
    });

    if (values.length === 0) {
      return res.status(400).json({
        error: "No valid product titles found",
        invalidTitles,
      });
    }

    const sql = "INSERT INTO product_links (title, download_link) VALUES ?";
    db.query(sql, [values], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: `✅ Successfully imported ${result.affectedRows} links`,
        count: result.affectedRows,
        invalidTitles: invalidTitles.length > 0 ? invalidTitles : undefined,
      });
    });
  });
});

module.exports = router;
