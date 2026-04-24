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

// ─── DB Wait Middleware ──────────────────────────────────────────────────────
// Blocks requests if the DB is disconnected, but allows 'connecting' (readyState 2)
// because Mongoose buffering handles it gracefully.
app.use((req, res, next) => {
    const state = mongoose.connection.readyState;
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if ([0, 3].includes(state) && !req.path.startsWith('/api/health')) {
        console.warn(`[DB Middleware] Blocked ${req.method} ${req.path} - State: ${state}`);
        return res.status(503).json({ 
            message: `Database is currently unavailable (Status: ${state}). Please refresh in a few seconds...` 
        });
    }
    next();
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

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState }));

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

startServer();

module.exports = app;