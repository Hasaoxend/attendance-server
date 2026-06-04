const db = require('../config/db');
const { validateEventToken } = require('../utils/qr-service');
const { canStudentJoinEvent } = require('../utils/event-eligibility');

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

exports.checkin = async (req, res) => {
    const { eventId, token, lat, lng, deviceId } = req.body;
    const userId = req.user.id;
    const ipAddress = req.ip;

    try {
        // 2. Fetch event details
        const { rows: eventRows } = await db.query('SELECT * FROM events WHERE id = $1', [eventId]);
        const event = eventRows[0];
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const { rows: studentRows } = await db.query('SELECT id, faculty, institute FROM users WHERE id = $1 AND role = $2', [userId, 'student']);
        const student = studentRows[0];
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (!canStudentJoinEvent(student, event)) {
            return res.status(403).json({ message: 'Sinh viên không thuộc khoa/viện được phép tham gia sự kiện này' });
        }

        // 2.1 Require registration before check-in
        const { rows: regRows } = await db.query(
            'SELECT id FROM event_registrations WHERE user_id = $1 AND event_id = $2',
            [userId, eventId]
        );
        if (regRows.length === 0) {
            return res.status(403).json({ message: 'Bạn chưa đăng ký tham gia sự kiện này' });
        }

        // 1. Check if token is valid (Passed after fetching event to know qr_type)
        if (!validateEventToken(eventId, token, event.qr_type)) {
            return res.status(403).json({ message: 'QR code expired or invalid' });
        }

        // 3. Time Check
        const now = new Date();
        if (now < new Date(event.start_time) || now > new Date(event.end_time)) {
            return res.status(403).json({ message: 'Not within event time range' });
        }

        // 4. Geofencing Check (Explicitly cast to Number to be safe with Decimal type)
        const distance = calculateDistance(
            Number(lat), 
            Number(lng), 
            Number(event.location_lat), 
            Number(event.location_lng)
        );
        if (distance > event.radius) {
            return res.status(403).json({ message: `You are too far from the event (${Math.round(distance)}m)` });
        }

        // 5. Duplicate Check (Account)
        const { rows: existingCheckin } = await db.query('SELECT id FROM checkins WHERE user_id = $1 AND event_id = $2', [userId, eventId]);
        if (existingCheckin.length > 0) {
            return res.status(400).json({ message: 'You have already checked in' });
        }

        // 6. Device Fingerprint Check (Anti-cheat)
        const { rows: deviceUsage } = await db.query('SELECT id FROM checkins WHERE event_id = $1 AND device_id = $2', [eventId, deviceId]);
        if (deviceUsage.length > 0) {
            return res.status(403).json({ message: 'This device has already been used for attendance in this event' });
        }

        // 7. Perform Check-in
        await db.query(
            'INSERT INTO checkins (user_id, event_id, lat, lng, device_id, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, eventId, lat, lng, deviceId, ipAddress]
        );

        res.json({ 
            message: 'Check-in successful!', 
            score: event.score,
            trainingPoints: event.training_points,
            eventName: event.name,
            checkinTime: now
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during check-in' });
    }
};
