require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const db = require('./config/db');
const ensureSchema = require('./utils/ensure-schema');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const checkinRoutes = require('./routes/checkins');
const studentRoutes = require('./routes/students');
const historyRoutes = require('./routes/history');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — only allow known frontends
const allowedOrigins = [
    process.env.FRONTEND_URL,       // production (Firebase Hosting)
    'http://localhost:5173',         // Vite dev
    'http://localhost:4173',         // Vite preview
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(bodyParser.json());

// Serve uploaded files (event decision images, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint (useful for Render.com)
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve Frontend (production) ───────────────────────────
if (process.env.NODE_ENV === 'production') {
    const publicDir = path.join(__dirname, 'public');
    app.use(express.static(publicDir));

    // SPA fallback: any non-API route → index.html
    // Express 5 requires named wildcard syntax {*path}
    app.get('{*path}', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(publicDir, 'index.html'));
        }
    });
}

(async () => {
    try {
        await ensureSchema(db);
        console.log('[DB] Schema ensured');

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('[DB] Failed to ensure schema:', err);
        process.exit(1);
    }
})();
