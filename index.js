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
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — allow known frontends + same-origin (production on Render)
const allowedOrigins = [
    process.env.FRONTEND_URL,       // production (if separate frontend)
    'http://localhost:5173',         // Vite dev
    'http://localhost:4173',         // Vite preview
    'http://localhost:3000',         // fallback dev
].filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, same-origin in some browsers)
        if (!origin) return callback(null, true);

        // Allow explicitly listed origins
        if (allowedOrigins.includes(origin)) return callback(null, true);

        // In production: frontend is served from the SAME Express server,
        // so the origin will match the Render URL. Allow it.
        if (isProduction) return callback(null, true);

        // Dev: block unknown origins but log for debugging
        console.warn(`[CORS] Blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(bodyParser.json());

// Trust proxy — needed for req.ip to return real client IP behind Render/nginx
app.set('trust proxy', true);

// Serve uploaded files (event decision images, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint (useful for Render.com)
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Seed endpoint — only works when database is empty (for Render Free tier without Shell)
app.post('/api/seed', async (_req, res) => {
    try {
        const { rows } = await db.query('SELECT COUNT(*) FROM users');
        if (parseInt(rows[0].count) > 0) {
            return res.status(400).json({ error: 'Database already has data. Seed skipped.' });
        }

        const bcrypt = require('bcryptjs');
        const adminPass = await bcrypt.hash('admin123', 10);
        const studentPass = await bcrypt.hash('password123', 10);

        await db.query('INSERT INTO users (username, password, name, role) VALUES ($1,$2,$3,$4)', ['admin', adminPass, 'System Admin', 'admin']);
        await db.query('INSERT INTO users (username, password, name, role) VALUES ($1,$2,$3,$4)', ['union_officer', studentPass, 'Nguyễn Cán Bộ', 'union']);
        const { rows: s1 } = await db.query('INSERT INTO users (username, password, name, role, student_code, class_name, faculty, institute) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', ['student', studentPass, 'Nguyen Van A', 'student', 'SV001', 'K60-CNTT', 'Công nghệ thông tin', 'Viện đào tạo quốc tế']);
        const { rows: s2 } = await db.query('INSERT INTO users (username, password, name, role, student_code, class_name, faculty, institute) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', ['student2', studentPass, 'Tran Thi B', 'student', 'SV002', 'K60-KT', 'Kinh tế', 'Viện đào tạo chất lượng cao']);

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const { rows: e1 } = await db.query(
            `INSERT INTO events (name, location_lat, location_lng, location_name, event_type, radius, start_time, end_time, score, qr_type, content, training_points, max_participants, priority, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
            ['Hoi nghi Khoa hoc 2024', 10.762622, 106.660172, 'Trường Đại học Hàng Hải', 'Học thuật', 100, now, tomorrow, 10, 'dynamic', 'Sự kiện mẫu để test đăng ký + điểm danh', 5, 100, 1, true]
        );
        await db.query('INSERT INTO event_registrations (user_id, event_id) VALUES ($1,$2),($3,$2)', [s1[0].id, e1[0].id, s2[0].id]);

        res.json({ success: true, message: 'Seed completed! You can now log in.' });
    } catch (err) {
        console.error('[Seed API Error]', err);
        res.status(500).json({ error: err.message });
    }
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
