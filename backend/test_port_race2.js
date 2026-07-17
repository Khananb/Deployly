const db = require('./config/db');
const net = require('net');

const isPortInUse = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => resolve(true));
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port, '127.0.0.1');
    });
};

const delay = ms => new Promise(r => setTimeout(r, ms));

const allocatePortFlawed = async (websiteId, delayMs) => {
    const [rows] = await db.execute("SELECT allocated_port FROM websites WHERE allocated_port IS NOT NULL FOR UPDATE");
    const assignedPorts = new Set(rows.map(row => row.allocated_port));
    
    let port = 4001; 
    while (port <= 10000) {
        if (!assignedPorts.has(port)) {
            const inUse = await isPortInUse(port);
            if (!inUse) {
                // FORCE RACE CONDITION
                await delay(delayMs);
                await db.execute("UPDATE websites SET allocated_port = ? WHERE id = ?", [port, websiteId]);
                return port;
            }
        }
        port++;
    }
};

(async () => {
    try {
        await db.query('DELETE FROM websites');
        const [w1] = await db.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (1, 'A', 'a.com', 'node', 'pending', NOW())");
        const [w2] = await db.query("INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (1, 'B', 'b.com', 'node', 'pending', NOW())");
        
        // Stagger them slightly so OS binding doesn't overlap, but DB update DOES overlap
        const p1 = allocatePortFlawed(w1.insertId, 100);
        const p2 = delay(20).then(() => allocatePortFlawed(w2.insertId, 100));
        
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
