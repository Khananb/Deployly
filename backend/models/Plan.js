const db = require("../config/db");

class Plan {
    static async getFounderPlan(connection = null, lock = false) {
        let query = `SELECT * FROM plans WHERE name = 'Founder Edition' LIMIT 1`;
        if (lock && connection) {
            query += ` FOR UPDATE`;
        }
        const execDb = connection || db;
        const [rows] = await execDb.query(query);
        return rows.length > 0 ? rows[0] : null;
    }

    static async incrementUsedSlots(planId, connection) {
        // Increment used slots
        await connection.query(
            `UPDATE plans SET used_slots = used_slots + 1 WHERE id = ?`,
            [planId]
        );

        // Check if we reached max slots and update status if needed
        const [rows] = await connection.query(
            `SELECT max_slots, used_slots FROM plans WHERE id = ? FOR UPDATE`,
            [planId]
        );

        if (rows.length > 0) {
            const plan = rows[0];
            if (plan.used_slots >= plan.max_slots) {
                await connection.query(
                    `UPDATE plans SET status = 'OUT_OF_STOCK' WHERE id = ?`,
                    [planId]
                );
            }
        }
    }
}

module.exports = Plan;
