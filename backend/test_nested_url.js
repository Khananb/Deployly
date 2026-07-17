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

        const [res] = await pool.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, 'Nested Mock Test', 'nestedmock.com', 'static', 'pending', NOW())", [user.id]);
        const wId = res.insertId;

        const form = new FormData();
        form.append('zipFile', fs.createReadStream('tests/nested.zip'));
        await api.post(`/websites/${wId}/upload`, form, { headers: form.getHeaders() });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const r1 = await axios.get(`http://localhost:3000/sites/${user.id}/${wId}/index.html`, { validateStatus: () => true });
        console.log('Root Status for Nested:', r1.status);
        
        process.exit(0);
    } catch(err) {
        console.error(err.message);
    }
})();
