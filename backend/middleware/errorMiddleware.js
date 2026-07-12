const errorMiddleware = (err, req, res, next) => {
    console.error(err.stack);
    
    // Default to 500 server error
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
};

module.exports = errorMiddleware;
