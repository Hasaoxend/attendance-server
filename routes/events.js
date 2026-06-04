const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');
const { generateEventToken } = require('../utils/qr-service');

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { canStudentJoinEvent } = require('../utils/event-eligibility');

// ---- Upload (decision image) ----
const decisionsDir = path.join(__dirname, '..', 'uploads', 'decisions');
fs.mkdirSync(decisionsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, decisionsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
        const eventId = req.params.id || 'event';
        cb(null, `decision_${eventId}_${Date.now()}${safeExt}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new Error('Invalid file type'), ok);
    }
});

// @route   GET api/events
// @desc    Get all events
router.get('/', auth(), async (req, res) => {
    const userId = req.user?.role === 'student' ? req.user.id : null;

    try {
        const { rows } = await db.query(
            `
            SELECT e.*, 
                   (SELECT COUNT(*) FROM checkins WHERE event_id = e.id) as checked_in_count,
                   (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registered_count,
                   (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
                   CASE
                        WHEN $1::int IS NULL THEN false
                        ELSE EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.id AND r.user_id = $1::int)
                   END as is_registered
            FROM events e 
            ORDER BY e.priority DESC, e.start_time DESC
            `,
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/events
// @desc    Create event (Admin)
router.post('/', auth('admin', 'union'), async (req, res) => {
    const {
        name,
        location_lat,
        location_lng,
        location_name,
        event_type,
        allowed_faculty,
        allowed_institute,
        radius,
        start_time,
        end_time,
        score,
        unit,
        max_participants,
        qr_type,
        content,
        training_points,
        priority,
        is_active
    } = req.body;

    try {
        const result = await db.query(
            `INSERT INTO events (
                name, location_lat, location_lng, location_name, event_type,
                allowed_faculty, allowed_institute,
                radius, start_time, end_time, score, unit, max_participants,
                qr_type, content, training_points, priority, is_active
            ) VALUES (
                $1,$2,$3,$4,$5,
                $6,$7,$8,$9,$10,$11,$12,$13,
                $14,$15,$16,$17,$18
            ) RETURNING *`,
            [
                name,
                location_lat,
                location_lng,
                location_name || '',
                event_type || '',
                allowed_faculty || '',
                allowed_institute || '',
                radius || 50,
                start_time,
                end_time,
                score || 0,
                unit || '',
                max_participants || 100,
                qr_type || 'dynamic',
                content || '',
                training_points || 0,
                priority || 0,
                is_active !== undefined ? is_active : true
            ]
        );
        res.status(201).json({ message: 'Event created successfully', event: result.rows[0] });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   POST api/events/:id/decision-image
// @desc    Upload decision image for event (Admin)
router.post('/:id/decision-image', auth('admin', 'union'), upload.single('image'), async (req, res) => {
    try {
        const eventId = req.params.id;
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No image uploaded' });

        const publicUrl = `/uploads/decisions/${file.filename}`;

        const result = await db.query(
            'UPDATE events SET decision_image_url = $1 WHERE id = $2 RETURNING id, decision_image_url',
            [publicUrl, eventId]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Event not found' });

        res.json({ message: 'Uploaded successfully', decision_image_url: result.rows[0].decision_image_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/events/:id/qr-token
// @desc    Get current dynamic QR token (Admin only)
router.get('/:id/qr-token', auth('admin', 'union'), async (req, res) => {
    const eventId = req.params.id;
    try {
        const { rows } = await db.query('SELECT qr_type FROM events WHERE id = $1', [eventId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Event not found' });

        const token = generateEventToken(eventId, rows[0].qr_type);
        res.json({ token, qrType: rows[0].qr_type });
    } catch (err) {
        console.error('Error generating token:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET api/events/:id
// @desc    Get event by ID
router.get('/:id', auth(), async (req, res) => {
    const userId = req.user?.role === 'student' ? req.user.id : null;

    try {
        const { rows } = await db.query(
            `
            SELECT e.*,
                   (SELECT COUNT(*) FROM checkins WHERE event_id = e.id) as checked_in_count,
                   (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registered_count,
                   CASE
                        WHEN $2::int IS NULL THEN false
                        ELSE EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.id AND r.user_id = $2::int)
                   END as is_registered
            FROM events e
            WHERE e.id = $1
            `,
            [req.params.id, userId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Event not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching event:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/events/:id/register
// @desc    Student registers for an event
router.post('/:id/register', auth('student'), async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.id;

    try {
        const { rows: eventRows } = await db.query('SELECT id, is_active, end_time, max_participants, allowed_faculty, allowed_institute FROM events WHERE id = $1', [eventId]);
        if (eventRows.length === 0) return res.status(404).json({ message: 'Event not found' });

        const event = eventRows[0];
        if (!event.is_active) return res.status(400).json({ message: 'Sự kiện đang tắt đăng ký' });

        const { rows: studentRows } = await db.query('SELECT id, faculty, institute FROM users WHERE id = $1 AND role = $2', [userId, 'student']);
        const student = studentRows[0];
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (!canStudentJoinEvent(student, event)) {
            return res.status(403).json({ message: 'Sinh viên không thuộc khoa/viện được phép tham gia sự kiện này' });
        }

        const now = new Date();
        if (now > new Date(event.end_time)) return res.status(400).json({ message: 'Sự kiện đã kết thúc' });

        const { rows: countRows } = await db.query('SELECT COUNT(*)::int as c FROM event_registrations WHERE event_id = $1', [eventId]);
        const registeredCount = countRows[0]?.c || 0;
        if (registeredCount >= Number(event.max_participants || 0)) {
            return res.status(400).json({ message: 'Sự kiện đã đủ số lượng đăng ký' });
        }

        const insert = await db.query(
            'INSERT INTO event_registrations (user_id, event_id) VALUES ($1, $2) ON CONFLICT (user_id, event_id) DO NOTHING RETURNING id',
            [userId, eventId]
        );

        if (insert.rows.length === 0) {
            return res.status(200).json({ message: 'Bạn đã đăng ký sự kiện này rồi', alreadyRegistered: true });
        }

        res.status(201).json({ message: 'Đăng ký sự kiện thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE api/events/:id/register
// @desc    Student unregisters from an event
router.delete('/:id/register', auth('student'), async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.id;

    try {
        const { rows: checkinRows } = await db.query('SELECT id FROM checkins WHERE user_id = $1 AND event_id = $2', [userId, eventId]);
        if (checkinRows.length > 0) {
            return res.status(400).json({ message: 'Bạn đã điểm danh, không thể hủy đăng ký' });
        }

        const result = await db.query(
            'DELETE FROM event_registrations WHERE user_id = $1 AND event_id = $2 RETURNING id',
            [userId, eventId]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Bạn chưa đăng ký sự kiện này' });
        res.json({ message: 'Hủy đăng ký thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/events/:id/registrations
// @desc    Admin list registrations + checkin status
router.get('/:id/registrations', auth('admin', 'union'), async (req, res) => {
    const eventId = req.params.id;

    try {
        const { rows } = await db.query(
            `
            SELECT u.id, u.username, u.name, u.student_code, u.class_name, u.faculty, u.institute,
                   r.registered_at,
                   CASE WHEN c.id IS NULL THEN 'absent' ELSE 'checked_in' END as status,
                   c.checkin_time
            FROM event_registrations r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN checkins c ON c.user_id = r.user_id AND c.event_id = r.event_id
            WHERE r.event_id = $1
            ORDER BY r.registered_at ASC
            `,
            [eventId]
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/:id/attendance-status', auth('admin', 'union'), async (req, res) => {
    const eventId = req.params.id;
    try {
        const { rows: students } = await db.query('SELECT id, name, username FROM users WHERE role = $1 ORDER BY name ASC', ['student']);
        const { rows: checkins } = await db.query('SELECT user_id FROM checkins WHERE event_id = $1', [eventId]);

        const checkedInIds = new Set(checkins.map(c => c.user_id));
        const statusList = students.map(s => ({
            ...s,
            status: checkedInIds.has(s.id) ? 'checked_in' : 'absent'
        }));

        res.json(statusList);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/events/:id
// @desc    Update an event
router.put('/:id', auth('admin', 'union'), async (req, res) => {
    const {
        name,
        location_lat,
        location_lng,
        location_name,
        event_type,
        allowed_faculty,
        allowed_institute,
        radius,
        start_time,
        end_time,
        score,
        qr_type,
        content,
        training_points,
        priority,
        is_active
    } = req.body;

    try {
        const result = await db.query(
            `
            UPDATE events SET
                name = $1,
                location_lat = $2,
                location_lng = $3,
                location_name = $4,
                event_type = $5,
                allowed_faculty = $6,
                allowed_institute = $7,
                radius = $8,
                start_time = $9,
                end_time = $10,
                score = $11,
                qr_type = $12,
                content = $13,
                training_points = $14,
                priority = $15,
                is_active = $16
            WHERE id = $17
            RETURNING *
            `,
            [
                name,
                location_lat,
                location_lng,
                location_name || '',
                event_type || '',
                allowed_faculty || '',
                allowed_institute || '',
                radius,
                start_time,
                end_time,
                score,
                qr_type,
                content,
                training_points,
                priority || 0,
                is_active !== undefined ? is_active : true,
                req.params.id
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event updated successfully', event: result.rows[0] });
    } catch (err) {
        console.error('Error updating event:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE api/events/:id
// @desc    Delete an event
router.delete('/:id', auth('admin', 'union'), async (req, res) => {
    try {
        // delete registrations + check-ins first (or rely on FK cascade)
        await db.query('DELETE FROM checkins WHERE event_id = $1', [req.params.id]);
        await db.query('DELETE FROM event_registrations WHERE event_id = $1', [req.params.id]);

        const result = await db.query('DELETE FROM events WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        console.error('Error deleting event:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PATCH api/events/:id/toggle
// @desc    Toggle event activity
router.patch('/:id/toggle', auth('admin', 'union'), async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE events SET is_active = NOT is_active WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Status updated', event: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
