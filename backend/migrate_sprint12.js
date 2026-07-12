const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    console.log("Starting Sprint 12 Database Migration (Billing & Trial Automation)...");
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

        // 1. Add columns to users table
        await addColumnIfNotExists('users', 'billing_status', "ENUM('active', 'grace', 'suspended', 'paid') DEFAULT 'active'");
        await addColumnIfNotExists('users', 'trial_start_at', 'TIMESTAMP NULL DEFAULT NULL');
        await addColumnIfNotExists('users', 'trial_end_at', 'TIMESTAMP NULL DEFAULT NULL');
        await addColumnIfNotExists('users', 'paid_until', 'TIMESTAMP NULL DEFAULT NULL');
        await addColumnIfNotExists('users', 'eligible_for_deletion', 'BOOLEAN DEFAULT FALSE');

        // Backfill trial info for existing users
        console.log("Backfilling trial info for existing users...");
        await connection.execute(`
            UPDATE users 
            SET trial_start_at = created_at, 
                trial_end_at = DATE_ADD(created_at, INTERVAL 24 HOUR) 
            WHERE trial_start_at IS NULL
        `);

        // 2. Create billing_history table
        console.log("Creating billing_history table...");
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS billing_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                razorpay_payment_id VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                plan_name VARCHAR(100) NOT NULL,
                payment_status VARCHAR(50) NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                valid_from TIMESTAMP NULL,
                valid_until TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✔ billing_history table verified.");

        console.log("Sprint 12 Migration completed successfully.");
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
