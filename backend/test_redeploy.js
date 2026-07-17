const fs = require('fs');
const axios = require('axios');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');

(async () => {
    try {
        const pool = mysql.createPool({ host: 'localhost', user: 'deployly', password: 'Deployly@123', database: 'deployly' });
        const [users] = await pool.query('SELECT id, email FROM users LIMIT 1');
        const user = users[0];
        const token = jwt.sign({ id: user.id, email: user.email }, 'production_secret_key_123!', { expiresIn: '1h' });
        
        const api = axios.create({
            baseURL: 'http://localhost:3000/api',
            headers: { Authorization: 'Bearer ' + token },
            validateStatus: () => true
        });

        // Setup
        await pool.query('DELETE FROM websites');
        const [res] = await pool.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, 'RedeployApp', 'redeploy.com', 'node', 'pending', NOW())", [user.id]);
        const wId = res.insertId;

        const archiver = require('archiver');
        
        // Helper to zip and deploy
        const deployVersion = async (version) => {
            const output = fs.createWriteStream(`tests/redeploy_v${version}.zip`);
            const archive = archiver('zip');
            const p = new Promise(r => output.on('close', r));
            archive.pipe(output);
            archive.append(`const http = require('http'); http.createServer((req, res) => res.end('v${version}')).listen(process.env.PORT);`, { name: 'app.js' });
            archive.append('{"name": "app", "scripts": {"start": "node app.js"}}', { name: 'package.json' });
            await archive.finalize();
            await p;

            const form = new FormData();
            form.append('zipFile', fs.createReadStream(`tests/redeploy_v${version}.zip`));
            const uploadRes = await api.post(`/websites/${wId}/upload`, form, { headers: form.getHeaders() });
            console.log(`v${version} Upload Status:`, uploadRes.status);
            return uploadRes.data.deploymentId;
        };

        // Deploy v1
        const d1 = await deployVersion(1);
        await new Promise(r => setTimeout(r, 6000));
        
        // Fetch port
        const [w1] = await pool.query('SELECT allocated_port, pm2_process FROM websites WHERE id = ?', [wId]);
        console.log('v1 Port:', w1[0].allocated_port, 'PM2:', w1[0].pm2_process);

        // Deploy v2
        const d2 = await deployVersion(2);
        await new Promise(r => setTimeout(r, 6000));

        // Fetch port
        const [w2] = await pool.query('SELECT allocated_port, pm2_process FROM websites WHERE id = ?', [wId]);
        console.log('v2 Port:', w2[0].allocated_port, 'PM2:', w2[0].pm2_process);

        process.exit(0);
    } catch(err) {
        console.error(err.message);
    }
})();
