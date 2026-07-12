const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:3000/api';

const { execSync } = require('child_process');

function createZip(sourceDir, outPath, useNestedFolder = false) {
    return new Promise((resolve, reject) => {
        try {
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
            if (useNestedFolder) {
                // Compress the entire sourceDir which contains 'website/'
                execSync(`powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outPath}' -Force"`);
            } else {
                // Compress the contents of sourceDir
                execSync(`powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outPath}' -Force"`);
            }
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

async function prepareTests() {
    // Create Test A structure
    const testADir = path.join(__dirname, 'test_a');
    if (!fs.existsSync(testADir)) fs.mkdirSync(testADir);
    if (!fs.existsSync(path.join(testADir, 'css'))) fs.mkdirSync(path.join(testADir, 'css'));
    if (!fs.existsSync(path.join(testADir, 'js'))) fs.mkdirSync(path.join(testADir, 'js'));
    if (!fs.existsSync(path.join(testADir, 'images'))) fs.mkdirSync(path.join(testADir, 'images'));
    
    fs.writeFileSync(path.join(testADir, 'index.html'), '<h1>Test A</h1>');
    fs.writeFileSync(path.join(testADir, 'css', 'style.css'), 'body { background: red; }');
    fs.writeFileSync(path.join(testADir, 'js', 'app.js'), 'console.log("Test A");');
    fs.writeFileSync(path.join(testADir, 'images', 'logo.png'), 'fake-image-data');

    await createZip(testADir, path.join(__dirname, 'test_a.zip'), false);
    
    // Create Test B structure
    const testBDir = path.join(__dirname, 'test_b');
    if (!fs.existsSync(testBDir)) fs.mkdirSync(testBDir);
    const testBWebsiteDir = path.join(testBDir, 'website');
    if (!fs.existsSync(testBWebsiteDir)) fs.mkdirSync(testBWebsiteDir);
    if (!fs.existsSync(path.join(testBWebsiteDir, 'css'))) fs.mkdirSync(path.join(testBWebsiteDir, 'css'));
    fs.writeFileSync(path.join(testBWebsiteDir, 'index.html'), '<h1>Test B</h1>');
    
    await createZip(testBDir, path.join(__dirname, 'test_b.zip'), true);
}

async function runQA() {
    console.log("Preparing Test Zips...");
    await prepareTests();

    console.log("Logging in...");
    let loginRes;
    try {
        loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: "test7@example.com",
            password: "Password123!"
        });
    } catch (e) {
        loginRes = await axios.post(`${API_URL}/auth/register`, {
            name: "Test User 7",
            email: "test7@example.com",
            password: "Password123!"
        });
    }

    const token = loginRes.data.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    async function deployAndVerify(name, zipPath) {
        console.log(`\n--- Running ${name} ---`);
        const ts = Date.now();
        const createRes = await axios.post(`${API_URL}/websites`, {
            name: `${name.replace(' ', '')}-${ts}`,
            domain: `${name.replace(' ', '')}-${ts}.deployly.test`,
            type: 'static'
        }, authHeaders);
        const websiteId = createRes.data.data.id;
        
        console.log(`Uploading ${zipPath}...`);
        const form = new FormData();
        form.append('zipFile', fs.createReadStream(zipPath));
        const uploadRes = await axios.post(`${API_URL}/websites/${websiteId}/upload`, form, {
            headers: { ...authHeaders.headers, ...form.getHeaders() }
        });
        const deploymentId = uploadRes.data.data.deploymentId;

        console.log(`Deploying...`);
        const deployRes = await axios.post(`${API_URL}/websites/${websiteId}/deploy`, { deploymentId }, authHeaders);
        const previewUrl = deployRes.data.data.previewUrl;
        console.log(`Preview URL: ${previewUrl}`);

        console.log(`Validating static serving...`);
        try {
            const previewReq = await axios.get(`${previewUrl}index.html`);
            if (previewReq.data.includes(`<h1>${name}</h1>`)) {
                console.log(`✅ Preview loaded successfully!`);
            } else {
                console.log(`❌ Preview content mismatch.`);
            }
        } catch (e) {
            console.log(`❌ Failed to fetch preview URL: ${e.message}`);
        }

        console.log(`Validating logs...`);
        const logsRes = await axios.get(`${API_URL}/deployments/${deploymentId}/logs`, authHeaders);
        const logStatuses = logsRes.data.data.logs.map(l => l.status);
        console.log("Log Statuses Found: ", logStatuses.join(", "));
        
        console.log(`Status check completed.`);
    }

    await deployAndVerify('Test A', path.join(__dirname, 'test_a.zip'));
    await deployAndVerify('Test B', path.join(__dirname, 'test_b.zip'));
    
    console.log("\nDone.");
}

runQA().catch(console.error);
