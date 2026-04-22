require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require("./config/db");

const app = express();

// Connect to MongoDB
connectDB();

// ─── Global Middleware ────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/,
];
app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return cb(null, true);
    const ok = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
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

// Health check
app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ─── Serve Static Frontend (only used when running Express locally with built client) ──
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    // SPA fallback — all non-API routes serve index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
} else {
    // Dev mode: no built frontend
    app.get('*', (req, res) => {
        res.json({ message: 'API server running. Frontend served separately by Vite (localhost:5173).' });
    });
}

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Free it and retry.`);
        console.error(`   Run: taskkill /IM node.exe /F`);
    } else {
        console.error('[Server Error]', err);
    }
    process.exit(1);
});

module.exports = app;