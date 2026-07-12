const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const os = require("os");

const getHealthStatus = async (req, res) => {
    // Check DB status
    let dbStatus = "ok";
    try {
        await db.execute("SELECT 1");
    } catch (err) {
        dbStatus = "error";
    }

    // Check Storage status
    let storageStatus = "ok";
    try {
        const directories = ["logs", "uploads", "sites"];
        for (const dir of directories) {
            const dirPath = path.join(__dirname, "../../storage", dir);
            // Check if directory exists
            if (!fs.existsSync(dirPath)) {
                throw new Error(`Directory does not exist: ${dirPath}`);
            }
            // Check if writable by creating a test file
            const testFile = path.join(dirPath, ".health_test");
            fs.writeFileSync(testFile, "test");
            fs.unlinkSync(testFile);
        }
    } catch (err) {
        storageStatus = "error";
    }

    const memoryUsage = process.memoryUsage();
    
    res.json({
        api: "ok",
        database: dbStatus,
        storage: storageStatus,
        version: "1.0.0",
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
        },
        nodeVersion: process.version
    });
};

module.exports = { getHealthStatus };
