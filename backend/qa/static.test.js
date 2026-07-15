const fs = require('fs');
const path = require('path');
const { apiRequest, createZip, delay } = require('./utils');

async function run(state) {
    const token = state.token;
    if (!token) throw new Error("No auth token available");

    const ts = Date.now();
    const websiteName = `QA_Static_${ts}`;
    const domain = `qastatic${ts}.deployly.test`;

    // 1. Create Website
    const createRes = await apiRequest('websites', 'POST', {
        name: websiteName,
        domain: domain,
        type: 'static'
    }, token);
    const websiteId = createRes.data.id;

    // 2. Prepare Zip
    const testDir = path.join(__dirname, 'temp_static');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    fs.writeFileSync(path.join(testDir, 'index.html'), `<h1>Hello ${websiteName}</h1>`);
    
    const zipPath = path.join(__dirname, `static_${ts}.zip`);
    await createZip(testDir, zipPath);

    // 3. Upload Zip (Requires FormData)
    // We will use native fetch FormData
    const fileBuffer = fs.readFileSync(zipPath);
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('zipFile', blob, `static_${ts}.zip`);

    const uploadRes = await apiRequest(`websites/${websiteId}/upload`, 'POST', formData, token, true);
    const deploymentId = uploadRes.data.deploymentId;

    // 4. Poll Deployment status
    let isDeployed = false;
    for (let i = 0; i < 20; i++) {
        await delay(2000);
        const logRes = await apiRequest(`deployments/${deploymentId}/logs`, 'GET', null, token);
        const logs = logRes.data.logs || [];
        
        // Check for success or failure
        if (logs.some(l => l.action === 'Deployment' && l.status === 'success')) {
            isDeployed = true;
            break;
        }
        if (logs.some(l => l.status === 'failed')) {
            throw new Error("Deployment failed according to logs");
        }
    }

    if (!isDeployed) throw new Error("Deployment timed out");

    // Clean up temp files
    fs.unlinkSync(zipPath);
    fs.rmSync(testDir, { recursive: true, force: true });

    return { ...state, staticWebsiteId: websiteId };
}

module.exports = { run, name: "Static Hosting" };
