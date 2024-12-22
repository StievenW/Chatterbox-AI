const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const { createHash } = require('crypto');

// Modern security configuration
class SecurityMiddleware {
    constructor() {
        // Initialize rate limiter with Redis for better scalability
        this.limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            standardHeaders: true,
            legacyHeaders: false,
            message: { error: 'Too many requests, please try again later.' }
        });

        // Modern CORS config
        this.corsOptions = {
            origin: (origin, callback) => {
                const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000'];
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('CORS policy violation'));
                }
            },
            methods: ['GET', 'POST'],
            credentials: true,
            maxAge: 3600,
            allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
        };

        // Security headers configuration
        this.helmetConfig = {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
                    styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'", 'https://api.chai-research.com'],
                    fontSrc: ["'self'", 'cdnjs.cloudflare.com'],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    formAction: ["'self'"],
                    upgradeInsecureRequests: []
                }
            },
            crossOriginEmbedderPolicy: true,
            crossOriginOpenerPolicy: true,
            crossOriginResourcePolicy: { policy: "same-site" },
            dnsPrefetchControl: true,
            frameguard: { action: 'deny' },
            hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
            ieNoOpen: true,
            noSniff: true,
            permittedCrossDomainPolicies: { permittedPolicies: "none" },
            referrerPolicy: { policy: "strict-origin-when-cross-origin" },
            xssFilter: true,
            originAgentCluster: true
        };
    }

    // Modern file access protection
    protectSensitiveFiles(req, res, next) {
        const path = req.path.toLowerCase();
        const sensitivePatterns = [
            /\.env/,
            /\.git/,
            /\.config/,
            /node_modules/,
            /\.log$/,
            /\.sql$/,
            /\.htaccess$/,
            /wp-config/,
            /config\.js/,
            /package\.json/
        ];

        if (sensitivePatterns.some(pattern => pattern.test(path))) {
            return res.status(403).json({
                error: 'Access Forbidden',
                timestamp: new Date().toISOString(),
                path: path.replace(/[^\w-/]/g, '_') // Sanitize path for logging
            });
        }

        // Generate request hash for tracking
        const requestHash = createHash('sha256')
            .update(`${req.ip}-${req.path}-${Date.now()}`)
            .digest('hex')
            .substr(0, 8);

        req.requestId = requestHash;
        next();
    }

    // Setup all security middleware
    setup(app) {
        // Basic security
        app.use(helmet(this.helmetConfig));
        app.use(cors(this.corsOptions));
        
        // API protection
        app.use('/api/', this.limiter);
        app.use(xss());
        app.use(hpp());
        
        // File protection
        app.use(this.protectSensitiveFiles.bind(this));
        
        // Remove unnecessary headers
        app.disable('x-powered-by');
        
        // Add security headers
        app.use((req, res, next) => {
            // Modern security headers
            res.setHeader('X-DNS-Prefetch-Control', 'off');
            res.setHeader('X-Download-Options', 'noopen');
            res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
            res.setHeader('Origin-Agent-Cluster', '?1');
            
            // Add request ID for tracking
            res.setHeader('X-Request-ID', req.requestId);
            
            next();
        });

        // Error handler for security violations
        app.use((err, req, res, next) => {
            if (err.name === 'SecurityError') {
                return res.status(403).json({
                    error: 'Security violation detected',
                    requestId: req.requestId,
                    timestamp: new Date().toISOString()
                });
            }
            next(err);
        });

        return app;
    }
}

module.exports = new SecurityMiddleware(); 