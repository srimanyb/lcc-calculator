const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require("./config/db");

// Load env vars
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Disable Mongoose buffering on Vercel to prevent hangs
if (process.env.VERCEL) {
    mongoose.set('bufferCommands', false);
}

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, cb) => {
        // Allow all .vercel.app subdomains and localhost
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.vercel.app')) {
            return cb(null, true);
        }
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// ─── DB Connection Middleware ────────────────────────────────────────────────
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/health')) return next();

    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing from environment variables.");
        }

        if (mongoose.connection.readyState === 0) {
            console.log(`[DB] Connecting for ${req.path}...`);
            await connectDB();
        }
        next();
    } catch (err) {
        console.error(`[DB Error]:`, err.message);
        res.status(503).json({ 
            message: "Database connection failed.",
            tip: "Ensure MONGO_URI is set in Vercel/Env and Atlas IPs are whitelisted.",
            error: err.message 
        });
    }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/recipes',   require('./routes/recipes'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/events',    require('./routes/events'));

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        db: mongoose.connection.readyState,
        env: {
            is_vercel: !!process.env.VERCEL,
            has_uri: !!process.env.MONGO_URI,
            node: process.version
        }
    });
});

// ─── Frontend Serving (Local Only) ───────────────────────────────────────────
if (!process.env.VERCEL) {
    const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(CLIENT_DIST));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API route not found' });
        res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
            if (err) res.status(404).send("Frontend build not found. Run 'npm run build' first.");
        });
    });
}

// ─── Start Logic ──────────────────────────────────────────────────────────────
const startServer = async () => {
    try {
        await connectDB();
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Startup failed:', err.message);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = app;

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