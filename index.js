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
const ImageKit = require("imagekit");
const paymentController = require("./controllers/paymentController");

// ImageKit configuration - with fallback for missing credentials
let imagekit = null;
let imagekitConfigured = false;

const imagekitConfig = {
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
};

console.log("🔧 ImageKit Configuration Check:");
console.log("Public Key:", imagekitConfig.publicKey ? "✅ Set" : "❌ Missing");
console.log("Private Key:", imagekitConfig.privateKey ? "✅ Set" : "❌ Missing");
console.log("URL Endpoint:", imagekitConfig.urlEndpoint ? "✅ Set" : "❌ Missing");

if (imagekitConfig.publicKey && imagekitConfig.privateKey && imagekitConfig.urlEndpoint) {
  try {
    imagekit = new ImageKit(imagekitConfig);
    imagekitConfigured = true;
    console.log("✅ ImageKit configured successfully");
    
    // Test the configuration
    imagekit.listFiles({
      limit: 1,
      skip: 0
    }).then(() => {
      console.log("✅ ImageKit connection test successful");
    }).catch((error) => {
      console.error("❌ ImageKit connection test failed:", error.message);
      imagekitConfigured = false;
    });
    
  } catch (error) {
    console.error("❌ ImageKit initialization failed:", error.message);
    imagekitConfigured = false;
  }
} else {
  console.warn("⚠️ ImageKit configuration incomplete. Using placeholder images.");
  console.log("📝 To enable ImageKit uploads, set these environment variables:");
  console.log("   IMAGEKIT_PUBLIC_KEY=your_public_key");
  console.log("   IMAGEKIT_PRIVATE_KEY=your_private_key");
  console.log("   IMAGEKIT_URL_ENDPOINT=your_url_endpoint");
  console.log("");
  console.log("🔗 Get your ImageKit credentials from: https://imagekit.io/dashboard");
  console.log("📖 Setup guide: https://docs.imagekit.io/getting-started/quickstart-guides/setup-your-first-imagekit-integration");
  imagekitConfigured = false;
}

const app = express();

// Update CORS configuration for production
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5500",
        "https://bk-mu-five.vercel.app",
        "https://bk-theta.vercel.app",
        "https://www.dreamstoriesgraphics.com",
        "https://dreamstoriesgraphics.com"
      ];
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
  })
);

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session Management - Use memory store for Vercel
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: true, // Changed to true for better session persistence
  saveUninitialized: true, // Changed to true for better session persistence
  store: process.env.NODE_ENV === "production" ? 
    new session.MemoryStore() : 
    new MySQLStore({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: true,
      },
    }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === "production" ? ".dreamstoriesgraphics.com" : undefined,
  },
  name: 'sessionId', // Custom session name
};

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(session(sessionConfig));

// File upload configuration - Use memory storage for Vercel
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// ==================== ROUTE HANDLERS ====================

// Health check endpoint
app.get("/api/health", async (req, res) => {
  const imagekitStatus = {
    publicKey: !!process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: !!process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: !!process.env.IMAGEKIT_URL_ENDPOINT,
    configured: !!(process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT),
    connectionTest: false
  };

  // Test ImageKit connection if configured
  if (imagekitStatus.configured && imagekit) {
    try {
      await imagekit.listFiles({ limit: 1, skip: 0 });
      imagekitStatus.connectionTest = true;
    } catch (error) {
      imagekitStatus.connectionTest = false;
      imagekitStatus.connectionError = error.message;
    }
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    imagekit: imagekitStatus,
    message: imagekitStatus.configured && imagekitStatus.connectionTest ? 
      "ImageKit is configured and working" : 
      imagekitStatus.configured ? 
        "ImageKit is configured but connection test failed" :
        "ImageKit is not properly configured. Check IMAGEKIT_SETUP.md for instructions.",
    setupGuide: !imagekitStatus.configured ? "See IMAGEKIT_SETUP.md for setup instructions" : undefined
  });
});

// Add Image Upload Endpoint
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    if (!imagekitConfigured) {
      // Return a placeholder image URL when ImageKit is not configured
      const placeholderUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent(file.originalname)}`;
      console.log("⚠️ ImageKit not configured, using placeholder:", placeholderUrl);
      
      return res.json({
        success: true,
        url: placeholderUrl,
        fileId: null,
        message: "ImageKit not configured - using placeholder image"
      });
    }
    
    // Convert buffer to base64
    const fileData = file.buffer.toString('base64');
    
    // Upload to ImageKit
    const response = await imagekit.upload({
      file: fileData,
      fileName: file.originalname,
      folder: "/products",
    });
    
    console.log("✅ Image uploaded to ImageKit:", response.url);
    
    res.json({
      success: true,
      url: response.url,
      fileId: response.fileId,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    
    // If ImageKit fails, return a placeholder
    const placeholderUrl = `https://via.placeholder.com/400x300?text=Upload+Failed`;
    
    res.json({
      success: true,
      url: placeholderUrl,
      fileId: null,
      message: "ImageKit upload failed - using placeholder image",
      error: error.message
    });
  }
});

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
  console.log("🔍 Auth Check - Session ID:", req.sessionID);
  console.log("🔍 Auth Check - Session:", {
    isAuthenticated: req.session?.isAuthenticated,
    user: req.session?.user,
    cookie: req.session?.cookie
  });
  
  if (!req.session || !req.session.isAuthenticated) {
    console.log("❌ Authentication failed - Session state:", req.session);
    return res.status(401).json({
      success: false,
      message: "Please login first",
      sessionId: req.sessionID,
      hasSession: !!req.session,
      isAuthenticated: req.session?.isAuthenticated || false
    });
  }
  
  console.log("✅ Authentication successful for user:", req.session.user);
  next();
}

// Fixed page routes
app.get(["/dashboard", "/dashboard.html"], checkAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get(["/admin", "/admin.html"], checkAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
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
      // Set session data
      req.session.isAuthenticated = true;
      req.session.user = { username };
      req.session.loginTime = new Date().toISOString();

      console.log("🔐 Setting session data:", {
        sessionId: req.sessionID,
        isAuthenticated: req.session.isAuthenticated,
        user: req.session.user
      });

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("❌ Session save error:", err);
          return res.status(500).json({
            success: false,
            message: "Login failed - session error",
            error: process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }
        
        console.log("✅ Session saved successfully. Session ID:", req.sessionID);
        
        // Set cookie explicitly for better compatibility
        res.cookie('sessionId', req.sessionID, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: 24 * 60 * 60 * 1000,
          domain: process.env.NODE_ENV === "production" ? ".dreamstoriesgraphics.com" : undefined
        });

        res.json({
          success: true,
          message: "Login successful",
          redirectUrl: "/dashboard.html",
          sessionId: req.sessionID
        });
      });
    } else {
      console.log("❌ Invalid credentials for user:", username);
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.post("/api/logout", (req, res) => {
  console.log("🔍 Logout - Session ID:", req.sessionID);
  console.log("🔍 Logout - Session before destroy:", req.session);
  
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    
    console.log("✅ Session destroyed successfully");
    
    // Clear the session cookie
    res.clearCookie("sessionId", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.NODE_ENV === "production" ? ".dreamstoriesgraphics.com" : undefined
    });
    
    // Also clear the default connect.sid cookie
    res.clearCookie("connect.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.NODE_ENV === "production" ? ".dreamstoriesgraphics.com" : undefined
    });
    
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
  console.log("🔍 Check Auth - Session ID:", req.sessionID);
  console.log("🔍 Check Auth - Session:", req.session);
  
  if (req.session && req.session.isAuthenticated) {
    res.json({
      success: true,
      authenticated: true,
      user: req.session.user,
      sessionId: req.sessionID,
      loginTime: req.session.loginTime
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: "Not authenticated",
      sessionId: req.sessionID,
      hasSession: !!req.session,
      sessionData: req.session
    });
  }
});

// Session debugging endpoint
app.get("/api/session-debug", (req, res) => {
  res.json({
    sessionId: req.sessionID,
    session: req.session,
    cookies: req.headers.cookie,
    userAgent: req.headers['user-agent'],
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer
  });
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
app.post("/api/products", checkAuthAPI, upload.single("image"), async (req, res) => {
  console.log("🔄 Received request to add product");
  try {
    const { title, discount, price, description, view_link } = req.body;
    let image_url = req.body.image_url;

    // If file is present, handle image upload
    if (req.file) {
      if (imagekitConfigured) {
        try {
          const fileData = req.file.buffer.toString('base64');
          const response = await imagekit.upload({
            file: fileData,
            fileName: req.file.originalname,
            folder: "/products",
          });
          image_url = response.url;
          console.log("✅ Image uploaded to ImageKit successfully:", image_url);
        } catch (imagekitError) {
          console.error("❌ ImageKit upload failed:", imagekitError.message);
          // Use a placeholder image if ImageKit fails
          image_url = `https://via.placeholder.com/400x300?text=${encodeURIComponent(req.file.originalname)}`;
          console.log("⚠️ Using placeholder image due to ImageKit failure:", image_url);
        }
      } else {
        // ImageKit not configured, use placeholder
        image_url = `https://via.placeholder.com/400x300?text=${encodeURIComponent(req.file.originalname)}`;
        console.log("⚠️ ImageKit not configured, using placeholder:", image_url);
      }
    }

    // Validate required fields
    if (!title || !discount || !price || !description || !view_link || !image_url) {
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
            details: process.env.NODE_ENV === "development" ? err.message : undefined,
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
  } catch (err) {
    console.error("❌ Error in product creation:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Update product
app.put("/api/products/:id", checkAuthAPI, upload.single("image"), async (req, res) => {
  const productId = parseInt(req.params.id);
  const { title, discount, price, description, view_link } = req.body;
  let image_url = req.body.image_url;

  if (isNaN(productId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  try {
    // If a new file is uploaded, handle image upload
    if (req.file) {
      if (imagekitConfigured) {
        try {
          const fileData = req.file.buffer.toString('base64');
          const response = await imagekit.upload({
            file: fileData,
            fileName: req.file.originalname,
            folder: "/products",
          });
          image_url = response.url;
          console.log("✅ Image uploaded to ImageKit successfully:", image_url);
        } catch (imagekitError) {
          console.error("❌ ImageKit upload failed:", imagekitError.message);
          // Use a placeholder image if ImageKit fails
          image_url = `https://via.placeholder.com/400x300?text=${encodeURIComponent(req.file.originalname)}`;
          console.log("⚠️ Using placeholder image due to ImageKit failure:", image_url);
        }
      } else {
        // ImageKit not configured, use placeholder
        image_url = `https://via.placeholder.com/400x300?text=${encodeURIComponent(req.file.originalname)}`;
        console.log("⚠️ ImageKit not configured, using placeholder:", image_url);
      }
    } else {
      // If no new file, get existing image_url from database
      const existingProduct = await new Promise((resolve, reject) => {
        db.query("SELECT image_url FROM products WHERE id = ?", [productId], (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      });
      image_url = existingProduct.image_url;
    }

    // Validate required fields
    if (!title || !discount || !price || !description || !view_link || !image_url) {
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
  } catch (err) {
    console.error("❌ Error in product update:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Delete product
app.delete("/api/products/:id", checkAuthAPI, (req, res) => {
  const productId = parseInt(req.params.id);

  if (isNaN(productId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  console.log(`🔄 Deleting product ID: ${productId}`);

  db.query(
    "SELECT image_url FROM products WHERE id = ?",
    [productId],
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching product for deletion:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Delete the product from database
      db.query(
        "DELETE FROM products WHERE id = ?",
        [productId],
        (deleteErr) => {
          if (deleteErr) {
            console.error("❌ Error deleting product:", deleteErr);
            return res.status(500).json({ error: "Failed to delete product" });
          }

          console.log("✅ Product deleted successfully");
          res.json({
            success: true,
            message: "✅ Product deleted successfully!",
          });
        }
      );
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

// Determine port with fallback
const PORT = process.env.PORT || 3000;

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;
