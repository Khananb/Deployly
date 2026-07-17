const db = require("../config/db");

const createWebsite = async (userId, name, domain, type) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Lock the subscription row for this user to prevent race conditions
        const [subRows] = await connection.execute(
            "SELECT p.website_limit, p.node_limit, p.php_limit FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.user_id = ? AND s.status = 'active' FOR UPDATE",
            [userId]
        );

        if (subRows.length > 0) {
            const sub = subRows[0];
            
            // Check website limit
            const [websiteCount] = await connection.execute("SELECT COUNT(*) as count FROM websites WHERE user_id = ?", [userId]);
            if (websiteCount[0].count >= sub.website_limit) throw new Error("Plan limit reached for websites.");
            
            // Check specific limits
            if (type === 'node') {
                const [nodeCount] = await connection.execute("SELECT COUNT(*) as count FROM websites WHERE user_id = ? AND type = 'node'", [userId]);
                if (nodeCount[0].count >= sub.node_limit) throw new Error("Plan limit reached for Node.js apps.");
            } else if (type === 'php') {
                const [phpCount] = await connection.execute("SELECT COUNT(*) as count FROM websites WHERE user_id = ? AND type = 'php'", [userId]);
                if (phpCount[0].count >= sub.php_limit) throw new Error("Plan limit reached for PHP apps.");
            }
        }

        // Duplicate domain check
        const [existing] = await connection.execute("SELECT id FROM websites WHERE domain = ?", [domain]);
        if (existing.length > 0) throw new Error("Domain is already in use by another website");

        const [result] = await connection.execute(
            "INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())",
            [userId, name, domain, type]
        );
        
        await connection.commit();
        return { id: result.insertId, name, domain, type, status: 'pending' };
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const getWebsites = async (userId) => {
    const [rows] = await db.execute(`
        SELECT 
            w.id, w.name, w.domain, w.type, w.status, w.created_at, w.live_url,
            (SELECT project_type FROM deployments d WHERE d.website_id = w.id ORDER BY d.created_at DESC LIMIT 1) as project_type,
            (SELECT framework FROM deployments d WHERE d.website_id = w.id ORDER BY d.created_at DESC LIMIT 1) as framework,
            (SELECT deploy_path FROM deployments d WHERE d.website_id = w.id AND d.status = 'deployed' ORDER BY d.updated_at DESC LIMIT 1) as deploy_path,
            (SELECT updated_at FROM deployments d WHERE d.website_id = w.id AND d.status = 'deployed' ORDER BY d.updated_at DESC LIMIT 1) as last_deployed_at
        FROM websites w 
        WHERE w.user_id = ?
    `, [userId]);
    return rows;
};

const getWebsiteById = async (userId, websiteId) => {
    const [rows] = await db.execute(`
        SELECT 
            w.id, w.name, w.domain, w.type, w.status, w.created_at, w.live_url, w.allocated_port,
            (SELECT project_type FROM deployments d WHERE d.website_id = w.id ORDER BY d.created_at DESC LIMIT 1) as project_type,
            (SELECT framework FROM deployments d WHERE d.website_id = w.id ORDER BY d.created_at DESC LIMIT 1) as framework,
            (SELECT deploy_path FROM deployments d WHERE d.website_id = w.id AND d.status = 'deployed' ORDER BY d.updated_at DESC LIMIT 1) as deploy_path,
            (SELECT updated_at FROM deployments d WHERE d.website_id = w.id AND d.status = 'deployed' ORDER BY d.updated_at DESC LIMIT 1) as last_deployed_at
        FROM websites w 
        WHERE w.id = ? AND w.user_id = ?
    `, [websiteId, userId]);
    if (rows.length === 0) throw new Error("Website not found or not authorized");
    return rows[0];
};

const updateWebsite = async (userId, websiteId, data) => {
    const fields = [];
    const values = [];
    
    if (data.domain !== undefined) {
        const [existing] = await db.execute("SELECT id FROM websites WHERE domain = ? AND id != ?", [data.domain, websiteId]);
        if (existing.length > 0) throw new Error("Domain is already in use by another website");
        fields.push('domain = ?'); 
        values.push(data.domain); 
    }
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }

    if (fields.length === 0) return true;

    const query = `UPDATE websites SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    values.push(websiteId, userId);

    const [result] = await db.execute(query, values);
    if (result.affectedRows === 0) throw new Error("Website not found or not authorized");
    return true;
};

const updateWebsiteDeploymentData = async (websiteId, data) => {
    const fields = [];
    const values = [];
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.live_url !== undefined) { fields.push('live_url = ?'); values.push(data.live_url); }
    if (data.pm2_process !== undefined) { fields.push('pm2_process = ?'); values.push(data.pm2_process); }
    if (data.allocated_port !== undefined) { fields.push('allocated_port = ?'); values.push(data.allocated_port); }
    if (data.running_since !== undefined) { fields.push('running_since = ?'); values.push(data.running_since); }
    if (data.last_deployed_at !== undefined) { fields.push('last_deployed_at = ?'); values.push(data.last_deployed_at); }
    if (data.started_at !== undefined) { fields.push('started_at = ?'); values.push(data.started_at); }
    if (data.last_error !== undefined) { fields.push('last_error = ?'); values.push(data.last_error); }
    if (data.pm2_id !== undefined) { fields.push('pm2_id = ?'); values.push(data.pm2_id); }

    if (fields.length === 0) return true;
    
    values.push(websiteId);
    await db.execute(`UPDATE websites SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
};

const deleteWebsite = async (userId, websiteId) => {
    const [result] = await db.execute(
        "DELETE FROM websites WHERE id = ? AND user_id = ?",
        [websiteId, userId]
    );
    if (result.affectedRows === 0) throw new Error("Website not found or not authorized");
    return true;
};

module.exports = {
    createWebsite,
    getWebsites,
    getWebsiteById,
    updateWebsite,
    updateWebsiteDeploymentData,
    deleteWebsite
};
