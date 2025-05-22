require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const db = require("./db");
const { checkAuth } = require("./middleware/auth");
const adminRoutes = require("./adminRoutes");
const sessionStore = require("./sessionStore");

// Initialize Express app
const app = express();

// Common Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
      ];

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.startsWith("http://localhost:")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Cookie"],
    exposedHeaders: ["set-cookie"],
  })
);

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

// Configure Helmet with custom CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https:",
          "http:",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:"],
        fontSrc: ["'self'", "https:", "data:", "http:"],
        mediaSrc: ["'self'", "https:", "http:"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", "https:", "http:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
  })
);

app.use(morgan("combined"));

// Static file serving
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Session Management
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      sameSite: "lax", // Prevents CSRF, but allows links to work
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    },
    name: "sessionId", // Custom name for the session cookie
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// Environment Check for Razorpay keys
if (!process.env.RAZORPAY_ID_KEY || !process.env.RAZORPAY_SECRET_KEY) {
  console.error("❌ Missing Razorpay API keys. Set them in .env");
  process.exit(1);
}

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure uploads directory exists
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Admin authentication credentials
const adminUser = {
  username: "GauriS",
  password: "Mahakal@220501",
};

// ==================== ROUTE HANDLERS ====================

// Public routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Protected routes and pages
app.get("/admin.html", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/dashboard.html", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.use("/admin", checkAuth, adminRoutes);

// Protect product modification routes but keep GET public
app.use("/api/products", (req, res, next) => {
  if (req.method !== "GET") {
    return checkAuth(req, res, next);
  }
  next();
});

// Authentication endpoints
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const adminUser = {
    username: "admin",
    password: "admin123",
  };

  const activeSession = sessionStore.getActiveSession();
  if (activeSession && activeSession !== req.sessionID) {
    return res.status(403).json({
      success: false,
      message: "Another user is already logged in. Please try again later.",
    });
  }

  if (username === adminUser.username && password === adminUser.password) {
    req.session.isAuthenticated = true;
    req.session.user = { username };
    sessionStore.setActiveSession(req.sessionID);

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Login failed" });
      }
      res.json({ success: true });
    });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.post("/api/logout", (req, res) => {
  if (req.session) {
    sessionStore.clearActiveSession();
    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Logout failed" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  } else {
    res.json({ success: true, message: "Already logged out" });
  }
});

// ==================== PRODUCT ROUTES ====================

// Get all products
app.get("/api/products", (req, res) => {
  db.query("SELECT * FROM products", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get product by ID
app.get("/api/products/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM products WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Product not found" });
    res.json(results[0]);
  });
});

// Add product
app.post("/api/products", upload.single("image"), (req, res) => {
  console.log("Received request to add product");
  console.log("Form body:", req.body);
  console.log("Uploaded file:", req.file);

  const { title, discount, price, description, view_link } = req.body;

  // Validate file upload
  if (!req.file) {
    console.log("❌ No image uploaded");
    return res.status(400).json({ error: "Image file is required" });
  }

  // Validate required fields
  if (!title || !discount || !price || !description || !view_link) {
    console.log("❌ Missing required fields");
    return res.status(400).json({
      error: "All fields are required",
      received: { title, discount, price, description, view_link },
    });
  }

  const image_url = `/uploads/${req.file.filename}`;

  // Convert price to number and validate
  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice)) {
    console.log("❌ Invalid price value:", price);
    return res.status(400).json({ error: "Invalid price value" });
  }

  const sql = `INSERT INTO products (title, image_url, discount, price, description, view_link) 
               VALUES (?, ?, ?, ?, ?, ?)`;

  console.log("Executing SQL:", sql);
  console.log("Values:", [
    title,
    image_url,
    discount,
    numericPrice,
    description,
    view_link,
  ]);

  db.query(
    sql,
    [title, image_url, discount, numericPrice, description, view_link],
    (err, result) => {
      if (err) {
        console.error("❌ Database Error:", err);
        return res.status(500).json({
          error: "Failed to save product to database",
          details: err.message,
        });
      }

      console.log("✅ Product added successfully:", result);

      // If successful, send back the created product's data
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

// Delete product
app.delete("/api/products/:id", (req, res) => {
  const productId = req.params.id;

  db.query(
    "SELECT image_url FROM products WHERE id = ?",
    [productId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Product not found" });

      const imagePath = path.join(__dirname, results[0].image_url);

      db.query("DELETE FROM products WHERE id = ?", [productId], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        fs.unlink(imagePath, (err3) => {
          if (err3) console.error("Failed to delete image:", err3);
          res.json({ message: "✅ Product deleted" });
        });
      });
    }
  );
});

// Update product
app.put("/api/products/:id", upload.single("image"), (req, res) => {
  const productId = req.params.id;
  const { title, discount, price, description, view_link } = req.body;

  db.query(
    "SELECT image_url FROM products WHERE id = ?",
    [productId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Product not found" });

      let image_url = results[0].image_url;

      if (req.file) {
        const newImageUrl = `/uploads/${req.file.filename}`;
        const oldImagePath = path.join(__dirname, image_url);

        fs.unlink(oldImagePath, (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting old image:", unlinkErr);
        });

        image_url = newImageUrl;
      }

      const sql = `
      UPDATE products 
      SET title = ?, image_url = ?, discount = ?, price = ?, description = ?, view_link = ? WHERE id = ?`;

      db.query(
        sql,
        [title, image_url, discount, price, description, view_link, productId],
        (updateErr) => {
          if (updateErr)
            return res.status(500).json({ error: updateErr.message });
          res.json({ message: "✅ Product updated" });
        }
      );
    }
  );
});

app.get("/admin/product-links", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM product_links ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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

// Determine port with fallback
const PORT = process.env.PORT || 3000;

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
