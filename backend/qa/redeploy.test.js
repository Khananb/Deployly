const fs = require('fs');
const path = require('path');
const { apiRequest, createZip, delay } = require('./utils');

async function run(state) {
    const token = state.token;
    if (!token) throw new Error("No auth token available");

    // We will redeploy the static website from the static.test.js
    const websiteId = state.staticWebsiteId;
    if (!websiteId) {
        console.log("Skipping Redeploy test because staticWebsiteId is missing.");
        return state;
    }

    const ts = Date.now();

    // 1. Prepare Updated Zip
    const testDir = path.join(__dirname, 'temp_redeploy');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    fs.writeFileSync(path.join(testDir, 'index.html'), `<h1>Redeployed ${ts}</h1>`);
    
    const zipPath = path.join(__dirname, `redeploy_${ts}.zip`);
    await createZip(testDir, zipPath);

    // 2. Upload Zip
    const fileBuffer = fs.readFileSync(zipPath);
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('zipFile', blob, `redeploy_${ts}.zip`);

    const uploadRes = await apiRequest(`websites/${websiteId}/upload`, 'POST', formData, token, true);
    const deploymentId = uploadRes.data.deploymentId;

    // 3. Poll Deployment status
    let isDeployed = false;
    for (let i = 0; i < 20; i++) {
        await delay(2000);
        const logRes = await apiRequest(`deployments/${deploymentId}/logs`, 'GET', null, token);
        const logs = logRes.data.logs || [];
        
        if (logs.some(l => l.action === 'Deployment' && l.status === 'success')) {
            isDeployed = true;
            break;
        }
        if (logs.some(l => l.status === 'failed')) {
            throw new Error("Redeployment failed according to logs");
        }
    }

    if (!isDeployed) throw new Error("Redeployment timed out");

    // Clean up temp files
    fs.unlinkSync(zipPath);
    fs.rmSync(testDir, { recursive: true, force: true });

    return state;
}

module.exports = { run, name: "Redeploy" };
