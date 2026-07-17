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

        const [res] = await pool.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, 'Empty Test', 'emptytest.com', 'static', 'pending', NOW())", [user.id]);
        const wId = res.insertId;

        // Create empty ZIP
        const archiver = require('archiver');
        const output = fs.createWriteStream('tests/empty2.zip');
        const archive = archiver('zip');
        
        // Wait for it to close
        const p = new Promise(r => output.on('close', r));
        archive.pipe(output);
        await archive.finalize();
        await p;

        const form = new FormData();
        form.append('zipFile', fs.createReadStream('tests/empty2.zip'));
        const uploadRes = await api.post(`/websites/${wId}/upload`, form, { headers: form.getHeaders() });
        console.log('Upload Status:', uploadRes.status);
        console.log('Response:', uploadRes.data);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
    }
})();
