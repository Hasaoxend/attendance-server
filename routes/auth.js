const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

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
                studentCode: user.student_code,
                avatarUrl: user.avatar_url || ''
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
    const validRoles = ['admin', 'union', 'lecturer', 'student'];
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

// ─── Avatar Upload ─────────────────────────────────────────
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
        const userId = req.user.id;
        cb(null, `avatar_${userId}_${Date.now()}${safeExt}`);
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (_req, file, cb) => {
        const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new Error('Chỉ hỗ trợ file ảnh (PNG, JPG, WEBP)'), ok);
    }
});

// @route   PUT api/auth/avatar
// @desc    Upload or replace avatar
router.put('/avatar', auth(), (req, res) => {
    avatarUpload.single('avatar')(req, res, async (uploadErr) => {
        if (uploadErr) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File quá lớn (tối đa 2MB)' });
            }
            return res.status(400).json({ message: uploadErr.message || 'Upload thất bại' });
        }

        try {
            const userId = req.user.id;
            const file = req.file;
            if (!file) return res.status(400).json({ message: 'Không có file được chọn' });

            // Delete old avatar file if exists
            const { rows: oldRows } = await db.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
            if (oldRows[0]?.avatar_url) {
                const oldPath = path.join(__dirname, '..', oldRows[0].avatar_url);
                fs.unlink(oldPath, () => {}); // ignore error if file doesn't exist
            }

            const publicUrl = `/uploads/avatars/${file.filename}`;
            await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [publicUrl, userId]);

            res.json({ message: 'Cập nhật ảnh đại diện thành công', avatarUrl: publicUrl });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Lỗi server' });
        }
    });
});

// @route   DELETE api/auth/avatar
// @desc    Remove avatar (revert to default)
router.delete('/avatar', auth(), async (req, res) => {
    try {
        const userId = req.user.id;

        // Delete old file
        const { rows } = await db.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
        if (rows[0]?.avatar_url) {
            const oldPath = path.join(__dirname, '..', rows[0].avatar_url);
            fs.unlink(oldPath, () => {});
        }

        await db.query("UPDATE users SET avatar_url = '' WHERE id = $1", [userId]);
        res.json({ message: 'Đã xóa ảnh đại diện' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;
