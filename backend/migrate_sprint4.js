const db = require("./config/db");

async function runMigration() {
    console.log("Starting Sprint 4 Phase 1 Database Migration...");

    try {
        const [columns] = await db.execute("SHOW COLUMNS FROM websites");
        const columnNames = columns.map(col => col.Field);

        if (!columnNames.includes('allocated_port')) {
            console.log("Adding allocated_port to websites table...");
            await db.execute("ALTER TABLE websites ADD COLUMN allocated_port INT NULL");
        } else {
            console.log("allocated_port already exists.");
        }

        if (!columnNames.includes('pm2_process')) {
            console.log("Adding pm2_process to websites table...");
            await db.execute("ALTER TABLE websites ADD COLUMN pm2_process VARCHAR(255) NULL");
        } else {
            console.log("pm2_process already exists.");
        }

        if (!columnNames.includes('running_since')) {
            console.log("Adding running_since to websites table...");
            await db.execute("ALTER TABLE websites ADD COLUMN running_since DATETIME NULL");
        } else {
            console.log("running_since already exists.");
        }

        console.log("✅ Migration completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

runMigration();
