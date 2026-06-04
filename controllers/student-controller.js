const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getAllStudents = async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `
            SELECT id, username, name, student_code, class_name, faculty, institute
            FROM users
            WHERE role = 'student'
            ORDER BY name ASC
            `
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.createStudent = async (req, res) => {
    const { username, password, name, student_code, class_name, faculty, institute } = req.body;

    if (!username || !password || !name || !student_code) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (MSSV/Password/Họ tên/Mã sinh viên)' });
    }

    try {
        const hashedPass = await bcrypt.hash(password, 10);
        await pool.query(
            `
            INSERT INTO users (username, password, name, role, student_code, class_name, faculty, institute)
            VALUES ($1, $2, $3, 'student', $4, $5, $6, $7)
            `,
            [username, hashedPass, name, student_code, class_name || '', faculty || '', institute || '']
        );
        res.status(201).json({ message: 'Student created successfully' });
    } catch (err) {
        console.error(err);
        // Postgres unique violation
        if (err.code === '23505') {
            return res.status(400).json({ message: 'MSSV hoặc Mã sinh viên đã tồn tại' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateStudent = async (req, res) => {
    const { id } = req.params;
    const { name, student_code, class_name, faculty, institute, password } = req.body;

    if (!name || !student_code) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (Họ tên/Mã sinh viên)' });
    }

    try {
        if (password) {
            const hashedPass = await bcrypt.hash(password, 10);
            await pool.query(
                `
                UPDATE users
                SET name = $1,
                    student_code = $2,
                    class_name = $3,
                    faculty = $4,
                    institute = $5,
                    password = $6
                WHERE id = $7 AND role = 'student'
                `,
                [name, student_code, class_name || '', faculty || '', institute || '', hashedPass, id]
            );
        } else {
            await pool.query(
                `
                UPDATE users
                SET name = $1,
                    student_code = $2,
                    class_name = $3,
                    faculty = $4,
                    institute = $5
                WHERE id = $6 AND role = 'student'
                `,
                [name, student_code, class_name || '', faculty || '', institute || '', id]
            );
        }

        res.json({ message: 'Student updated successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Mã sinh viên đã tồn tại' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteStudent = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM users WHERE id = $1 AND role = 'student'", [id]);
        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
