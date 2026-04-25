/**
 * Senior Full-Stack Engineer Refactor:
 * Clean, modular Express server with robust error handling and DB integration.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require("./config/db");

const app = express();

// ─── DB Connection Middleware ────────────────────────────────────────────────
// Ensures the database is connected or connecting before proceeding.
app.use(async (req, res, next) => {
    const state = mongoose.connection.readyState;
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    
    // Skip for health checks
    if (req.path.startsWith('/api/health')) return next();

    try {
        if (!process.env.MONGO_URI && !req.path.startsWith('/api/health')) {
            console.error('[DB Middleware] CRITICAL: MONGO_URI is not defined in environment variables.');
            return res.status(500).json({ 
                message: "Server configuration error: Database URI is missing.",
                tip: "If this is Vercel, add MONGO_URI to your Project Settings -> Environment Variables."
            });
        }

        if (state === 0) {
            console.log(`[DB Middleware] State 0 (Disconnected). Attempting connection for ${req.path}...`);
            await connectDB();
        } else if (state === 3) {
            console.warn(`[DB Middleware] State 3 (Disconnecting). Blocking request.`);
            return res.status(503).json({ message: "Database is disconnecting. Please try again." });
        }
        // State 1 (Connected) and 2 (Connecting) are allowed.
        // Mongoose buffers operations if state is 2, so it's safe to proceed.
        next();
    } catch (err) {
        console.error(`[DB Middleware] Connection Error:`, err.message);
        res.status(503).json({ 
            message: "Database connection failed. Please check your configuration and try again.",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ─── Middleware ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  /\.vercel\.app$/,
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const ok = allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many requests, please slow down.' },
}));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/events', require('./routes/events'));

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        db: mongoose.connection.readyState,
        env: {
            node_env: process.env.NODE_ENV,
            has_mongo_uri: !!process.env.MONGO_URI,
            has_jwt_secret: !!process.env.JWT_SECRET,
            is_vercel: !!process.env.VERCEL
        }
    });
});

// ─── Serve Static Frontend ───────────────────────────────────────────────────
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(CLIENT_DIST));

app.get('*', (req, res) => {
    const indexPath = path.join(CLIENT_DIST, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ message: 'Frontend build not found.' });
    }
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        await connectDB();
        
        if (!process.env.VERCEL) {
            const server = app.listen(PORT, "0.0.0.0", () => {
                console.log(`🚀 Server running on http://localhost:${PORT}`);
            });

            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${PORT} is already in use. Run 'npm run kill-ports' to fix.`);
                } else {
                    console.error('[Server Start Error]', err);
                }
                process.exit(1);
            });
        }
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        if (!process.env.VERCEL) process.exit(1);
    }
};

// Graceful Shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
});

process.on('unhandledRejection', (err) => console.error('🔥 Unhandled Rejection:', err));
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    setTimeout(() => process.exit(1), 1000);
});

// ─── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
    startServer();
}

module.exports = app;