const mysql = require('mysql2/promise');
(async () => {
    try {
        const pool = mysql.createPool({ host: 'localhost', user: 'deployly', password: 'Deployly@123', database: 'deployly' });
        const query = `
            INSERT INTO websites (user_id, name, domain, type, status, created_at)
            SELECT ?, ?, ?, ?, 'pending', NOW()
            FROM DUAL
            WHERE (SELECT COUNT(*) FROM websites WHERE user_id = ?) < 
                  (SELECT p.website_limit FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.user_id = ? AND s.status = 'active')
        `;
        
        await pool.query('DELETE FROM websites');
        
        const p1 = pool.execute(query, [1, 'Test 1', 't1.com', 'node', 1, 1]);
        const p2 = pool.execute(query, [1, 'Test 2', 't2.com', 'node', 1, 1]);
        
        const [r1, r2] = await Promise.all([p1, p2]);
        console.log('R1:', r1[0].affectedRows);
        console.log('R2:', r2[0].affectedRows);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
