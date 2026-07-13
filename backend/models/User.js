const db = require("../config/db");

const findByEmail = async (email) => {
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    return users.length > 0 ? users[0] : null;
};

const findById = async (id) => {
    const [users] = await db.execute("SELECT id, name, email, created_at, billing_status, trial_start_at, trial_end_at, paid_until, eligible_for_deletion FROM users WHERE id = ?", [id]);
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

module.exports = {
    findByEmail,
    findById,
    create
};
