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
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        const err = new Error(error.details[0].message);
        err.statusCode = 400;
        throw err;
    }

    const { name, email, password } = value;
    await authService.registerUser(name, email, password);

    sendSuccess(res, {}, "User registered successfully", 201);
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

module.exports = {
    register,
    login
};
