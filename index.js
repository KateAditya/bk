require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const db = require("./db");
const { checkAuth } = require("./middleware/auth");
const adminRoutes = require("./adminRoutes");

const app = express();

// Update CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5500",
        "https://your-vercel-domain.vercel.app", // Add your Vercel domain
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Remove the custom CORS middleware and replace with this
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
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
const options = {
  host: process.env.DB_HOST || "localhost",
  port: 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "album_store",
};

const sessionStore = new MySQLStore(options);

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
      domain: process.env.NODE_ENV === "production" ? ".vercel.app" : undefined,
    },
    name: "sessionId",
  })
);

// Environment Check for Razorpay keys

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

// ==================== ROUTE HANDLERS ====================

// Public routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Protected routes
app.get(["/dashboard", "/dashboard.html"], checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get(["/admin", "/admin.html"], checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Authentication endpoints
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", { username });

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
const PORT = process.env.PORT1 || 3000;

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
