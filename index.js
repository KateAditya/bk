require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const axios = require("axios"); // Add this for GitHub API calls
const db = require("./db");
const { checkAuth } = require("./middleware/auth");
const adminRoutes = require("./adminRoutes");
const paymentController = require("./controllers/paymentController");

const app = express();

// Update CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5500",
        "https://bk-mu-five.vercel.app",
        "https://bk-theta.vercel.app",
      ];
      callback(null, true); // Allow all origins temporarily for debugging
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
  })
);

// Remove existing CORS middleware and replace with these headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, Origin"
  );
  next();
});

// Configure static file serving
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, path, stat) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      res.set("Cache-Control", "public, max-age=31557600"); // Cache for 1 year
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session Management
const sessionOptions = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true,
  },
};

// Update session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  store: new MySQLStore(sessionOptions),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
};

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(session(sessionConfig));

// Enhanced file upload configuration for GitHub upload
const storage = multer.memoryStorage(); // Use memory storage for GitHub upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// GitHub Configuration
const GITHUB_CONFIG = {
  token: process.env.GITHUB_TOKEN,
  repo: process.env.GITHUB_REPO || "your-username/your-repo", // Add this to your .env
  branch: process.env.GITHUB_BRANCH || "main",
  path: process.env.GITHUB_PATH || "images/",
  apiUrl: "https://api.github.com",
};

// GitHub Upload Function
async function uploadToGitHub(fileBuffer, filename, originalName) {
  try {
    if (!GITHUB_CONFIG.token) {
      throw new Error("GitHub token not configured");
    }

    if (
      !GITHUB_CONFIG.repo ||
      GITHUB_CONFIG.repo === "your-username/your-repo"
    ) {
      throw new Error(
        "GitHub repository not configured. Please set GITHUB_REPO in your .env file"
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const uniqueFilename = `${filename}_${timestamp}${extension}`;
    const filePath = `${GITHUB_CONFIG.path}${uniqueFilename}`.replace(
      /\/\//g,
      "/"
    );

    // Convert buffer to base64
    const base64Content = fileBuffer.toString("base64");

    // GitHub API request
    const response = await axios({
      method: "PUT",
      url: `${GITHUB_CONFIG.apiUrl}/repos/${GITHUB_CONFIG.repo}/contents/${filePath}`,
      headers: {
        Authorization: `token ${GITHUB_CONFIG.token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      data: {
        message: `Upload ${uniqueFilename}`,
        content: base64Content,
        branch: GITHUB_CONFIG.branch,
      },
    });

    if (response.status === 201) {
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${filePath}`;

      console.log("✅ Image uploaded to GitHub successfully:", rawUrl);

      return {
        success: true,
        imageUrl: rawUrl,
        downloadUrl: response.data.content.download_url,
        path: filePath,
      };
    } else {
      throw new Error(`GitHub API returned status: ${response.status}`);
    }
  } catch (error) {
    console.error(
      "❌ GitHub upload error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message || error.message || "GitHub upload failed"
    );
  }
}

// ==================== ROUTE HANDLERS ====================

// Public routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

function checkAuthPage(req, res, next) {
  if (!req.session || !req.session.isAuthenticated) {
    return res.redirect("/login.html");
  }
  next();
}

// Update auth check middleware
function checkAuthAPI(req, res, next) {
  if (!req.session || !req.session.isAuthenticated) {
    console.log("Session state:", req.session); // Debug log
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }
  next();
}

// Fixed page routes - use checkAuthPage for HTML pages
app.get(["/dashboard", "/dashboard.html"], checkAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get(["/admin", "/admin.html"], checkAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ==================== NEW GITHUB UPLOAD ENDPOINT ====================

// GitHub Image Upload Endpoint
app.post(
  "/api/upload-image",
  checkAuthAPI,
  upload.single("image"),
  async (req, res) => {
    try {
      console.log("🔄 Processing image upload to GitHub...");

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      console.log("📁 File details:", {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      // Validate file type
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Only image files are allowed",
        });
      }

      // Validate file size (10MB)
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Image size must be less than 10MB",
        });
      }

      // Generate filename
      const filename = "product_image";

      // Upload to GitHub
      const uploadResult = await uploadToGitHub(
        req.file.buffer,
        filename,
        req.file.originalname
      );

      if (uploadResult.success) {
        res.json({
          success: true,
          message: "Image uploaded successfully to GitHub",
          imageUrl: uploadResult.imageUrl,
          downloadUrl: uploadResult.downloadUrl,
          path: uploadResult.path,
        });
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("❌ Image upload error:", error);
      res.status(500).json({
        success: false,
        message: `Upload failed: ${error.message}`,
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// Test GitHub Configuration Endpoint
app.get("/api/test-github-config", checkAuthAPI, (req, res) => {
  const config = {
    hasToken: !!GITHUB_CONFIG.token,
    repo: GITHUB_CONFIG.repo,
    branch: GITHUB_CONFIG.branch,
    path: GITHUB_CONFIG.path,
    tokenPrefix: GITHUB_CONFIG.token
      ? GITHUB_CONFIG.token.substring(0, 10) + "..."
      : "Not set",
  };

  res.json({
    success: true,
    config: config,
    ready: config.hasToken && config.repo !== "your-username/your-repo",
  });
});

// Ensure protected routes use auth middleware
app.get("/admin/product-links", checkAuthAPI, (req, res) => {
  db.query("SELECT * FROM product_links ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json(results);
  });
});

app.get("/admin/product-titles", checkAuthAPI, (req, res) => {
  db.query("SELECT title FROM products", (err, results) => {
    if (err) {
      console.error("Error fetching product titles:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to load product titles",
      });
    }
    res.json(results);
  });
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Authentication endpoint
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(
      "Login attempt for:",
      username,
      "Environment:",
      process.env.NODE_ENV
    );

    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      req.session.isAuthenticated = true;
      req.session.user = { username };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({
            success: false,
            message: "Login failed",
            error:
              process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }
        res.json({
          success: true,
          message: "Login successful",
          redirectUrl: "/dashboard.html",
        });
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err)
      return res.status(500).json({ success: false, message: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// Protected Route (Optional)
app.get("/api/profile", (req, res) => {
  if (req.session.isAuthenticated) {
    res.json({ user: req.session.username });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

// Check authentication status
app.get("/api/check-auth", (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    res.json({
      success: true,
      authenticated: true,
      user: req.session.user,
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: "Not authenticated",
    });
  }
});

/// ==================== PRODUCT ROUTES ====================

// Get all products
app.get("/api/products", checkAuthAPI, (req, res) => {
  console.log("Fetching all products...");

  db.query("SELECT * FROM products ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error("❌ Error fetching products:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to load products",
        error:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Database error",
      });
    }

    console.log(`✅ Products fetched: ${results.length} items`);
    res.json(results);
  });
});

// Get product by ID
app.get("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  console.log(`Fetching product with ID: ${id}`);

  db.query("SELECT * FROM products WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("❌ Error fetching product:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      console.log(`❌ Product with ID ${id} not found`);
      return res.status(404).json({ error: "Product not found" });
    }

    console.log(`✅ Product found: ${results[0].title}`);
    res.json(results[0]);
  });
});

// Add product
app.post("/api/products", checkAuthAPI, (req, res) => {
  console.log("🔄 Received request to add product");
  console.log("Request body:", req.body);

  const { title, discount, price, description, view_link, image_url } =
    req.body;

  // Validate required fields
  if (
    !title ||
    !discount ||
    !price ||
    !description ||
    !view_link ||
    !image_url
  ) {
    console.log("❌ Missing required fields");
    return res.status(400).json({
      error: "All fields are required",
      success: false,
      received: { title, discount, price, description, view_link, image_url },
    });
  }

  // Validate and convert price
  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice) || numericPrice <= 0) {
    console.log("❌ Invalid price value:", price);
    return res.status(400).json({
      error: "Price must be a valid positive number",
      success: false,
    });
  }

  const sql = `INSERT INTO products (title, image_url, discount, price, description, view_link) 
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [title, image_url, discount, numericPrice, description, view_link],
    (err, result) => {
      if (err) {
        console.error("❌ Database Error:", err);
        return res.status(500).json({
          error: "Failed to save product to database",
          success: false,
          details:
            process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }

      console.log("✅ Product added successfully with ID:", result.insertId);
      res.status(201).json({
        success: true,
        message: "✅ Product added successfully!",
        productId: result.insertId,
        product: {
          id: result.insertId,
          title,
          image_url,
          discount,
          price: numericPrice,
          description,
          view_link,
        },
      });
    }
  );
});

// Update product
app.put("/api/products/:id", checkAuthAPI, (req, res) => {
  const productId = parseInt(req.params.id);
  const { title, discount, price, description, view_link, image_url } =
    req.body;

  if (isNaN(productId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  // Validate required fields
  if (!title || !discount || !price || !description || !view_link) {
    return res.status(400).json({
      error: "All fields are required",
      success: false,
    });
  }

  // Validate price
  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({
      error: "Price must be a valid positive number",
      success: false,
    });
  }

  console.log(`🔄 Updating product ID: ${productId}`);

  const sql = `
    UPDATE products 
    SET title = ?, image_url = ?, discount = ?, price = ?, description = ?, view_link = ? 
    WHERE id = ?`;

  db.query(
    sql,
    [
      title,
      image_url,
      discount,
      numericPrice,
      description,
      view_link,
      productId,
    ],
    (updateErr, updateResult) => {
      if (updateErr) {
        console.error("❌ Error updating product:", updateErr);
        return res.status(500).json({
          error: "Failed to update product",
          success: false,
        });
      }

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      console.log("✅ Product updated successfully");
      res.json({
        success: true,
        message: "✅ Product updated successfully!",
        product: {
          id: productId,
          title,
          image_url,
          discount,
          price: numericPrice,
          description,
          view_link,
        },
      });
    }
  );
});

// Delete product
app.delete("/api/products/:id", checkAuthAPI, (req, res) => {
  const productId = parseInt(req.params.id);

  if (isNaN(productId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  console.log(`🔄 Deleting product ID: ${productId}`);

  db.query(
    "DELETE FROM products WHERE id = ?",
    [productId],
    (deleteErr, result) => {
      if (deleteErr) {
        console.error("❌ Error deleting product:", deleteErr);
        return res.status(500).json({ error: "Failed to delete product" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      console.log("✅ Product deleted successfully");
      res.json({
        success: true,
        message: "✅ Product deleted successfully!",
      });
    }
  );
});

// Create/Add new product link
app.post("/admin/product-links", checkAuthAPI, (req, res) => {
  const { title, download_link } = req.body;

  if (!title || !download_link) {
    return res
      .status(400)
      .json({ error: "Title and download link are required" });
  }

  const sql = "INSERT INTO product_links (title, download_link) VALUES (?, ?)";

  db.query(sql, [title, download_link], (err, result) => {
    if (err) {
      console.error("Error creating product link:", err);
      return res.status(500).json({ error: "Failed to create product link" });
    }

    res.status(201).json({
      message: "Product link added successfully",
      id: result.insertId,
    });
  });
});

// Update existing product link
app.put("/admin/product-links/:id", checkAuthAPI, (req, res) => {
  const { id } = req.params;
  const { title, download_link } = req.body;

  if (!title || !download_link) {
    return res
      .status(400)
      .json({ error: "Title and download link are required" });
  }

  const sql =
    "UPDATE product_links SET title = ?, download_link = ? WHERE id = ?";

  db.query(sql, [title, download_link, id], (err, result) => {
    if (err) {
      console.error("Error updating product link:", err);
      return res.status(500).json({ error: "Failed to update product link" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product link not found" });
    }

    res.json({ message: "Product link updated successfully" });
  });
});

// Delete product link
app.delete("/admin/product-links/:id", checkAuthAPI, (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM product_links WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting product link:", err);
      return res.status(500).json({ error: "Failed to delete product link" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product link not found" });
    }

    res.json({ message: "Product link deleted successfully" });
  });
});

// Bulk import product links
app.post("/product-links/bulk", checkAuthAPI, (req, res) => {
  const data = req.body;

  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Invalid data format" });
  }

  // Convert object to array of [title, download_link] pairs
  const entries = Array.isArray(data)
    ? data.map((item) => [item.title, item.download_link])
    : Object.entries(data);

  if (entries.length === 0) {
    return res.status(400).json({ error: "No data to import" });
  }

  // Prepare bulk insert
  const sql = "INSERT INTO product_links (title, download_link) VALUES ?";

  db.query(sql, [entries], (err, result) => {
    if (err) {
      console.error("Error bulk importing product links:", err);
      return res.status(500).json({ error: "Failed to import product links" });
    }

    res.json({
      message: `Successfully imported ${result.affectedRows} product links`,
    });
  });
});

// Public product route - no authentication needed
app.get("/api/public/products", (req, res) => {
  db.query("SELECT * FROM products ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error("Error fetching public products:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to load products",
      });
    }
    console.log("Public products fetched:", results.length);
    res.json(results);
  });
});

// Add payment route before error handlers
app.post("/createOrder", async (req, res) => {
  try {
    const response = await paymentController.createOrder(req, res);
  } catch (error) {
    console.error("Payment route error:", error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
});

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// ==================== SERVER STARTUP ====================

// Check GitHub configuration on startup
console.log("🔧 GitHub Configuration:");
console.log("- Token:", GITHUB_CONFIG.token ? "✅ Set" : "❌ Missing");
console.log("- Repo:", GITHUB_CONFIG.repo);
console.log("- Branch:", GITHUB_CONFIG.branch);
console.log("- Path:", GITHUB_CONFIG.path);

if (!GITHUB_CONFIG.token) {
  console.warn("⚠️  WARNING: GITHUB_TOKEN is not set in environment variables");
}

if (GITHUB_CONFIG.repo === "your-username/your-repo") {
  console.warn(
    "⚠️  WARNING: GITHUB_REPO is not configured in environment variables"
  );
}

// Determine port with fallback
const PORT = process.env.PORT1 || 3000;

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
