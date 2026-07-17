const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
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

        await pool.query('DELETE FROM websites');

        const uploadTest = async (name, filePath) => {
            const [res] = await pool.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, ?, ?, 'static', 'pending', NOW())", [user.id, name, name.replace(/ /g, '') + '.com']);
            const websiteId = res.insertId;

            const form = new FormData();
            form.append('zipFile', fs.createReadStream(filePath));
            
            const r = await api.post(`/websites/${websiteId}/upload`, form, {
                headers: form.getHeaders()
            });
            console.log(name, '->', r.status, r.data);
            return r;
        };

        // 1. Valid static website
        await uploadTest('1. Valid', 'tests/valid.zip');

        // 2. Nested folders
        await uploadTest('2. Nested', 'tests/nested.zip');

        // 3. Missing index.html
        await uploadTest('3. Missing', 'tests/missing.zip');

        // 6. Invalid ZIP
        await uploadTest('6. Invalid ZIP', 'tests/invalid.zip');

        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
