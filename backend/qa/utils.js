const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const QA_BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000/api';

/**
 * Ensures the API base URL is always used instead of hardcoded localhost.
 */
function getApiUrl(endpoint) {
    if (endpoint.startsWith('/')) endpoint = endpoint.slice(1);
    return `${QA_BASE_URL}/${endpoint}`;
}

function createZip(sourceDir, outPath) {
    return new Promise((resolve, reject) => {
        try {
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
            // We use powershell for local testing because it's native on windows.
            // If running on a linux VPS, it would need standard 'zip' command, but since tests run from client/runner:
            const isWindows = process.platform === 'win32';
            if (isWindows) {
                execSync(`powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outPath}' -Force"`);
            } else {
                execSync(`cd ${sourceDir} && zip -r ${outPath} .`);
            }
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiRequest(endpoint, method, body = null, token = null, isFormData = false) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData && body) headers['Content-Type'] = 'application/json';

    const options = {
        method,
        headers,
    };
    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    const response = await fetch(getApiUrl(endpoint), options);
    
    let responseData;
    try {
        responseData = await response.json();
    } catch {
        const text = await response.text();
        throw new Error(`Non-JSON response from API: ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
        throw new Error(responseData.message || `API Request Failed with status ${response.status}`);
    }

    return responseData;
}

module.exports = {
    getApiUrl,
    createZip,
    delay,
    apiRequest
};
