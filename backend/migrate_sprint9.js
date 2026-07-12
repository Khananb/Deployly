const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    console.log("Starting Sprint 9 Database Migration...");
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        // Safe column addition helper
        const addColumnIfNotExists = async (table, column, definition) => {
            const [rows] = await connection.execute(`
                SELECT COUNT(*) as count 
                FROM information_schema.columns 
                WHERE table_schema = ? AND table_name = ? AND column_name = ?
            `, [process.env.DB_NAME, table, column]);

            if (rows[0].count === 0) {
                console.log(`Adding column ${column} to ${table}...`);
                await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`✔ Column ${column} added successfully.`);
            } else {
                console.log(`✔ Column ${column} already exists in ${table}. Skipping.`);
            }
        };

        // 1. Add new columns to websites table
        await addColumnIfNotExists('websites', 'pm2_process', 'VARCHAR(255) DEFAULT NULL');
        await addColumnIfNotExists('websites', 'pm2_id', 'INT DEFAULT NULL');
        await addColumnIfNotExists('websites', 'last_deployed_at', 'TIMESTAMP NULL DEFAULT NULL');
        await addColumnIfNotExists('websites', 'started_at', 'TIMESTAMP NULL DEFAULT NULL');
        await addColumnIfNotExists('websites', 'last_error', 'TEXT DEFAULT NULL');

        // 2. Extend ENUM for websites.status
        console.log("Extending ENUM for websites.status...");
        await connection.execute(`
            ALTER TABLE websites 
            MODIFY COLUMN status ENUM(
                'pending', 'uploading', 'uploaded', 
                'deploying', 'installing', 'starting', 
                'running', 'failed', 'stopping', 'stopped', 'ready'
            ) NOT NULL DEFAULT 'pending'
        `);
        console.log("✔ websites.status ENUM updated.");

        // 3. Extend ENUM for deployments.status
        console.log("Extending ENUM for deployments.status...");
        await connection.execute(`
            ALTER TABLE deployments 
            MODIFY COLUMN status ENUM(
                'pending', 'uploading', 'uploaded', 
                'deploying', 'installing', 'starting', 
                'running', 'failed', 'stopping', 'stopped', 'ready'
            ) NOT NULL DEFAULT 'pending'
        `);
        console.log("✔ deployments.status ENUM updated.");

        console.log("Sprint 9 Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error.message);
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

migrate();
