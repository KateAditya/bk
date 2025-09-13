const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  // Extract query parameters
  const { token, payment, product } = req.query;

  // Basic validations (add your own logic as needed)
  if (!token || !payment || !product) {
    return res
      .status(400)
      .json({ error: "Missing required query parameters." });
  }

  // Determine the file to download. For example, you may map a product
  // name to a filepath. Here we assume a file exists under a "downloads" folder.
  let fileName = "sampleFile.pdf"; // replace with logic based on product if needed
  const filePath = path.join(__dirname, "..", "downloads", fileName);

  // Respond with a file download.
  return res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Download error:", err);
      return res.status(500).json({ error: "File download failed." });
    }
  });
});

module.exports = router;
