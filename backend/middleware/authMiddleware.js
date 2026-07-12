const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        const error = new Error("No token provided");
        error.statusCode = 401;
        return next(error);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        const error = new Error("Invalid token");
        error.statusCode = 401;
        return next(error);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        const error = new Error("Token expired or invalid");
        error.statusCode = 401;
        return next(error);
    }
};

module.exports = verifyToken;
