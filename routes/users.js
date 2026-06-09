const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const db = require('../config/db');

// ============================================================
// Permission definitions (source of truth)
// ============================================================
const ROLE_PERMISSIONS = {
    admin: {
        label: 'Quản trị viên',
        color: 'red',
        permissions: [
            'event.create', 'event.edit', 'event.delete', 'event.view',
            'student.manage',
            'account.create', 'account.edit', 'account.delete', 'account.view',
            'report.view', 'report.export',
            'checkin.view',
        ],
    },
    union: {
        label: 'Cán bộ Đoàn',
        color: 'blue',
        permissions: [
            'event.create', 'event.edit', 'event.delete', 'event.view',
            'student.manage',
            'report.view', 'report.export',
            'checkin.view',
        ],
    },
    lecturer: {
        label: 'Giảng viên',
        color: 'purple',
        permissions: [
            'event.view',
            'report.view', 'report.export',
            'checkin.view',
        ],
    },
    student: {
        label: 'Sinh viên',
        color: 'green',
        permissions: [
            'event.view',
            'event.register',
            'checkin.scan',
            'checkin.view_own',
        ],
    },
};

const PERMISSION_LABELS = {
    'event.create': 'Tạo sự kiện',
    'event.edit': 'Sửa sự kiện',
    'event.delete': 'Xóa sự kiện',
    'event.view': 'Xem sự kiện',
    'event.register': 'Đăng ký sự kiện',
    'student.manage': 'Quản lý sinh viên',
    'account.create': 'Tạo tài khoản',
    'account.edit': 'Sửa tài khoản',
    'account.delete': 'Xóa tài khoản',
    'account.view': 'Xem tài khoản',
    'report.view': 'Xem báo cáo',
    'report.export': 'Xuất Excel',
    'checkin.view': 'Xem điểm danh (tất cả)',
    'checkin.view_own': 'Xem điểm danh (của mình)',
    'checkin.scan': 'Quét QR điểm danh',
};

// GET /api/users/roles — Return role definitions + permission matrix
router.get('/roles', auth('admin'), (_req, res) => {
    res.json({
        roles: ROLE_PERMISSIONS,
        permissionLabels: PERMISSION_LABELS,
    });
});

// GET /api/users — List all users (all roles)
router.get('/', auth('admin'), async (req, res) => {
    const { role } = req.query;
    try {
        let query = `
            SELECT id, username, name, role, student_code, class_name, faculty, institute, position, created_at
            FROM users
        `;
        const params = [];

        if (role) {
            params.push(role);
            query += ` WHERE role = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/users — Create a new user (any role)
router.post('/', auth('admin'), async (req, res) => {
    const { username, password, name, role, student_code, class_name, faculty, institute, position } = req.body;

    if (!username || !password || !name) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (Username, Password, Họ tên)' });
    }

    const validRoles = ['admin', 'union', 'lecturer', 'student'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: `Role không hợp lệ. Phải là: ${validRoles.join(', ')}` });
    }

    try {
        const { rows: existing } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Username đã tồn tại' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows } = await db.query(
            `INSERT INTO users (username, password, name, role, student_code, class_name, faculty, institute, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [username, hashedPassword, name, role || 'student', student_code || null, class_name || '', faculty || '', institute || '', position || '']
        );

        res.status(201).json({ message: 'Tạo tài khoản thành công', id: rows[0].id });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Username hoặc mã sinh viên đã tồn tại' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/users/:id — Update user (role, position, info, optionally password)
router.put('/:id', auth('admin'), async (req, res) => {
    const { id } = req.params;
    const { name, role, student_code, class_name, faculty, institute, position, password } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Họ tên là bắt buộc' });
    }

    try {
        // Prevent admin from changing their own role
        if (parseInt(id) === req.user.id && role && role !== req.user.role) {
            return res.status(400).json({ message: 'Không thể tự đổi role của chính mình' });
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
                `UPDATE users SET name=$1, role=$2, student_code=$3, class_name=$4, faculty=$5, institute=$6, position=$7, password=$8
                 WHERE id=$9`,
                [name, role, student_code || null, class_name || '', faculty || '', institute || '', position || '', hashedPassword, id]
            );
        } else {
            await db.query(
                `UPDATE users SET name=$1, role=$2, student_code=$3, class_name=$4, faculty=$5, institute=$6, position=$7
                 WHERE id=$8`,
                [name, role, student_code || null, class_name || '', faculty || '', institute || '', position || '', id]
            );
        }

        res.json({ message: 'Cập nhật tài khoản thành công' });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Mã sinh viên đã tồn tại' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/users/:id — Delete user
router.delete('/:id', auth('admin'), async (req, res) => {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ message: 'Không thể xóa chính tài khoản đang đăng nhập' });
    }

    try {
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Xóa tài khoản thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
