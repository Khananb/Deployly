const db = require('./config/db');

async function fix() {
    try {
        await db.execute("ALTER TABLE websites MODIFY COLUMN type ENUM('node', 'static', 'php', 'unknown') NOT NULL DEFAULT 'unknown'");
        console.log("Successfully altered websites table");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}

fix();
