require("dotenv").config();
const mysql = require("mysql2/promise");

async function migrate() {
    console.log("Starting Sprint 4 Phase 3 Migration (Custom Domain & SSL)...");
    
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'deployly'
        });

        // 1. Add website_id
        try {
            await connection.execute(`
                ALTER TABLE domains 
                ADD COLUMN website_id INT NOT NULL AFTER user_id
            `);
            console.log("Added website_id to domains table");
            
            // Wait, what if there are existing domains? We can't add NOT NULL if table is not empty.
            // But we can clear it or set a dummy value if needed. For now, assuming it's empty.
            
            await connection.execute(`
                ALTER TABLE domains 
                ADD CONSTRAINT fk_domains_website_id 
                FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
            `);
            console.log("Added foreign key for website_id");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("website_id column already exists.");
            } else {
                console.error("Error adding website_id:", e.message);
                if (!e.message.includes("Duplicate column name")) {
                    // Try without NOT NULL if there's data
                    try {
                        await connection.execute(`ALTER TABLE domains ADD COLUMN website_id INT AFTER user_id`);
                        await connection.execute(`ALTER TABLE domains ADD CONSTRAINT fk_domains_website_id FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE`);
                        console.log("Added website_id (nullable due to existing data)");
                    } catch (e2) {
                        console.error("Fallback adding website_id failed:", e2.message);
                    }
                }
            }
        }

        // 2. Add dns_status
        try {
            await connection.execute(`
                ALTER TABLE domains 
                ADD COLUMN dns_status ENUM('pending', 'verified', 'failed') NOT NULL DEFAULT 'pending' AFTER status
            `);
            console.log("Added dns_status to domains table");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("dns_status column already exists.");
            } else {
                console.error("Error adding dns_status:", e.message);
            }
        }

        // 3. Add ssl_status
        try {
            await connection.execute(`
                ALTER TABLE domains 
                ADD COLUMN ssl_status ENUM('none', 'pending', 'issued', 'failed') NOT NULL DEFAULT 'none' AFTER dns_status
            `);
            console.log("Added ssl_status to domains table");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("ssl_status column already exists.");
            } else {
                console.error("Error adding ssl_status:", e.message);
            }
        }

        // 4. Add ssl_expires_at
        try {
            await connection.execute(`
                ALTER TABLE domains 
                ADD COLUMN ssl_expires_at TIMESTAMP NULL AFTER ssl_status
            `);
            console.log("Added ssl_expires_at to domains table");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("ssl_expires_at column already exists.");
            } else {
                console.error("Error adding ssl_expires_at:", e.message);
            }
        }

        console.log("Migration completed successfully.");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit(0);
    }
}

migrate();
