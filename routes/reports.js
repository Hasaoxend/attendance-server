const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');
const ExcelJS = require('exceljs');

// ============================================================
// 7.1 — Thống kê hoạt động (Overview)
// ============================================================
router.get('/overview', auth('admin', 'union', 'lecturer'), async (_req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM events) as total_events,
                (SELECT COUNT(*) FROM events WHERE is_active = true AND NOW() BETWEEN start_time AND end_time) as ongoing_events,
                (SELECT COUNT(*) FROM events WHERE is_active = true AND start_time > NOW()) as upcoming_events,
                (SELECT COUNT(*) FROM events WHERE end_time < NOW()) as past_events,
                (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
                (SELECT COUNT(*) FROM checkins) as total_checkins,
                (SELECT COUNT(*) FROM event_registrations) as total_registrations
        `);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Monthly event counts (for chart)
router.get('/events-by-month', auth('admin', 'union', 'lecturer'), async (_req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                TO_CHAR(start_time, 'YYYY-MM') as month,
                COUNT(*) as count
            FROM events
            WHERE start_time >= NOW() - INTERVAL '12 months'
            GROUP BY TO_CHAR(start_time, 'YYYY-MM')
            ORDER BY month ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// 7.2 — Thống kê đăng ký
// ============================================================
router.get('/registrations', auth('admin', 'union', 'lecturer'), async (req, res) => {
    const { from, to } = req.query;
    try {
        let query = `
            SELECT 
                e.id, e.name, e.start_time, e.end_time, e.max_participants, e.event_type,
                COUNT(r.id)::int as registered_count,
                e.max_participants as max_count
            FROM events e
            LEFT JOIN event_registrations r ON r.event_id = e.id
        `;
        const params = [];
        const conditions = [];

        if (from) {
            params.push(from);
            conditions.push(`e.start_time >= $${params.length}`);
        }
        if (to) {
            params.push(to);
            conditions.push(`e.end_time <= $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY e.id ORDER BY e.start_time DESC';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// 7.3 — Thống kê điểm danh
// ============================================================
router.get('/attendance', auth('admin', 'union', 'lecturer'), async (req, res) => {
    const { eventId, from, to } = req.query;
    try {
        let query = `
            SELECT 
                e.id, e.name, e.start_time, e.end_time, e.event_type,
                COUNT(DISTINCT r.user_id)::int as registered_count,
                COUNT(DISTINCT c.user_id)::int as checked_in_count,
                (COUNT(DISTINCT r.user_id) - COUNT(DISTINCT c.user_id))::int as absent_count
            FROM events e
            LEFT JOIN event_registrations r ON r.event_id = e.id
            LEFT JOIN checkins c ON c.event_id = e.id
        `;
        const params = [];
        const conditions = [];

        if (eventId) {
            params.push(eventId);
            conditions.push(`e.id = $${params.length}`);
        }
        if (from) {
            params.push(from);
            conditions.push(`e.start_time >= $${params.length}`);
        }
        if (to) {
            params.push(to);
            conditions.push(`e.end_time <= $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY e.id ORDER BY e.start_time DESC';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// 7.4 — Thống kê điểm rèn luyện (Training Points Ranking)
// ============================================================
router.get('/training-points', auth('admin', 'union', 'lecturer'), async (req, res) => {
    const { from, to } = req.query;
    try {
        let dateFilter = '';
        const params = [];

        if (from) {
            params.push(from);
            dateFilter += ` AND c.checkin_time >= $${params.length}`;
        }
        if (to) {
            params.push(to);
            dateFilter += ` AND c.checkin_time <= $${params.length}`;
        }

        const { rows } = await db.query(`
            SELECT 
                u.id, u.username, u.name, u.student_code, u.class_name, u.faculty, u.institute,
                COALESCE(SUM(e.training_points), 0)::int as total_training_points,
                COUNT(c.id)::int as events_attended
            FROM users u
            LEFT JOIN checkins c ON c.user_id = u.id ${dateFilter}
            LEFT JOIN events e ON e.id = c.event_id
            WHERE u.role = 'student'
            GROUP BY u.id
            ORDER BY total_training_points DESC, events_attended DESC
        `, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// 7.5 — Tra cứu lịch sử hoạt động + IP/Device
// ============================================================
router.get('/activity-log', auth('admin', 'union', 'lecturer'), async (req, res) => {
    const { q, studentId, from, to } = req.query;
    try {
        let query = `
            SELECT 
                c.id, c.checkin_time, c.ip_address, c.device_id, c.status,
                c.lat, c.lng,
                u.id as user_id, u.username, u.name, u.student_code, u.class_name, u.faculty, u.institute,
                e.id as event_id, e.name as event_name, e.event_type, e.training_points, e.score
            FROM checkins c
            JOIN users u ON u.id = c.user_id
            JOIN events e ON e.id = c.event_id
        `;
        const params = [];
        const conditions = [];

        if (studentId) {
            params.push(studentId);
            conditions.push(`u.id = $${params.length}`);
        }
        if (q) {
            params.push(`%${q}%`);
            conditions.push(`(u.name ILIKE $${params.length} OR u.username ILIKE $${params.length} OR u.student_code ILIKE $${params.length} OR c.device_id ILIKE $${params.length} OR c.ip_address ILIKE $${params.length})`);
        }
        if (from) {
            params.push(from);
            conditions.push(`c.checkin_time >= $${params.length}`);
        }
        if (to) {
            params.push(to);
            conditions.push(`c.checkin_time <= $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY c.checkin_time DESC LIMIT 500';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// 7.6 — Xuất báo cáo Excel
// ============================================================
router.get('/export/excel', auth('admin', 'union', 'lecturer'), async (req, res) => {
    const { type, eventId, from, to } = req.query;

    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Attendance System';
        workbook.created = new Date();

        if (type === 'attendance' && eventId) {
            // Export attendance for a specific event
            const { rows: eventRows } = await db.query('SELECT name FROM events WHERE id = $1', [eventId]);
            const eventName = eventRows[0]?.name || 'Event';

            const { rows } = await db.query(`
                SELECT u.username, u.name, u.student_code, u.class_name, u.faculty, u.institute,
                       r.registered_at,
                       CASE WHEN c.id IS NULL THEN 'Vắng' ELSE 'Đã điểm danh' END as status,
                       c.checkin_time, c.ip_address, c.device_id
                FROM event_registrations r
                JOIN users u ON u.id = r.user_id
                LEFT JOIN checkins c ON c.user_id = r.user_id AND c.event_id = r.event_id
                WHERE r.event_id = $1
                ORDER BY u.name ASC
            `, [eventId]);

            const sheet = workbook.addWorksheet('Điểm danh');
            sheet.columns = [
                { header: 'MSSV', key: 'username', width: 15 },
                { header: 'Họ và tên', key: 'name', width: 25 },
                { header: 'Mã SV', key: 'student_code', width: 15 },
                { header: 'Lớp', key: 'class_name', width: 15 },
                { header: 'Khoa', key: 'faculty', width: 25 },
                { header: 'Viện', key: 'institute', width: 25 },
                { header: 'Trạng thái', key: 'status', width: 15 },
                { header: 'Thời gian điểm danh', key: 'checkin_time', width: 20 },
                { header: 'Địa chỉ IP', key: 'ip_address', width: 18 },
                { header: 'ID Thiết bị', key: 'device_id', width: 25 },
            ];

            // Style header
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

            rows.forEach(row => {
                sheet.addRow({
                    ...row,
                    checkin_time: row.checkin_time ? new Date(row.checkin_time).toLocaleString('vi-VN') : '',
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="diem_danh_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx"`);

        } else if (type === 'registrations') {
            // Export all registrations
            let query = `
                SELECT e.name as event_name, e.start_time, e.event_type,
                       u.username, u.name as student_name, u.student_code, u.class_name, u.faculty, u.institute,
                       r.registered_at
                FROM event_registrations r
                JOIN users u ON u.id = r.user_id
                JOIN events e ON e.id = r.event_id
            `;
            const params = [];
            const conditions = [];
            if (from) { params.push(from); conditions.push(`e.start_time >= $${params.length}`); }
            if (to) { params.push(to); conditions.push(`e.end_time <= $${params.length}`); }
            if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY e.start_time DESC, u.name ASC';

            const { rows } = await db.query(query, params);

            const sheet = workbook.addWorksheet('Đăng ký');
            sheet.columns = [
                { header: 'Sự kiện', key: 'event_name', width: 30 },
                { header: 'Loại', key: 'event_type', width: 15 },
                { header: 'MSSV', key: 'username', width: 15 },
                { header: 'Họ và tên', key: 'student_name', width: 25 },
                { header: 'Mã SV', key: 'student_code', width: 15 },
                { header: 'Lớp', key: 'class_name', width: 15 },
                { header: 'Khoa', key: 'faculty', width: 25 },
                { header: 'Viện', key: 'institute', width: 25 },
                { header: 'Đăng ký lúc', key: 'registered_at', width: 20 },
            ];

            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF548235' } };

            rows.forEach(row => {
                sheet.addRow({
                    ...row,
                    registered_at: row.registered_at ? new Date(row.registered_at).toLocaleString('vi-VN') : '',
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="dang_ky_su_kien.xlsx"');

        } else if (type === 'training-points') {
            // Export training points ranking
            let dateFilter = '';
            const params = [];
            if (from) { params.push(from); dateFilter += ` AND c.checkin_time >= $${params.length}`; }
            if (to) { params.push(to); dateFilter += ` AND c.checkin_time <= $${params.length}`; }

            const { rows } = await db.query(`
                SELECT 
                    u.username, u.name, u.student_code, u.class_name, u.faculty, u.institute,
                    COALESCE(SUM(e.training_points), 0)::int as total_training_points,
                    COUNT(c.id)::int as events_attended
                FROM users u
                LEFT JOIN checkins c ON c.user_id = u.id ${dateFilter}
                LEFT JOIN events e ON e.id = c.event_id
                WHERE u.role = 'student'
                GROUP BY u.id
                ORDER BY total_training_points DESC
            `, params);

            const sheet = workbook.addWorksheet('Điểm rèn luyện');
            sheet.columns = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'MSSV', key: 'username', width: 15 },
                { header: 'Họ và tên', key: 'name', width: 25 },
                { header: 'Mã SV', key: 'student_code', width: 15 },
                { header: 'Lớp', key: 'class_name', width: 15 },
                { header: 'Khoa', key: 'faculty', width: 25 },
                { header: 'Viện', key: 'institute', width: 25 },
                { header: 'Tổng ĐRL', key: 'total_training_points', width: 12 },
                { header: 'Số sự kiện', key: 'events_attended', width: 12 },
            ];

            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBF8F00' } };

            rows.forEach((row, idx) => {
                sheet.addRow({ stt: idx + 1, ...row });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="diem_ren_luyen.xlsx"');

        } else {
            return res.status(400).json({ message: 'Invalid export type. Use: attendance, registrations, or training-points' });
        }

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ message: 'Server error during export' });
    }
});

module.exports = router;
