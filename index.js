/* =========================================================
   server.js  –  ImageKit Edition (No Cloudinary)
   =========================================================*/
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const ImageKit = require("imagekit");

const db = require("./db");
const paymentController = require("./controllers/paymentController");
const { checkAuth } = require("./middleware/auth");
const adminRoutes = require("./adminRoutes");

/* ---------------------------------------------------------
   1️⃣  ImageKit SDK  (uses env vars)
   ---------------------------------------------------------*/
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/* ---------------------------------------------------------
   2️⃣  Express App
   ---------------------------------------------------------*/
const app = express();

/* ---------------------------------------------------------
   3️⃣  CORS
   ---------------------------------------------------------*/
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5500",
      "https://bk-mu-five.vercel.app",
      "https://bk-theta.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
  })
);

/* ---------------------------------------------------------
   4️⃣  Static & Body parsing
   ---------------------------------------------------------*/
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.set("Access-Control-Allow-Origin", "*");
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------------------------------------------------
   5️⃣  Session Store
   ---------------------------------------------------------*/
const sessionOptions = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true },
};
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "fallback-secret",
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
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(session(sessionConfig));

/* ---------------------------------------------------------
   6️⃣  Multer (local temp storage)
   ---------------------------------------------------------*/
const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
    cb(null, "uploads/");
  },
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* ---------------------------------------------------------
   7️⃣  Helper: Upload to ImageKit & delete temp file
   ---------------------------------------------------------*/
function uploadToImageKit(localPath, fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(localPath, (err, buffer) => {
      if (err) return reject(err);
      imagekit.upload(
        {
          file: buffer,
          fileName,
          folder: "/products",
        },
        (ikErr, result) => {
          fs.unlinkSync(localPath); // cleanup temp
          if (ikErr) return reject(ikErr);
          resolve(result.url); // ImageKit URL
        }
      );
    });
  });
}

/* =========================================================
   8️⃣  ROUTES
   =========================================================*/

/* ---------- Public Pages ---------- */
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);
app.get(["/login", "/login.html"], (_, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html"))
);

/* ---------- Auth Middlewares ---------- */
const checkAuthPage = (req, res, next) => {
  if (!req.session?.isAuthenticated) return res.redirect("/login.html");
  next();
};
const checkAuthAPI = (req, res, next) => {
  if (!req.session?.isAuthenticated)
    return res
      .status(401)
      .json({ success: false, message: "Please login first" });
  next();
};

/* ---------- Protected Pages ---------- */
app.get(["/dashboard", "/dashboard.html"], checkAuthPage, (_, res) =>
  res.sendFile(path.join(__dirname, "public", "dashboard.html"))
);
app.get(["/admin", "/admin.html"], checkAuthPage, (_, res) =>
  res.sendFile(path.join(__dirname, "public", "admin.html"))
);

/* ---------- Auth Endpoints ---------- */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAuthenticated = true;
    req.session.user = { username };
    return req.session.save((err) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Login failed" });
      res.json({ success: true, redirectUrl: "/dashboard.html" });
    });
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err)
      return res.status(500).json({ success: false, message: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out" });
  });
});
app.get("/api/check-auth", (req, res) => {
  res.json(
    req.session?.isAuthenticated
      ? { success: true, authenticated: true, user: req.session.user }
      : { success: false, authenticated: false }
  );
});

/* =========================================================
   9️⃣  PRODUCTS API  (ImageKit)
   =========================================================*/

/* GET all (protected) */
app.get("/api/products", checkAuthAPI, (_, res) => {
  db.query("SELECT * FROM products ORDER BY id DESC", (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, message: "DB error" });
    res.json(rows);
  });
});

/* GET single */
app.get("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  db.query("SELECT * FROM products WHERE id=?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  });
});

/* POST – create new */
app.post(
  "/api/products",
  checkAuthAPI,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, discount, price, description, view_link } = req.body;
      if (!title || !discount || !price || !description || !view_link)
        return res.status(400).json({ error: "All fields required" });
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice <= 0)
        return res.status(400).json({ error: "Invalid price" });

      let imageUrl = "";
      if (req.file)
        imageUrl = await uploadToImageKit(req.file.path, req.file.filename);
      else imageUrl = req.body.image_url;

      const sql = `INSERT INTO products
      (title,image_url,discount,price,description,view_link)
      VALUES (?,?,?,?,?,?)`;
      db.query(
        sql,
        [title, imageUrl, discount, numericPrice, description, view_link],
        (err, result) => {
          if (err) return res.status(500).json({ error: "DB error" });
          res.status(201).json({
            success: true,
            message: "✅ Product added!",
            productId: result.insertId,
          });
        }
      );
    } catch (upErr) {
      console.error(upErr);
      res.status(500).json({ error: "Image upload failed" });
    }
  }
);

/* PUT – update */
app.put(
  "/api/products/:id",
  checkAuthAPI,
  upload.single("image"),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, discount, price, description, view_link } = req.body;
      if (
        isNaN(id) ||
        !title ||
        !discount ||
        !price ||
        !description ||
        !view_link
      )
        return res.status(400).json({ error: "Invalid data" });
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice <= 0)
        return res.status(400).json({ error: "Invalid price" });

      let imageUrl = "";
      if (req.file)
        imageUrl = await uploadToImageKit(req.file.path, req.file.filename);
      else imageUrl = req.body.image_url;

      const sql = `UPDATE products
                 SET title=?,image_url=?,discount=?,price=?,description=?,view_link=?
                 WHERE id=?`;
      db.query(
        sql,
        [title, imageUrl, discount, numericPrice, description, view_link, id],
        (err, result) => {
          if (err) return res.status(500).json({ error: "DB error" });
          if (!result.affectedRows)
            return res.status(404).json({ error: "Not found" });
          res.json({ success: true, message: "✅ Product updated!" });
        }
      );
    } catch (upErr) {
      console.error(upErr);
      res.status(500).json({ error: "Image upload failed" });
    }
  }
);

/* DELETE */
app.delete("/api/products/:id", checkAuthAPI, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  try {
    const [rows] = await new Promise((resolve, reject) => {
      db.query("SELECT image_url FROM products WHERE id=?", [id], (err, r) =>
        err ? reject(err) : resolve(r)
      );
    });
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    const imageUrl = rows[0].image_url;
    const fileId = imageUrl.split("/").pop().split("?")[0];

    await new Promise((resolve, reject) => {
      db.query("DELETE FROM products WHERE id=?", [id], (err, r) =>
        err ? reject(err) : resolve(r)
      );
    });

    imagekit.deleteFile(fileId, (ikErr) => {
      if (ikErr) console.warn("⚠️ ImageKit delete warn:", ikErr);
    });
    res.json({ success: true, message: "✅ Product deleted!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ---------- Public products ---------- */
app.get("/api/public/products", (_, res) => {
  db.query("SELECT * FROM products ORDER BY id DESC", (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, message: "DB error" });
    res.json(rows);
  });
});

/* ---------- Product Links CRUD ---------- */
app.get("/admin/product-links", checkAuthAPI, (_, res) =>
  db.query("SELECT * FROM product_links ORDER BY id DESC", (err, r) =>
    err ? res.status(500).json({ message: "Server error" }) : res.json(r)
  )
);
app.get("/admin/product-titles", checkAuthAPI, (_, res) =>
  db.query("SELECT title FROM products", (err, r) =>
    err
      ? res.status(500).json({ success: false, message: "DB error" })
      : res.json(r)
  )
);
app.post("/admin/product-links", checkAuthAPI, (req, res) => {
  const { title, download_link } = req.body;
  if (!title || !download_link)
    return res.status(400).json({ error: "Required" });
  db.query(
    "INSERT INTO product_links (title,download_link) VALUES (?,?)",
    [title, download_link],
    (err, result) =>
      err
        ? res.status(500).json({ error: "Failed" })
        : res.status(201).json({ message: "Link added", id: result.insertId })
  );
});
app.put("/admin/product-links/:id", checkAuthAPI, (req, res) => {
  const { id } = req.params,
    { title, download_link } = req.body;
  if (!title || !download_link)
    return res.status(400).json({ error: "Required" });
  db.query(
    "UPDATE product_links SET title=?,download_link=? WHERE id=?",
    [title, download_link, id],
    (err, r) =>
      !r?.affectedRows
        ? res.status(404).json({ error: "Not found" })
        : res.json({ message: "Link updated" })
  );
});
app.delete("/admin/product-links/:id", checkAuthAPI, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM product_links WHERE id=?", [id], (err, r) =>
    !r?.affectedRows
      ? res.status(404).json({ error: "Not found" })
      : res.json({ message: "Link deleted" })
  );
});

/* ---------- Bulk import links ---------- */
app.post("/product-links/bulk", checkAuthAPI, (req, res) => {
  const data = req.body;
  if (!data || typeof data !== "object")
    return res.status(400).json({ error: "Invalid" });
  const entries = Array.isArray(data)
    ? data.map((i) => [i.title, i.download_link])
    : Object.entries(data);
  if (!entries.length) return res.status(400).json({ error: "No data" });
  db.query(
    "INSERT INTO product_links (title,download_link) VALUES ?",
    [entries],
    (err, r) =>
      err
        ? res.status(500).json({ error: "Import failed" })
        : res.json({ message: `Imported ${r.affectedRows} links` })
  );
});

/* ---------- Payment ---------- */
app.post("/createOrder", async (req, res) => {
  try {
    await paymentController.createOrder(req, res);
  } catch (e) {
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
});

/* ---------- Error Handlers ---------- */
app.use((_, res) => res.status(404).json({ error: "Route not found" }));
app.use(
  (err, _, res, __) => (
    console.error("❌", err.stack),
    res.status(500).json({ error: "Internal Server Error" })
  )
);

/* ---------- Start Server ---------- */
const PORT = process.env.PORT1 || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
