const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { register, login, googleLogin } = require("../controllers/authController");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many login attempts, please try again after 15 minutes" }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many accounts created from this IP, please try again after an hour" }
});

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/google", loginLimiter, googleLogin);

router.get("/", (req, res) => {
    res.json({ message: "Auth API Working" });
});

module.exports = router;
