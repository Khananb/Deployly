require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const dbConfig = {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || "deployly",
        password: process.env.DB_PASSWORD || "Deployly@123",
        database: process.env.DB_NAME || "deployly"
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to the database. Starting migration...");

        await connection.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                max_slots INT NOT NULL,
                used_slots INT NOT NULL DEFAULT 0,
                status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                storage_limit_mb INT NOT NULL,
                website_limit INT NOT NULL,
                domain_limit INT NOT NULL,
                mysql_limit INT NOT NULL,
                node_limit INT NOT NULL,
                php_limit INT NOT NULL,
                bandwidth_limit_gb INT NOT NULL,
                email_limit INT NOT NULL,
                razorpay_plan_id VARCHAR(255) NULL,
                razorpay_product_id VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);
        console.log("Plans table created.");

        // Check if Founder Edition exists
        const [rows] = await connection.query(`SELECT id FROM plans WHERE name = 'Founder Edition'`);
        if (rows.length === 0) {
            await connection.query(`
                INSERT INTO plans (
                    name, price, max_slots, storage_limit_mb, website_limit, 
                    domain_limit, mysql_limit, node_limit, php_limit, bandwidth_limit_gb, email_limit, status
                ) VALUES (
                    'Founder Edition', 79.00, 20, 1536, 1, 1, 1, 1, 1, 1000, 1, 'ACTIVE'
                );
            `);
            console.log("Founder Edition plan inserted.");
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                plan_id INT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
            );
        `);
        console.log("Subscriptions table created.");

        // Assign all existing users the Founder Plan if they don't have a subscription
        const [users] = await connection.query(`SELECT id FROM users`);
        if (users.length > 0) {
            const [founderPlan] = await connection.query(`SELECT id FROM plans WHERE name = 'Founder Edition'`);
            if (founderPlan.length > 0) {
                const planId = founderPlan[0].id;
                for (const user of users) {
                    const [subs] = await connection.query(`SELECT id FROM subscriptions WHERE user_id = ?`, [user.id]);
                    if (subs.length === 0) {
                        await connection.query(`
                            INSERT INTO subscriptions (user_id, plan_id, status) VALUES (?, ?, 'ACTIVE')
                        `, [user.id, planId]);
                        
                        // Increment used_slots but don't cap it for existing users here just to be safe, 
                        // or we just update the used_slots count at the end.
                    }
                }
                
                // Recalculate used slots based on subscriptions
                const [totalSubs] = await connection.query(`SELECT COUNT(*) as count FROM subscriptions WHERE plan_id = ?`, [planId]);
                const used = totalSubs[0].count;
                let status = 'ACTIVE';
                
                const [planData] = await connection.query(`SELECT max_slots FROM plans WHERE id = ?`, [planId]);
                if (used >= planData[0].max_slots) {
                    status = 'OUT_OF_STOCK';
                }
                
                await connection.query(`UPDATE plans SET used_slots = ?, status = ? WHERE id = ?`, [used, status, planId]);
                console.log(`Updated Founder Edition plan. Used slots: ${used}, Status: ${status}`);
            }
        }

        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

migrate();
