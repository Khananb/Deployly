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

        console.log("Updating deployments table for project detection...");
        // Add project metadata columns to deployments
        await connection.query(`
            ALTER TABLE deployments 
            ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) NULL AFTER deploy_path,
            ADD COLUMN IF NOT EXISTS framework VARCHAR(50) NULL AFTER project_type,
            ADD COLUMN IF NOT EXISTS detected_at DATETIME NULL AFTER framework;
        `);

        console.log("Migration successful: Project Detection engine columns added safely.");
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
