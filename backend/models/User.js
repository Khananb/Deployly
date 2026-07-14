const db = require("../config/db");

const findByEmail = async (email) => {
    try {
        const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error("DATABASE ERROR");
        console.error(error);
        console.error(error.message);
        console.error(error.code);
        console.error(error.errno);
        console.error(error.sqlMessage);
        console.error(error.stack);
        if (error.errors) {
            console.error("INNER ERRORS:", error.errors);
        }
        throw error;
    }
};

const findById = async (id) => {
    const [users] = await db.execute("SELECT id, name, email, created_at, billing_status, trial_start_at, trial_end_at, paid_until, eligible_for_deletion, provider, avatar, verified_email FROM users WHERE id = ?", [id]);
    return users.length > 0 ? users[0] : null;
};

const create = async (name, email, passwordHash, connection = null) => {
    const execDb = connection || db;
    const [result] = await execDb.execute(
        `INSERT INTO users(name, email, password, trial_start_at, trial_end_at, billing_status) 
         VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR), 'active')`,
        [name, email, passwordHash]
    );
    return result.insertId;
};

const createWithProvider = async (name, email, provider, providerId, avatar, verifiedEmail, connection = null) => {
    const execDb = connection || db;
    const [result] = await execDb.execute(
        `INSERT INTO users(name, email, password, provider, provider_id, avatar, verified_email, trial_start_at, trial_end_at, billing_status) 
         VALUES (?, ?, 'oauth_placeholder', ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR), 'active')`,
        [name, email, provider, providerId, avatar, verifiedEmail ? 1 : 0]
    );
    return result.insertId;
};

const linkProvider = async (userId, provider, providerId, avatar, verifiedEmail, connection = null) => {
    const execDb = connection || db;
    await execDb.execute(
        `UPDATE users SET provider = ?, provider_id = ?, avatar = ?, verified_email = ? WHERE id = ?`,
        [provider, providerId, avatar, verifiedEmail ? 1 : 0, userId]
    );
};

module.exports = {
    findByEmail,
    findById,
    create,
    createWithProvider,
    linkProvider
};
