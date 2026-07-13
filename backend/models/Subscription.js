const db = require("../config/db");

class Subscription {
    static async createSubscription(userId, planId, connection) {
        await connection.query(
            `INSERT INTO subscriptions (user_id, plan_id, status) VALUES (?, ?, 'ACTIVE')`,
            [userId, planId]
        );
    }

    static async getActiveSubscription(userId) {
        const query = `
            SELECT s.*, p.* 
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = ? AND s.status = 'ACTIVE'
            ORDER BY s.created_at DESC
            LIMIT 1
        `;
        const [rows] = await db.query(query, [userId]);
        return rows.length > 0 ? rows[0] : null;
    }
}

module.exports = Subscription;
