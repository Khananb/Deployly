const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function logResult(name, success, detail = '') {
    if (success) {
        console.log(`${GREEN}✔ ${name}${RESET} ${detail ? `(${detail})` : ''}`);
    } else {
        console.log(`${RED}✖ ${name}${RESET} ${detail ? `(${detail})` : ''}`);
        process.exitCode = 1;
    }
}

async function verifyEnvironment() {
    console.log("Starting Environment Verification...\n");

    // 1. Node & NPM Version
    try {
        const nodeV = process.version;
        logResult('Node.js Version', true, nodeV);
    } catch (e) {
        logResult('Node.js Version', false, e.message);
    }

    try {
        const npmV = execSync('npm -v').toString().trim();
        logResult('NPM Version', true, npmV);
    } catch (e) {
        logResult('NPM Version', false, 'NPM not found');
    }

    // 2. Disk Free Space
    try {
        let df;
        if (fs.statfsSync) {
            const stats = fs.statfsSync(__dirname);
            const freeSpaceGB = (stats.bavail * stats.bsize / (1024 * 1024 * 1024)).toFixed(2);
            df = `${freeSpaceGB} GB free`;
        } else {
            df = 'Unknown (Requires Node 19+)';
        }
        logResult('Disk Free Space', true, df);
    } catch (e) {
        logResult('Disk Free Space', false, 'Could not determine disk space');
    }

    // 3. Database Connection
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });
        await connection.execute('SELECT 1');
        await connection.end();
        logResult('MariaDB Connection', true, 'Connected successfully');
    } catch (e) {
        logResult('MariaDB Connection', false, e.message);
    }

    // 4. Storage Folders & Permissions
    const storagePaths = {
        'Upload Directory': path.join(__dirname, '../storage/uploads'),
        'Sites Directory': path.join(__dirname, '../storage/sites'),
        'Logs Directory': path.join(__dirname, '../storage/logs')
    };

    for (const [name, dirPath] of Object.entries(storagePaths)) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.accessSync(dirPath, fs.constants.R_OK | fs.constants.W_OK);
            logResult(`${name} (Read/Write)`, true, dirPath);
        } catch (e) {
            logResult(`${name} (Read/Write)`, false, e.message);
        }
    }

    // 5. Environment Variables
    const requiredEnv = ['JWT_SECRET', 'PORT', 'BASE_URL'];
    for (const env of requiredEnv) {
        if (process.env[env]) {
            logResult(`ENV: ${env}`, true, 'Configured');
        } else {
            logResult(`ENV: ${env}`, false, 'Missing');
        }
    }

    // 6. Security Checks
    try {
        const pkg = require('./package.json');
        const deps = pkg.dependencies || {};
        const hasCors = !!deps['cors'];
        const hasHelmet = !!deps['helmet'];
        const hasRateLimit = !!deps['express-rate-limit'];
        
        logResult('Security: CORS configured', hasCors, hasCors ? 'cors package found' : 'Missing cors package');
        logResult('Security: Helmet enabled', hasHelmet, hasHelmet ? 'helmet package found' : 'Missing helmet package');
        logResult('Security: Rate limiting enabled', hasRateLimit, hasRateLimit ? 'express-rate-limit package found' : 'Missing express-rate-limit package');
    } catch (e) {
        logResult('Security Checks', false, 'Failed to read package.json');
    }

    console.log("\nVerification Complete.");
    if (process.exitCode === 1) {
        console.log(`${RED}Some checks failed. Please fix them before starting the server.${RESET}`);
    } else {
        console.log(`${GREEN}All checks passed. Environment is ready for production.${RESET}`);
    }
}

verifyEnvironment();
