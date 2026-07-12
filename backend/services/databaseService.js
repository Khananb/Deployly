const db = require("../config/db");

const createDatabaseRecord = async (userId, dbName, dbUser) => {
    // Phase 3 constraint: Logical CRUD only. Do not execute real CREATE DATABASE.
    const [result] = await db.execute(
        "INSERT INTO user_databases (user_id, db_name, db_user, created_at) VALUES (?, ?, ?, NOW())",
        [userId, dbName, dbUser]
    );
    return { id: result.insertId, db_name: dbName, db_user: dbUser };
};

const getDatabases = async (userId) => {
    const [rows] = await db.execute(
        "SELECT id, db_name, db_user, created_at FROM user_databases WHERE user_id = ?",
        [userId]
    );
    return rows;
};

const deleteDatabaseRecord = async (userId, dbId) => {
    const [result] = await db.execute(
        "DELETE FROM user_databases WHERE id = ? AND user_id = ?",
        [dbId, userId]
    );
    if (result.affectedRows === 0) throw new Error("Database not found or not authorized");
    return true;
};

module.exports = {
    createDatabaseRecord,
    getDatabases,
    deleteDatabaseRecord
};
