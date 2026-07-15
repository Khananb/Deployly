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

const getDoctorStatus = async (req, res) => {
    const util = require('util');
    const exec = util.promisify(require('child_process').exec);
    const startOverall = Date.now();
    
    let totalScore = 0;
    let maxScore = 0;
    const isWindows = process.platform === 'win32';

    const addScore = (severity, weight = 1) => {
        maxScore += weight;
        if (severity === 'healthy') totalScore += weight;
        else if (severity === 'warning') totalScore += weight * 0.5;
    };

    const results = {};

    // Helper to measure latency
    const measure = async (name, weight, fn) => {
        const start = Date.now();
        try {
            const result = await fn();
            const latency = Date.now() - start;
            results[name] = { ...result, latency: `${latency} ms` };
            addScore(result.severity, weight);
        } catch (err) {
            const latency = Date.now() - start;
            results[name] = { status: 'Critical Error', severity: 'critical', message: err.message, latency: `${latency} ms` };
            addScore('critical', weight);
        }
    };

    // 1. Backend API
    await measure('api', 1, async () => ({ status: 'Healthy', severity: 'healthy', message: 'API is responding normally' }));

    // 2. MariaDB
    await measure('database', 2, async () => {
        await db.execute("SELECT 1");
        return { status: 'Connected', severity: 'healthy', message: 'MariaDB connection successful' };
    });

    // 3. PM2
    await measure('pm2', 2, async () => {
        try {
            const { stdout } = await exec('pm2 -v');
            return { status: 'Active', severity: 'healthy', message: `PM2 version ${stdout.trim()}` };
        } catch {
            return { status: 'Missing', severity: 'critical', message: 'PM2 is not installed or running' };
        }
    });

    // 4. Nginx
    await measure('nginx', 2, async () => {
        if (isWindows) return { status: 'Mocked', severity: 'healthy', message: 'Nginx mocked for local development' };
        try {
            const { stderr } = await exec('nginx -v');
            return { status: 'Active', severity: 'healthy', message: stderr.trim() || 'Nginx is active' };
        } catch {
            return { status: 'Missing', severity: 'critical', message: 'Nginx is not installed or running' };
        }
    });

    // 5. Disk
    await measure('disk', 1, async () => {
        if (isWindows) {
            const { stdout } = await exec('wmic logicaldisk get freespace,size');
            const lines = stdout.trim().split('\n');
            if (lines.length > 1) {
                const parts = lines[1].trim().split(/\s+/);
                const free = parseInt(parts[0]) / (1024 ** 3);
                const total = parseInt(parts[1]) / (1024 ** 3);
                const percent = Math.round((free / total) * 100);
                const severity = percent < 10 ? 'critical' : percent < 20 ? 'warning' : 'healthy';
                return { status: `${percent}% Free`, severity, message: `${free.toFixed(1)} GB free of ${total.toFixed(1)} GB` };
            }
        } else {
            const { stdout } = await exec('df -h /');
            const lines = stdout.trim().split('\n');
            if (lines.length > 1) {
                const parts = lines[1].trim().split(/\s+/);
                const percentUsed = parseInt(parts[4].replace('%', ''));
                const freeSpace = parts[3];
                const severity = percentUsed > 90 ? 'critical' : percentUsed > 80 ? 'warning' : 'healthy';
                return { status: `${100 - percentUsed}% Free`, severity, message: `${freeSpace} available` };
            }
        }
        return { status: 'Unknown', severity: 'warning', message: 'Could not determine disk space' };
    });

    // 6. RAM
    await measure('memory', 1, async () => {
        const free = os.freemem() / (1024 ** 3);
        const total = os.totalmem() / (1024 ** 3);
        const percent = Math.round((free / total) * 100);
        const severity = percent < 10 ? 'critical' : percent < 20 ? 'warning' : 'healthy';
        return { status: `${percent}% Free`, severity, message: `${free.toFixed(1)} GB free of ${total.toFixed(1)} GB` };
    });

    // 7. CPU
    await measure('cpu', 1, async () => {
        const cpus = os.cpus();
        const load = os.loadavg()[0];
        const cores = cpus.length;
        const loadPercent = Math.round((load / cores) * 100);
        const severity = loadPercent > 90 ? 'critical' : loadPercent > 75 ? 'warning' : 'healthy';
        return { status: `${loadPercent}% Load`, severity, message: `${cores} Cores, 1m avg: ${load.toFixed(2)}` };
    });

    // 8. Storage Folders & Permissions
    await measure('storage', 1, async () => {
        const dirs = ["logs", "uploads", "live", "sites"];
        let missing = [];
        let unwritable = [];
        for (const dir of dirs) {
            const dirPath = path.join(__dirname, "../../storage", dir);
            if (!fs.existsSync(dirPath)) {
                missing.push(dir);
            } else {
                try {
                    fs.accessSync(dirPath, fs.constants.W_OK);
                } catch {
                    unwritable.push(dir);
                }
            }
        }
        if (missing.length > 0 || unwritable.length > 0) {
            return { status: 'Issues Found', severity: 'critical', message: `Missing: ${missing.join(',') || 'none'}, Unwritable: ${unwritable.join(',') || 'none'}` };
        }
        return { status: 'Writable', severity: 'healthy', message: 'All storage directories exist and are writable' };
    });

    // 9. Certbot
    await measure('ssl', 1, async () => {
        if (isWindows) return { status: 'Mocked', severity: 'healthy', message: 'Certbot mocked for local development' };
        try {
            const { stdout } = await exec('certbot --version');
            return { status: 'Active', severity: 'healthy', message: stdout.trim() };
        } catch {
            return { status: 'Missing', severity: 'critical', message: 'Certbot is not installed' };
        }
    });

    // 10. Port Manager
    await measure('ports', 1, async () => {
        const [rows] = await db.execute("SELECT MAX(allocated_port) as max_port, COUNT(*) as count FROM websites WHERE allocated_port IS NOT NULL");
        const maxPort = rows[0].max_port || 0;
        const totalAllocated = rows[0].count;
        return { status: 'Healthy', severity: 'healthy', message: `${totalAllocated} active allocations, max port: ${maxPort}` };
    });

    // 11. Node Version
    await measure('nodejs', 1, async () => ({ status: 'Installed', severity: 'healthy', message: `Node.js ${process.version}` }));

    // 12. NPM Version
    await measure('npm', 1, async () => {
        try {
            const { stdout } = await exec('npm -v');
            return { status: 'Installed', severity: 'healthy', message: `NPM ${stdout.trim()}` };
        } catch {
            return { status: 'Missing', severity: 'critical', message: 'NPM is not installed' };
        }
    });

    const overallScore = Math.round((totalScore / maxScore) * 100);
    const overallLatency = Date.now() - startOverall;

    res.json({
        healthScore: overallScore,
        totalLatency: `${overallLatency} ms`,
        results
    });
};

module.exports = {
    getHealthStatus,
    getDoctorStatus
};
