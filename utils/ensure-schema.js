/**
 * Ensure DB schema is compatible with the current backend code.
 * Creates tables if they don't exist, then adds any missing columns.
 * This allows the app to self-initialize on a fresh database.
 */

module.exports = async function ensureSchema(db) {
  // ── Step 1: Create core tables if they don't exist ──────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'student',
      student_code VARCHAR(20) UNIQUE DEFAULT NULL,
      device_id VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location_lat DECIMAL(10, 8) NOT NULL DEFAULT 0,
      location_lng DECIMAL(11, 8) NOT NULL DEFAULT 0,
      radius INT DEFAULT 50,
      start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      score INT DEFAULT 0,
      unit VARCHAR(100) DEFAULT '',
      max_participants INT DEFAULT 100,
      qr_type VARCHAR(20) DEFAULT 'dynamic',
      content TEXT DEFAULT '',
      training_points INT DEFAULT 0,
      priority INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS checkins (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      lat DECIMAL(10, 8),
      lng DECIMAL(11, 8),
      device_id VARCHAR(255),
      ip_address VARCHAR(45),
      status VARCHAR(20) DEFAULT 'success',
      anomaly_details TEXT DEFAULT NULL,
      UNIQUE (user_id, event_id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'registered',
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, event_id)
    );
  `);

  // ── Step 2: Add missing columns (idempotent migrations) ─────────
  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS class_name VARCHAR(100) DEFAULT '',
      ADD COLUMN IF NOT EXISTS faculty VARCHAR(150) DEFAULT '',
      ADD COLUMN IF NOT EXISTS institute VARCHAR(150) DEFAULT '';
  `);

  await db.query(`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS location_name VARCHAR(255) DEFAULT '',
      ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) DEFAULT '',
      ADD COLUMN IF NOT EXISTS decision_image_url TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS allowed_faculty VARCHAR(150) DEFAULT '',
      ADD COLUMN IF NOT EXISTS allowed_institute VARCHAR(150) DEFAULT '';
  `);

  // ── Step 3: Create indexes ──────────────────────────────────────
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id
      ON event_registrations(event_id);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id
      ON event_registrations(user_id);
  `);
};
