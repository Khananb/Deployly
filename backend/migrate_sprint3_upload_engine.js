require("dotenv").config();
const mysql = require("mysql2/promise");

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "deployly",
    password: process.env.DB_PASSWORD || "deployly_pass",
    database: process.env.DB_NAME || "deployly",
};

async function runMigration() {
    console.log("Connecting to database...");
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to MySQL.");

        console.log("Updating deployments table ENUM and adding columns...");
        
        await connection.query(`
            ALTER TABLE deployments 
            MODIFY COLUMN status ENUM('pending', 'uploaded', 'validating', 'deploying', 'running', 'failed', 'ready', 'deployed') NOT NULL DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS upload_path VARCHAR(255) NULL AFTER status,
            ADD COLUMN IF NOT EXISTS extract_path VARCHAR(255) NULL AFTER upload_path,
            ADD COLUMN IF NOT EXISTS deploy_path VARCHAR(255) NULL AFTER extract_path;
        `);

        console.log("Migration successful: Added 'validating', 'deployed', and path columns to deployments table.");
    } catch (error) {
        console.error("Migration failed:", error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log("Database connection closed.");
        }
    }
}

runMigration();
