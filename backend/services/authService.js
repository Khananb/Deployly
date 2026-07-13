const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const db = require("../config/db");

const registerUser = async (name, email, password) => {
    const existing = await User.findByEmail(email);
    if (existing) {
        const error = new Error("Email already exists");
        error.statusCode = 400;
        throw error;
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check Founder Plan Stock
        const founderPlan = await Plan.getFounderPlan(connection, true);
        if (!founderPlan || founderPlan.status === 'OUT_OF_STOCK') {
            const error = new Error("Founder Edition is currently sold out.");
            error.statusCode = 403;
            throw error;
        }

        // 2. Hash Password and Create User
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await User.create(name, email, hashedPassword, connection);

        // 3. Create Subscription
        await Subscription.createSubscription(userId, founderPlan.id, connection);

        // 4. Increment used slots safely
        await Plan.incrementUsedSlots(founderPlan.id, connection);

        // 5. Commit
        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const loginUser = async (email, password) => {
    const user = await User.findByEmail(email);
    if (!user) {
        const error = new Error("Invalid credentials");
        error.statusCode = 401;
        throw error;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        const error = new Error("Invalid credentials");
        error.statusCode = 401;
        throw error;
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    return {
        token,
        user: { id: user.id, name: user.name, email: user.email }
    };
};

module.exports = {
    registerUser,
    loginUser
};
