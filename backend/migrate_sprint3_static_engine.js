require("dotenv").config();
const db = require("./config/db");

async function migrate() {
    let connection;
    try {
        connection = await db.getConnection();
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
            connection.release();
        }
        process.exit();
    }
}

migrate();
