const db = require("../config/db");

const findByEmail = async (email) => {
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    return users.length > 0 ? users[0] : null;
};

const findById = async (id) => {
    const [users] = await db.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", [id]);
    return users.length > 0 ? users[0] : null;
};

const create = async (name, email, passwordHash) => {
    const [result] = await db.execute(
        "INSERT INTO users(name, email, password) VALUES (?, ?, ?)",
        [name, email, passwordHash]
    );
    return result.insertId;
};

module.exports = {
    findByEmail,
    findById,
    create
};
