require("dotenv").config();
const mysql = require("mysql2/promise");
const dbConfig = require("./config/dbConfig");

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to MySQL.");

        console.log("Updating websites table...");
        
        await connection.query(`
            ALTER TABLE websites 
            ADD COLUMN IF NOT EXISTS live_url VARCHAR(255) NULL AFTER status;
        `);
        console.log("Added live_url to websites table.");

        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit();
    }
}

migrate();
