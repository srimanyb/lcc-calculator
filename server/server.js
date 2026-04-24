const path = require('path');
const dotenv = require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
console.log(`📝 Environment loaded: ${dotenv.error ? '❌ FAILED' : '✅ SUCCESS'}`);
if (dotenv.error) console.warn(`   Trying to load from root: ${path.join(__dirname, '..', '.env')}`);
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require("./config/db");

const app = express();

// MongoDB connection is handled in startServer() at the bottom of the file

// ─── DB Wait Middleware ──────────────────────────────────────────────────────
app.use((req, res, next) => {
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    // Only block if we are completely disconnected (0) or disconnecting (3)
    if ([0, 3].includes(mongoose.connection.readyState) && !req.path.startsWith('/api/health')) {
        console.warn(`[DB Middleware] Request blocked. readyState: ${mongoose.connection.readyState} (Expected 1)`);
        return res.status(503).json({ 
            message: "Database is connecting. Please refresh in a few seconds..." 
        });
    }
    next();
});
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  /\.vercel\.app$/,
];
app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return cb(null, true);
    
    const ok = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    
    if (!ok) {
      console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
    }
    
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting — 100 requests per 15 min per IP
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please slow down.' },
}));

// Stricter limit for auth endpoints
app.use('/api/auth/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many auth attempts, please try again later.' },
}));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/events', require('./routes/events'));

// Health check
app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// Test route
app.get("/api/test", (req, res) => res.json({ message: "working" }));

// ─── Serve Static Frontend ───────────────────────────────────────────────────
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

// Serve static files from the Vite build directory
app.use(express.static(CLIENT_DIST));

// SPA fallback — all non-API routes serve index.html
app.get('*', (req, res) => {
    const indexPath = path.join(CLIENT_DIST, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ 
            message: 'Frontend not built. Run "npm run build" first.',
            path: indexPath
        });
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
        // Connect to MongoDB
        await connectDB();
        
        // Only start listening if NOT on Vercel (Vercel handles the listener)
        if (!process.env.VERCEL) {
            const server = app.listen(PORT, "0.0.0.0", () => {
                console.log(`🚀 Server running on http://localhost:${PORT}`);
            });

            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
                    console.error(`   The server cannot start because another process is using this port.`);
                    console.error(`   👉 FIX: I have added a 'kill-ports' script. Run: npm run kill-ports`);
                    console.error(`   Or manually run: taskkill /IM node.exe /F\n`);
                } else {
                    console.error('[Server Start Error]', err);
                }
                process.exit(1);
            });
        }
    } catch (err) {
        console.error('❌ Failed to start server due to database connection error.');
        // If not on Vercel, we already handle exit in db.js, 
        // but this is a safety net.
        if (!process.env.VERCEL) process.exit(1);
    }
};

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ─── Global Error Handlers ───────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    // Give time to log then exit
    setTimeout(() => process.exit(1), 1000);
});

startServer();

module.exports = app;