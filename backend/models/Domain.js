const db = require("../config/db");

const findByUserId = async (userId) => {
    const [domains] = await db.execute(
        "SELECT id, domain, status, created_at FROM domains WHERE user_id = ? ORDER BY id DESC",
        [userId]
    );
    return domains;
};

const create = async (userId, domain) => {
    const [result] = await db.execute(
        "INSERT INTO domains(user_id, domain) VALUES (?, ?)",
        [userId, domain]
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

module.exports = {
    findByUserId,
    create,
    updateStatus,
    remove,
    getDashboardStats
};
