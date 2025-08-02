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
const paymentController = require("./controllers/paymentController");
const bunnyStorage = require("./utils/bunnystorage");

const app = express();

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5500",
        "https://bk-mu-five.vercel.app",
        "https://bk-theta.vercel.app",
      ];
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
  })
);

//bunny varification

// Add this test route to your main server file
app.get('/test-bunny', checkAuthAPI, async (req, res) => {
  try {
    const isConnected = await bunnyStorage.testConnection();
    res.json({ 
      success: isConnected, 
      message: isConnected ? 'Bunny.net connection successful' : 'Bunny.net connection failed' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Connection test failed', 
      error: error.message 
    });
  }
});

// Additional CORS headers
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
      res.set("Cache-Control", "public, max-age=31557600");
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

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
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

function checkAuthAPI(req, res, next) {
  if (!req.session || !req.session.isAuthenticated) {
    console.log("Session state:", req.session);
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }
  next();
}

// Protected pages
app.get(["/dashboard", "/dashboard.html"], checkAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get(["/admin", "/admin.html"], checkAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Admin product links
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

// Authentication endpoints
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for:", username);

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
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// Profile and auth check
app.get("/api/profile", (req, res) => {
  if (req.session.isAuthenticated) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

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

// ==================== PRODUCT ROUTES ====================

// Get all products
app.get("/api/products", checkAuthAPI, (req, res) => {
  db.query("SELECT * FROM products ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error("Error fetching products:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to load products",
      });
    }
    res.json(results);
  });
});

// Get product by ID
app.get("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  db.query("SELECT * FROM products WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error fetching product:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(results[0]);
  });
});

// Add product with image upload
app.post(
  "/api/products",
  checkAuthAPI,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, discount, price, description, view_link } = req.body;
      const file = req.file;

      if (
        !title ||
        !discount ||
        !price ||
        !description ||
        !view_link ||
        !file
      ) {
        if (file) fs.unlinkSync(file.path);
        return res.status(400).json({ error: "All fields are required" });
      }

      // Construct the remote path
      const remotePath = `products/${Date.now()}-${file.originalname}`;

      // Upload to Bunny.net storage
      const imageUrl = await bunnyStorage.uploadFile(file.path, remotePath);

      // Clean up local file
      fs.unlinkSync(file.path);

      // Verify the image URL was created
      if (!imageUrl) {
        throw new Error("Failed to generate image URL");
      }

      // Save to database
      const sql = `INSERT INTO products (title, image_url, discount, price, description, view_link) 
                 VALUES (?, ?, ?, ?, ?, ?)`;

      db.query(
        sql,
        [title, imageUrl, discount, price, description, view_link],
        (err, result) => {
          if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({
              error: "Failed to save product to database",
              success: false,
            });
          }

          res.status(201).json({
            success: true,
            message: "Product added successfully!",
            product: {
              id: result.insertId,
              title,
              image_url: imageUrl,
              discount,
              price,
              description,
              view_link,
            },
          });
        }
      );
    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({
        error: "Server error",
        details: error.message,
      });
    }
  }
);
// Update product
app.put("/api/products/:id", checkAuthAPI, async (req, res) => {
  const productId = parseInt(req.params.id);
  const { title, discount, price, description, view_link, image_url } =
    req.body;

  if (isNaN(productId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  if (!title || !discount || !price || !description || !view_link) {
    return res.status(400).json({
      error: "All fields are required",
    });
  }

  const sql = `UPDATE products 
               SET title = ?, image_url = ?, discount = ?, price = ?, description = ?, view_link = ? 
               WHERE id = ?`;

  db.query(
    sql,
    [title, image_url, discount, price, description, view_link, productId],
    (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Error updating product:", updateErr);
        return res.status(500).json({
          error: "Failed to update product",
          success: false,
        });
      }

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({
        success: true,
        message: "Product updated successfully!",
        product: {
          id: productId,
          title,
          image_url,
          discount,
          price,
          description,
          view_link,
        },
      });
    }
  );
});

// Delete product
app.delete("/api/products/:id", checkAuthAPI, async (req, res) => {
  const productId = parseInt(req.params.id);

  try {
    db.query(
      "SELECT image_url FROM products WHERE id = ?",
      [productId],
      async (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        if (results.length === 0) {
          return res.status(404).json({ error: "Product not found" });
        }

        const imageUrl = results[0].image_url;

        try {
          const remotePath = bunnyStorage.getRelativePathFromUrl(imageUrl);
          await bunnyStorage.deleteFile(remotePath);

          db.query(
            "DELETE FROM products WHERE id = ?",
            [productId],
            (deleteErr) => {
              if (deleteErr) {
                console.error("Database error:", deleteErr);
                return res.status(500).json({ error: "Database error" });
              }
              res.json({
                success: true,
                message: "Product deleted successfully",
              });
            }
          );
        } catch (bunnyError) {
          console.error("Bunny.net deletion error:", bunnyError);
          res.status(500).json({ error: "Failed to delete image" });
        }
      }
    );
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Product links management
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

// Public product route
app.get("/api/public/products", (req, res) => {
  db.query("SELECT * FROM products ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error("Error fetching public products:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to load products",
      });
    }
    res.json(results);
  });
});

// Payment route
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

// Error Handlers
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start Server
const PORT = process.env.PORT1 || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
