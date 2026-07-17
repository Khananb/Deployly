const db = require('./config/db');
const portManagerService = require('./services/portManagerService');

(async () => {
    try {
        await db.query('DELETE FROM websites');
        const [w1] = await db.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (1, 'A', 'a.com', 'node', 'pending', NOW())");
        const [w2] = await db.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (1, 'B', 'b.com', 'node', 'pending', NOW())");
        
        const p1 = portManagerService.allocatePort(w1.insertId);
        const p2 = portManagerService.allocatePort(w2.insertId);
        
        const [port1, port2] = await Promise.all([p1, p2]);
        console.log('Port 1:', port1);
        console.log('Port 2:', port2);
        
        if (port1 === port2) console.log('RACE CONDITION BUG CONFIRMED!');
        
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
