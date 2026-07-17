const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logDir = path.join(__dirname, '../../storage/logs');

// List of keys to redact in objects
const sensitiveKeys = ['password', 'token', 'authorization', 'jwt', 'jwt_secret', 'db_password'];

const redact = (info) => {
    const clone = { ...info };

    const redactObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        for (const key in obj) {
            if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
                obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
                obj[key] = redactObject({ ...obj[key] });
            }
        }
        return obj;
    };

    return redactObject(clone);
};

const customFormat = winston.format.printf((info) => {
    let { level, message, timestamp, ...meta } = info;
    const redactedMeta = redact(meta);
    let metaStr = Object.keys(redactedMeta).length ? JSON.stringify(redactedMeta) : '';
    
    // Also try to redact message if it contains something that looks like a token/password (basic redaction)
    if (typeof message === 'string') {
        message = message.replace(/(password|token|authorization|jwt|secret)[=\s:]+([^\s,]+)/gi, '$1=[REDACTED]');
    }

    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
});

const transportOptions = {
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d' // Keep for 30 days
};

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format(redact)(), // Redact as a format step
        customFormat
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                customFormat
            )
        }),
        new DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            level: 'error',
            ...transportOptions
        }),
        new DailyRotateFile({
            filename: path.join(logDir, 'warn-%DATE%.log'),
            level: 'warn',
            ...transportOptions
        }),
        new DailyRotateFile({
            filename: path.join(logDir, 'info-%DATE%.log'),
            level: 'info',
            ...transportOptions
        })
    ],
});

// Middleware for express to capture access logs
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
            ip: req.ip,
            body: req.body, // will be redacted
            query: req.query,
            headers: {
                ...req.headers,
                authorization: req.headers.authorization ? '[REDACTED]' : undefined
            }
        });
    });
    next();
};

module.exports = { logger, requestLogger };
