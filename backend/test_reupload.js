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
        const [res] = await pool.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, 'Reupload Test', 'reupload.com', 'static', 'pending', NOW())", [user.id]);
        const websiteId = res.insertId;

        const uploadTest = async (wId, filePath) => {
            const form = new FormData();
            form.append('zipFile', fs.createReadStream(filePath));
            
            const r = await api.post(`/websites/${wId}/upload`, form, {
                headers: form.getHeaders()
            });
            console.log('Upload ->', r.status, r.data);
            return r;
        };

        console.log('7. Upload project');
        await uploadTest(websiteId, 'tests/valid.zip');

        // wait 2 seconds for deployment to finish
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('7. Re-upload same project');
        await uploadTest(websiteId, 'tests/valid.zip');

        // wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('8. Delete and upload again');
        const deleteRes = await api.delete(`/websites/${websiteId}`);
        console.log('Delete ->', deleteRes.status, deleteRes.data);
        
        const [res2] = await pool.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, 'Recreate Test', 'recreate.com', 'static', 'pending', NOW())", [user.id]);
        await uploadTest(res2.insertId, 'tests/valid.zip');

        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
