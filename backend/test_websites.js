const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const axios = require('axios');

(async () => {
    try {
        const pool = mysql.createPool({ host: 'localhost', user: 'deployly', password: 'Deployly@123', database: 'deployly' });
        const [users] = await pool.query('SELECT id, email FROM users LIMIT 1');
        const user = users[0];
        const token = jwt.sign({ id: user.id, email: user.email }, 'production_secret_key_123!', { expiresIn: '1h' });
        
        const api = axios.create({
            baseURL: 'http://localhost:3000/api/websites',
            headers: { Authorization: 'Bearer ' + token },
            validateStatus: () => true
        });

        const logTest = (name, res) => console.log(name, '->', res.status, res.data);
        const cleanup = async () => await pool.query('DELETE FROM websites');

        await cleanup();

        // 1. Valid data
        const r1 = await api.post('/', { name: 'Valid Site', domain: 'valid1.com', type: 'node' });
        logTest('1. Valid', r1);
        await cleanup();
        
        // 2. Same domain (Need 2 inserts)
        await api.post('/', { name: 'Valid Site 2', domain: 'valid1.com', type: 'static' });
        const r2 = await api.post('/', { name: 'Valid Site 3', domain: 'valid1.com', type: 'node' });
        logTest('2. Duplicate Domain', r2);
        await cleanup();

        // 3. Empty name
        const r3 = await api.post('/', { name: '', domain: 'emptyname.com', type: 'node' });
        logTest('3. Empty Name', r3);
        await cleanup();

        // 4. Empty domain
        const r4 = await api.post('/', { name: 'Empty Domain', domain: '', type: 'node' });
        logTest('4. Empty Domain', r4);
        await cleanup();

        // 5. Invalid domain format
        const r5 = await api.post('/', { name: 'Invalid Domain', domain: 'http://bad-domain', type: 'node' });
        logTest('5. Invalid Format', r5);
        await cleanup();

        // 6. Very long website name
        const longName = 'A'.repeat(500);
        const r6 = await api.post('/', { name: longName, domain: 'long.com', type: 'node' });
        logTest('6. Long Name', r6);
        await cleanup();

        // 7. SQL Injection
        const sqlInj = "Valid Site', 'sqlinj.com', 'node', 'pending', NOW()); DROP TABLE websites; --";
        const r7 = await api.post('/', { name: sqlInj, domain: 'sqlinj.com', type: 'node' });
        logTest('7. SQL Injection', r7);
        await cleanup();

        // 8. XSS
        const xssName = '<script>alert(1)</script>';
        const r8 = await api.post('/', { name: xssName, domain: 'xss.com', type: 'node' });
        logTest('8. XSS', r8);
        await cleanup();

        // 9. Rapid fire (Double click)
        const p1 = api.post('/', { name: 'Double Click', domain: 'double.com', type: 'node' });
        const p2 = api.post('/', { name: 'Double Click', domain: 'double.com', type: 'node' });
        const [r9a, r9b] = await Promise.all([p1, p2]);
        logTest('9. Double Click 1', r9a);
        logTest('9. Double Click 2', r9b);

        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
