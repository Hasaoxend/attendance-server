const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('--- Initializing Database (PostgreSQL) ---');
    const client = await pool.connect();

    try {
        // Clear existing data
        console.log('Clearing old data...');
        await client.query('TRUNCATE TABLE checkins, event_registrations, events, users RESTART IDENTITY CASCADE');

        // Create Users
        console.log('Seeding users...');
        const adminPass = await bcrypt.hash('admin123', 10);
        const studentPass = await bcrypt.hash('password123', 10);

        await client.query(
            'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)',
            ['admin', adminPass, 'System Admin', 'admin']
        );

        await client.query(
            'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)',
            ['union_officer', studentPass, 'Nguyễn Cán Bộ', 'union']
        );

        const { rows: s1 } = await client.query(
            'INSERT INTO users (username, password, name, role, student_code, class_name, faculty, institute) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            ['student', studentPass, 'Nguyen Van A', 'student', 'SV001', 'K60-CNTT', 'Công nghệ thông tin', 'Viện đào tạo quốc tế']
        );

        const { rows: s2 } = await client.query(
            'INSERT INTO users (username, password, name, role, student_code, class_name, faculty, institute) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            ['student2', studentPass, 'Tran Thi B', 'student', 'SV002', 'K60-KT', 'Kinh tế', 'Viện đào tạo chất lượng cao']
        );

        const student1Id = s1[0].id;
        const student2Id = s2[0].id;

        // Create Events
        console.log('Seeding events...');
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const { rows: e1 } = await client.query(
            `
            INSERT INTO events (
                name, location_lat, location_lng, location_name, event_type,
                radius, start_time, end_time, score, qr_type, content, training_points, max_participants, priority, is_active
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
            RETURNING id
            `,
            ['Hoi nghi Khoa hoc 2024', 10.762622, 106.660172, 'Trường Đại học Hàng Hải', 'Học thuật', 100, now, tomorrow, 10, 'dynamic', 'Sự kiện mẫu để test đăng ký + điểm danh', 5, 100, 1, true]
        );

        const eventId = e1[0].id;

        // Seed registrations for testing (students must register before check-in)
        await client.query(
            'INSERT INTO event_registrations (user_id, event_id) VALUES ($1, $2), ($3, $2)',
            [student1Id, eventId, student2Id]
        );

        console.log('--- Seeding completed successfully! ---');
    } catch (err) {
        console.error('[ERROR] Seeding data:', err);
    } finally {
        client.release();
        process.exit();
    }
}

seed();
