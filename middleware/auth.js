const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthMiddleware {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    }

    // Generate session token
    generateToken(userId) {
        return jwt.sign({ userId }, this.secretKey, { expiresIn: '1h' });
    }

    // Verify API key
    verifyApiKey(req, res, next) {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey || apiKey !== process.env.API_KEY) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        next();
    }

    // Verify session token
    verifyToken(req, res, next) {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        try {
            const decoded = jwt.verify(token, this.secretKey);
            req.userId = decoded.userId;
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    }

    // Rate limiting per user
    rateLimitPerUser(req, res, next) {
        const userId = req.userId;
        const now = Date.now();
        
        if (!this.requestCounts) {
            this.requestCounts = new Map();
        }

        const userRequests = this.requestCounts.get(userId) || { count: 0, resetTime: now + 3600000 };

        if (now > userRequests.resetTime) {
            userRequests.count = 0;
            userRequests.resetTime = now + 3600000;
        }

        if (userRequests.count >= 100) {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        userRequests.count++;
        this.requestCounts.set(userId, userRequests);
        next();
    }
}

module.exports = new AuthMiddleware(); 