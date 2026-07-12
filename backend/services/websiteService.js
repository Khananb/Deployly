const db = require("../config/db");

const createWebsite = async (userId, name, domain, type) => {
    // Duplicate domain check
    const [existing] = await db.execute("SELECT id FROM websites WHERE domain = ?", [domain]);
    if (existing.length > 0) throw new Error("Domain is already in use by another website");

    const [result] = await db.execute(
        "INSERT INTO websites (user_id, name, domain, type, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())",
        [userId, name, domain, type]
    );
    return { id: result.insertId, name, domain, type, status: 'pending' };
};

const getWebsites = async (userId) => {
    const [rows] = await db.execute(
        "SELECT id, name, domain, type, status, created_at FROM websites WHERE user_id = ?",
        [userId]
    );
    return rows;
};

const getWebsiteById = async (userId, websiteId) => {
    const [rows] = await db.execute(
        "SELECT id, name, domain, type, status, created_at FROM websites WHERE id = ? AND user_id = ?",
        [websiteId, userId]
    );
    if (rows.length === 0) throw new Error("Website not found or not authorized");
    return rows[0];
};

const updateWebsite = async (userId, websiteId, name, status) => {
    // Only allow updating name or status for now
    const [result] = await db.execute(
        "UPDATE websites SET name = ?, status = ? WHERE id = ? AND user_id = ?",
        [name, status, websiteId, userId]
    );
    if (result.affectedRows === 0) throw new Error("Website not found or not authorized");
    return true;
};

const updateWebsiteDeploymentData = async (websiteId, data) => {
    const fields = [];
    const values = [];
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.pm2_process !== undefined) { fields.push('pm2_process = ?'); values.push(data.pm2_process); }
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
