const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { execSync } = require('child_process');

const API_URL = 'http://localhost:3000/api';

function createZip(sourceDir, outPath) {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    execSync(`powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outPath}' -Force"`);
}

async function runQA() {
    console.log("=== Sprint 9 QA Started ===");
    console.log("Note: This script assumes a valid authentication token and active backend.");
    // In a real environment, we'd login here.
    // We will just generate the test zips to be manually verified via Postman or frontend, 
    // or if a token is provided, run them automatically.
    
    // 1. Static Website
    const staticDir = path.join(__dirname, 'test_static');
    if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir);
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<h1>Static Site</h1>');
    createZip(staticDir, path.join(__dirname, 'test_static.zip'));
    console.log("Created test_static.zip");

    // 2. Node Website (Success)
    const nodeDir = path.join(__dirname, 'test_node');
    if (!fs.existsSync(nodeDir)) fs.mkdirSync(nodeDir);
    fs.writeFileSync(path.join(nodeDir, 'package.json'), JSON.stringify({
        name: "test-node",
        version: "1.0.0",
        scripts: { start: "node index.js" }
    }));
    fs.writeFileSync(path.join(nodeDir, 'index.js'), `
        const http = require('http');
        http.createServer((req, res) => res.end('Node Site')).listen(process.env.PORT || 8080);
    `);
    createZip(nodeDir, path.join(__dirname, 'test_node.zip'));
    console.log("Created test_node.zip");

    // 3. Node Website (Install Failure)
    const installFailDir = path.join(__dirname, 'test_install_fail');
    if (!fs.existsSync(installFailDir)) fs.mkdirSync(installFailDir);
    fs.writeFileSync(path.join(installFailDir, 'package.json'), JSON.stringify({
        name: "test-install-fail",
        dependencies: { "this-package-does-not-exist-12345": "^1.0.0" }
    }));
    createZip(installFailDir, path.join(__dirname, 'test_install_fail.zip'));
    console.log("Created test_install_fail.zip");

    // 4. Node Website (PM2 Failure)
    const pm2FailDir = path.join(__dirname, 'test_pm2_fail');
    if (!fs.existsSync(pm2FailDir)) fs.mkdirSync(pm2FailDir);
    fs.writeFileSync(path.join(pm2FailDir, 'package.json'), JSON.stringify({
        name: "test-pm2-fail",
        scripts: { start: "node index.js" }
    }));
    fs.writeFileSync(path.join(pm2FailDir, 'index.js'), `
        throw new Error('Immediate Crash');
    `);
    createZip(pm2FailDir, path.join(__dirname, 'test_pm2_fail.zip'));
    console.log("Created test_pm2_fail.zip");

    console.log("=== Test Zips Generated ===");
    console.log("To fully test the lifecycle, upload these to the respective API endpoints:");
    console.log("- POST /api/websites/:id/upload");
    console.log("- POST /api/websites/:id/deploy");
    console.log("- POST /api/websites/:id/restart");
    console.log("- POST /api/websites/:id/stop");
    console.log("- DELETE /api/websites/:id");
}

runQA();
