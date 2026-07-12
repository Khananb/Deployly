const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const registerUser = async (name, email, password) => {
    const existing = await User.findByEmail(email);
    if (existing) {
        const error = new Error("Email already exists");
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create(name, email, hashedPassword);
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
