const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// @route   POST api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = rows[0];

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, studentCode: user.student_code },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                studentCode: user.student_code
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/register (Admin or Union)
router.post('/register', async (req, res) => {
    const { username, password, name, role, studentCode } = req.body;
    const requestedRole = role || 'student';

    // Validate role value
    const validRoles = ['admin', 'union', 'student'];
    if (!validRoles.includes(requestedRole)) {
        return res.status(400).json({ message: 'Invalid role. Must be: admin, union, or student' });
    }

    // Check if caller is authenticated (for role restrictions)
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const caller = jwt.verify(token, process.env.JWT_SECRET);
            
            // Union officers CANNOT create admin or union accounts
            if (caller.role === 'union' && (requestedRole === 'admin' || requestedRole === 'union')) {
                return res.status(403).json({ message: 'Cán bộ đoàn không có quyền tạo tài khoản cấp quản trị' });
            }
        } catch (_e) {
            // Token invalid — continue (public register only allows student)
        }
    }

    try {
        const { rows } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query(
            'INSERT INTO users (username, password, name, role, student_code) VALUES ($1, $2, $3, $4, $5)',
            [username, hashedPassword, name, requestedRole, studentCode || null]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/auth/change-password (Authenticated users)
const auth = require('../middleware/auth');

router.put('/change-password', auth(), async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới' });
    }

    if (newPassword.length < 4) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 4 ký tự' });
    }

    try {
        const { rows } = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
        }

        const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

        res.json({ message: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;
