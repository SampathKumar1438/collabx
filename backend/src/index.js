import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Import configurations
import prisma from './config/prisma.js';
import { initializeMinIO } from './config/minio.js';
import { ERROR_MESSAGES } from './config/messages.js';

// Import utilities
import logger from './utils/logger.js';
import { sendError, sendNotFound } from './utils/response.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import messageRoutes from './routes/message.routes.js';
import fileRoutes from './routes/file.routes.js';

// Import socket handlers
import { setupSocketHandlers } from './socket/socket.js';

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Cloudflare/Render/Nginx)
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true
    }
});

app.set('io', io);

// Morgan stream to winston logger
const morganStream = {
    write: (message) => logger.http(message.trim())
};

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images/files from other origins
}));

const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://collabx-9g2d.onrender.com',
    'http://localhost:5173'
].filter(Boolean).map(url => url.replace(/\/$/, "")); // Remove trailing slashes

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or local tools)
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            logger.warn(`Rejected CORS request from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(compression());
app.use(morgan('combined', { stream: morganStream }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
        }
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.logError(err, {
        method: req.method,
        path: req.path,
        userId: req.user?.userId
    });

    const statusCode = err.statusCode || 500;
    const message = err.message || ERROR_MESSAGES.SERVER.INTERNAL_ERROR;

    return sendError(res, {
        error: message,
        statusCode
    });
});

// 404 handler
app.use((req, res) => {
    return sendNotFound(res, ERROR_MESSAGES.SERVER.ROUTE_NOT_FOUND);
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Initialize services and start server
const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        // Test database connection
        await prisma.$connect();
        logger.info('Database connection established successfully');

        // Reset online status on startup
        await prisma.user.updateMany({
            data: { isOnline: false }
        });
        logger.info('Reset all users online status on startup');

        // Initialize MinIO
        await initializeMinIO();
        logger.info('MinIO initialized successfully');

        // Start server
        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`🔗 API URL: http://0.0.0.0:${PORT}/api`);
            logger.info(`🔌 Socket.IO ready for connections`);
            logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error: error.message, stack: error.stack });
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    server.close(async () => {
        logger.info('Server closed');
        await prisma.$disconnect();
        process.exit(0);
    });
});

export { app, io };

