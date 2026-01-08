import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'warn';
};

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// Custom format for file output (no colors)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create transports
const transports = [
    // Console transport
    new winston.transports.Console({
        format: consoleFormat,
    }),
];

// Add file transports only in production
if (process.env.NODE_ENV === 'production') {
    const logsDir = path.join(__dirname, '../../logs');

    transports.push(
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Create the logger
const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
    exitOnError: false,
});

// Helper methods for common logging patterns
logger.logRequest = (req, message = 'Incoming request') => {
    logger.http(message, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.user?.userId || 'anonymous',
    });
};

logger.logError = (error, context = {}) => {
    logger.error(error.message || 'Unknown error', {
        stack: error.stack,
        ...context,
    });
};

logger.logDatabase = (operation, table, duration) => {
    logger.debug(`Database ${operation}`, {
        table,
        duration: `${duration}ms`,
    });
};

logger.logSocket = (event, data = {}) => {
    logger.debug(`Socket event: ${event}`, data);
};

export default logger;
