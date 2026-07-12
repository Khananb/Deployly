const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function runRealQA() {
    const baseUrl = 'http://localhost:3000/api';
    const email = `sprint5_${Date.now()}@test.com`;

    console.log("1. Registering user...");
    await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Sprint 5 User', email, password: 'Password123!' })
    });

    console.log("\n2. Logging in...");
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' })
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data?.token;

    console.log("\n3. Creating Website...");
    const randomDomain = `sprint5app${Date.now()}.com`;
    const webRes = await fetch(`${baseUrl}/websites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: 'My Static App', domain: randomDomain, type: 'node' })
    });
    const webJson = await webRes.json();
    const websiteId = webJson.data?.id;

    console.log("\n4. Creating real static ZIP...");
    const siteDir = path.join(__dirname, 'test_site');
    if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir);
    fs.writeFileSync(path.join(siteDir, 'index.html'), '<h1>Hello Static Deployly</h1>');
    
    // Windows native zip via powershell
    const zipPath = path.join(__dirname, 'test_site.zip');
    execSync(`powershell Compress-Archive -Path ${siteDir}\\* -DestinationPath ${zipPath} -Force`);

    console.log("\n5. Uploading ZIP...");
    const fileBuffer = fs.readFileSync(zipPath);
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('zipFile', blob, 'test_site.zip');
    
    const uploadRes = await fetch(`${baseUrl}/websites/${websiteId}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    const uploadJson = await uploadRes.json();
    console.log("Upload ZIP output:", uploadJson);

    console.log("\n6. Checking Deployment Logs...");
    const logsRes = await fetch(`${baseUrl}/deployments/${uploadJson.data.deploymentId}/logs`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const logsJson = await logsRes.json();
    console.log("Deployment Logs:");
    logsJson.data.logs.forEach(l => console.log(`[${l.action}] ${l.status}: ${l.timestamp}`));

    console.log("\n7. Checking Dashboard...");
    const dashRes = await fetch(`${baseUrl}/dashboard`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const dashJson = await dashRes.json();
    console.log("Dashboard output:", dashJson);

    console.log("\n8. Testing Profile...");
    const profRes = await fetch(`${baseUrl}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
    console.log("Profile output:", await profRes.json());

    console.log("\n9. Testing Domains...");
    await fetch(`${baseUrl}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ domain: 'testdomain.com' })
    });
    const domRes = await fetch(`${baseUrl}/domains`, { headers: { 'Authorization': `Bearer ${token}` } });
    console.log("Domains output:", await domRes.json());

    console.log("\n10. Testing Databases...");
    await fetch(`${baseUrl}/databases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ db_name: 'testdb', db_user: 'testuser' })
    });
    const dbRes = await fetch(`${baseUrl}/databases`, { headers: { 'Authorization': `Bearer ${token}` } });
    console.log("Databases output:", await dbRes.json());

    console.log("\nQA Complete.");
}

runRealQA();
