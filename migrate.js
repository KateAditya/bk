const fs = require("fs");
const path = require("path");
const db = require("./db");

// Function to run SQL from file
function executeSqlFile(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Executing SQL file: ${filePath}`);

    // Read the SQL file
    fs.readFile(filePath, "utf8", (err, sql) => {
      if (err) {
        return reject(err);
      }

      // Split the SQL by semicolon to handle multiple statements
      const statements = sql
        .split(";")
        .filter((statement) => statement.trim().length > 0);

      // Execute each statement
      let completed = 0;
      statements.forEach((statement, index) => {
        db.query(statement, (err, results) => {
          if (err) {
            console.error(`Error executing statement ${index + 1}:`, err);
            return reject(err);
          }

          completed++;
          if (completed === statements.length) {
            console.log(`✅ Successfully applied ${filePath}`);
            resolve();
          }
        });
      });
    });
  });
}

// Function to add imagekit_file_id column to products table
function addImageKitFileIdColumn() {
  return new Promise((resolve, reject) => {
    console.log("Adding imagekit_file_id column to products table...");
    
    const sql = `
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS imagekit_file_id VARCHAR(255) 
      AFTER image_url
    `;
    
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error adding imagekit_file_id column:", err);
        return reject(err);
      }
      
      console.log("✅ Successfully added imagekit_file_id column to products table");
      resolve();
    });
  });
}

async function applyMigrations() {
  try {
    console.log("Applying database migrations...");

    // Add imagekit_file_id column to products table
    await addImageKitFileIdColumn();

    // Create product_links table
    await executeSqlFile(
      path.join(__dirname, "create_product_links_table.sql")
    );

    console.log("✅ All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

applyMigrations();
