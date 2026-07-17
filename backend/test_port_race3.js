const db = require('./config/db');
const portManagerService = require('./services/portManagerService');
const net = require('net');

(async () => {
    try {
        await db.query('DELETE FROM websites');
        
        const promises = [];
        for (let i = 0; i < 10; i++) {
            const [w] = await db.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (1, ?, ?, 'node', 'pending', NOW())", [`App${i}`, `app${i}.com`]);
            promises.push(portManagerService.allocatePort(w.insertId));
        }
        
        const ports = await Promise.all(promises);
        console.log('Allocated Ports:', ports);
        
        const uniquePorts = new Set(ports);
        if (uniquePorts.size === 10) {
            console.log('PASS: No race conditions. 10 unique ports allocated.');
        } else {
            console.log('FAIL: Race condition occurred. Duplicate ports found.');
        }
        
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
