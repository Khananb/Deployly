const fs = require('fs');
const path = require('path');

async function runQA() {
    const baseUrl = 'http://localhost:3000/api';
    let token = '';

    console.log("1. Registering user...");
    const regRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'QA User', email: 'qa123@test.com', password: 'Password123!' })
    });
    const regJson = await regRes.json();
    console.log("Register output:", regJson);

    console.log("\n2. Logging in...");
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa123@test.com', password: 'Password123!' })
    });
    const loginJson = await loginRes.json();
    console.log("Login output:", loginJson);
    token = loginJson.data?.token;

    if (!token) {
        console.error("Login failed, aborting.");
        return;
    }

    console.log("\n3. Creating Website...");
    const randomDomain = `qaapp${Date.now()}.com`;
    const webRes = await fetch(`${baseUrl}/websites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: 'My QA App', domain: randomDomain, type: 'node' })
    });
    const webJson = await webRes.json();
    console.log("Create Website output:", webJson);
    const websiteId = webJson.data?.id;

    if (!websiteId) {
        console.error("Website creation failed, aborting.");
        return;
    }

    console.log("\n4. Uploading ZIP...");
    const dummyZipPath = path.join(__dirname, 'dummy.zip');
    fs.writeFileSync(dummyZipPath, 'dummy zip content');
    
    const fileBuffer = fs.readFileSync(dummyZipPath);
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('zipFile', blob, 'dummy.zip');
    
    const uploadRes = await fetch(`${baseUrl}/websites/${websiteId}/upload`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    const uploadJson = await uploadRes.json();
    console.log("Upload ZIP output:", uploadJson);

    console.log("\nQA Complete.");
}

runQA();
