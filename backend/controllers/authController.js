const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");
const { sendSuccess } = require("../utils/apiResponse");

const registerSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(8).pattern(new RegExp('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])')).message("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.").required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required()
});

const register = asyncHandler(async (req, res) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            const err = new Error(error.details[0].message);
            err.statusCode = 400;
            throw err;
        }

        const { name, email, password } = value;
        await authService.registerUser(name, email, password);

        sendSuccess(res, {}, "User registered successfully", 201);
    } catch (error) {
        console.error("REGISTER ERROR:", error);
        console.error(error.message);
        console.error(error.stack);
        throw error;
    }
});

const login = asyncHandler(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        const err = new Error(error.details[0].message);
        err.statusCode = 400;
        throw err;
    }

    const { email, password } = value;
    const data = await authService.loginUser(email, password);

    sendSuccess(res, data, "Login successful");
});

const admin = require("../config/firebase");

const googleLoginSchema = Joi.object({
    idToken: Joi.string().required()
});

const googleLogin = asyncHandler(async (req, res) => {
    const { error, value } = googleLoginSchema.validate(req.body);
    if (error) {
        const err = new Error(error.details[0].message);
        err.statusCode = 400;
        throw err;
    }

    const { idToken } = value;
    
    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseErr) {
        const err = new Error("Invalid or expired Google Token");
        err.statusCode = 401;
        throw err;
    }

    const { email, name, picture, email_verified, uid } = decodedToken;
    if (!email) {
        const err = new Error("Email is required from Google Account");
        err.statusCode = 400;
        throw err;
    }

    const data = await authService.providerLogin(
        'google',
        uid,
        email,
        name || email.split('@')[0],
        picture || null,
        email_verified || false
    );

    sendSuccess(res, data, "Login successful");
});

module.exports = {
    register,
    login,
    googleLogin
};
