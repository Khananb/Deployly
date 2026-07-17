const net = require('net');
const db = require('../config/db');

/**
 * Checks if a specific port is in use on the local system.
 */
const isPortInUse = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true); // Port is in use
            } else {
                resolve(true); // Other error, assume unsafe to use
            }
        });
        
        server.once('listening', () => {
            server.close();
            resolve(false); // Port is completely free
        });
        
        server.listen(port, '127.0.0.1');
    });
};

/**
 * Finds the next available port starting from 4001.
 * Ensures the port is neither bound on the host nor assigned in the database.
 */
const allocatePort = async (websiteId) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // 1. Get all currently assigned ports from DB (Locked by transaction)
        const [rows] = await connection.execute("SELECT allocated_port FROM websites WHERE allocated_port IS NOT NULL FOR UPDATE");
        const assignedPorts = new Set(rows.map(row => row.allocated_port));
        
        let port = 4001; // Base starting port for user applications
        const MAX_PORT = 10000;
        
        while (port <= MAX_PORT) {
            // 2. Check if DB has it
            if (!assignedPorts.has(port)) {
                // 3. Check if OS has it bound (just to be safe against zombie processes or external apps)
                const inUse = await isPortInUse(port);
                if (!inUse) {
                    // 4. Reserve immediately in DB to prevent concurrent race conditions
                    await connection.execute("UPDATE websites SET allocated_port = ? WHERE id = ?", [port, websiteId]);
                    await connection.commit();
                    return port;
                }
            }
            port++;
        }
        
        throw new Error("No available ports in the allocation range (4001-10000)");
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

/**
 * Releases a port for a given website.
 * (This is essentially a DB update since OS releases it when PM2 stops).
 */
const releasePort = async (websiteId) => {
    await db.execute("UPDATE websites SET allocated_port = NULL WHERE id = ?", [websiteId]);
};

module.exports = {
    allocatePort,
    releasePort
};
