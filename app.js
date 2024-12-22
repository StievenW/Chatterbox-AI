const express = require('express');
const security = require('./middleware/security');
const { validateChat, validatePersonality, validate } = require('./middleware/validator');
const auth = require('./middleware/auth');
const compression = require('compression');
const morgan = require('morgan');

class App {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Setup basic middleware
        this.app.use(express.json({ limit: '10kb' }));
        this.app.use(compression());
        
        // Setup logging in development
        if (process.env.NODE_ENV === 'development') {
            this.app.use(morgan('dev'));
        }

        // Apply security middleware
        security.setup(this.app);
    }

    setupRoutes() {
        // API routes with authentication and validation
        this.app.use('/api/chat', [
            auth.verifyApiKey,
            auth.verifyToken,
            auth.rateLimitPerUser,
            validateChat,
            validate
        ]);

        this.app.use('/api/save-personality', [
            auth.verifyApiKey,
            validatePersonality,
            validate
        ]);

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
    }

    setupErrorHandling() {
        // Modern error handling
        this.app.use((err, req, res, next) => {
            console.error(err.stack);

            const errorResponse = {
                error: {
                    message: err.message || 'Internal server error',
                    code: err.code || 500,
                    requestId: req.requestId,
                    timestamp: new Date().toISOString()
                }
            };

            if (process.env.NODE_ENV === 'development') {
                errorResponse.error.stack = err.stack;
            }

            res.status(err.status || 500).json(errorResponse);
        });
    }

    getApp() {
        return this.app;
    }
}

module.exports = new App().getApp(); 