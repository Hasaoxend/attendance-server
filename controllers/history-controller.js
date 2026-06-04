const pool = require('../config/db');

exports.getStudentHistory = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.id, e.name as event_name, e.score, e.training_points, c.checkin_time, c.status
            FROM checkins c
            JOIN events e ON c.event_id = e.id
            WHERE c.user_id = $1
            ORDER BY c.checkin_time DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getAllLogs = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.id, u.name as student_name, u.student_code, e.name as event_name, 
                   c.checkin_time, c.ip_address, c.device_id, c.status
            FROM checkins c
            JOIN users u ON c.user_id = u.id
            JOIN events e ON c.event_id = e.id
            ORDER BY c.checkin_time DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
