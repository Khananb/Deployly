const db = require("../config/db");

const findByUserId = async (userId) => {
    const [domains] = await db.execute(
        "SELECT id, website_id, domain, status, dns_status, ssl_status, ssl_expires_at, created_at FROM domains WHERE user_id = ? ORDER BY id DESC",
        [userId]
    );
    return domains;
};

const findByWebsiteId = async (userId, websiteId) => {
    const [domains] = await db.execute(
        "SELECT id, website_id, domain, status, dns_status, ssl_status, ssl_expires_at, created_at FROM domains WHERE user_id = ? AND website_id = ? ORDER BY id DESC",
        [userId, websiteId]
    );
    return domains;
};

const create = async (userId, websiteId, domain) => {
    const [result] = await db.execute(
        "INSERT INTO domains(user_id, website_id, domain) VALUES (?, ?, ?)",
        [userId, websiteId, domain]
    );
    return result.insertId;
};

const updateStatus = async (id, userId, status) => {
    const [result] = await db.execute(
        "UPDATE domains SET status = ? WHERE id = ? AND user_id = ?",
        [status, id, userId]
    );
    return result.affectedRows > 0;
};

const updateDNSStatus = async (id, userId, status) => {
    const [result] = await db.execute(
        "UPDATE domains SET dns_status = ? WHERE id = ? AND user_id = ?",
        [status, id, userId]
    );
    return result.affectedRows > 0;
};

const updateSSLStatus = async (id, userId, status) => {
    const [result] = await db.execute(
        "UPDATE domains SET ssl_status = ? WHERE id = ? AND user_id = ?",
        [status, id, userId]
    );
    return result.affectedRows > 0;
};

const remove = async (id, userId) => {
    const [result] = await db.execute(
        "DELETE FROM domains WHERE id = ? AND user_id = ?",
        [id, userId]
    );
    return result.affectedRows > 0;
};

const getDashboardStats = async (userId) => {
    const [domains] = await db.execute(
        "SELECT status FROM domains WHERE user_id = ?",
        [userId]
    );
    return domains;
};
const findById = async (id, userId) => {
    const [domains] = await db.execute(
        "SELECT id, website_id, domain, status, dns_status, ssl_status, ssl_expires_at, created_at FROM domains WHERE id = ? AND user_id = ?",
        [id, userId]
    );
    return domains[0] || null;
};

module.exports = {
    findById,
    findByUserId,
    findByWebsiteId,
    create,
    updateStatus,
    updateDNSStatus,
    updateSSLStatus,
    remove,
    getDashboardStats
};
