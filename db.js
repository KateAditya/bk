const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Aditya@2003",
  database: "album_store",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Convert pool to use promises
const promisePool = pool.promise();

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    return;
  }
  console.log("✅ Connected to MySQL Database");
  connection.release();
});

// Export both regular pool and promise pool
module.exports = pool;
module.exports.promise = promisePool;
