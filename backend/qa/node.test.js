const fs = require('fs');
const path = require('path');
const { apiRequest, createZip, delay } = require('./utils');

async function run(state) {
    const token = state.token;
    if (!token) throw new Error("No auth token available");

    const ts = Date.now();
    const websiteName = `QA_Node_${ts}`;
    const domain = `qanode${ts}.deployly.test`;

    // 1. Create Website
    const createRes = await apiRequest('websites', 'POST', {
        name: websiteName,
        domain: domain,
        type: 'node'
    }, token);
    const websiteId = createRes.data.id;

    // 2. Prepare Zip
    const testDir = path.join(__dirname, 'temp_node');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    fs.writeFileSync(path.join(testDir, 'server.js'), `
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello Node\\n');
}).listen(process.env.PORT || 3000);
    `);
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        name: "qa-node-test",
        main: "server.js",
        scripts: { start: "node server.js" }
    }));
    
    const zipPath = path.join(__dirname, `node_${ts}.zip`);
    await createZip(testDir, zipPath);

    // 3. Upload Zip
    const fileBuffer = fs.readFileSync(zipPath);
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('zipFile', blob, `node_${ts}.zip`);

    const uploadRes = await apiRequest(`websites/${websiteId}/upload`, 'POST', formData, token, true);
    const deploymentId = uploadRes.data.deploymentId;

    // 4. Poll Deployment status
    let isDeployed = false;
    for (let i = 0; i < 30; i++) { // node takes longer (npm install)
        await delay(2000);
        const logRes = await apiRequest(`deployments/${deploymentId}/logs`, 'GET', null, token);
        const logs = logRes.data.logs || [];
        
        if (logs.some(l => l.action === 'Deployment' && l.status === 'success')) {
            isDeployed = true;
            break;
        }
        if (logs.some(l => l.status === 'failed')) {
            throw new Error("Node Deployment failed according to logs");
        }
    }

    if (!isDeployed) throw new Error("Node Deployment timed out");

    // Clean up temp files
    fs.unlinkSync(zipPath);
    fs.rmSync(testDir, { recursive: true, force: true });

    return { ...state, nodeWebsiteId: websiteId };
}

module.exports = { run, name: "Node.js Hosting" };
