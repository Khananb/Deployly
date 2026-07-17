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

        const [res] = await pool.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, 'Race Test', 'racetest.com', 'static', 'pending', NOW())", [user.id]);
        const wId = res.insertId;

        const form = new FormData();
        form.append('zipFile', fs.createReadStream('tests/valid.zip'));
        
        // Start upload
        const uploadPromise = api.post(`/websites/${wId}/upload`, form, { headers: form.getHeaders() });
        
        // Wait 100ms so extract starts but deployment in background isn't finished
        await new Promise(resolve => setTimeout(resolve, 100));

        // Delete
        const deletePromise = api.delete(`/websites/${wId}`);

        const [uploadRes, deleteRes] = await Promise.all([uploadPromise, deletePromise]);
        console.log('Upload:', uploadRes.status);
        console.log('Delete:', deleteRes.status);
        
        process.exit(0);
    } catch(err) {
        console.error(err.message);
    }
})();
