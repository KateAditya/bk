const mysql = require("mysql2");

const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false,
  },
};

// Create the connection pool
const pool = mysql.createPool(config);

// Test connection and log details
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    return;
  }
  console.log("✅ Connected to MySQL Database at:", process.env.DB_HOST);
  connection.release();
});

// Export both regular pool and promise pool
module.exports = pool;
module.exports.promise = pool.promise();
