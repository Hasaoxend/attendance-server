/**
 * Ensure DB schema is compatible with the current backend code.
 * This prevents 500 errors when the database hasn't been updated yet.
 */

module.exports = async function ensureSchema(db) {
  // Add missing columns (idempotent)
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

  // Create event registration table (idempotent)
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

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id
      ON event_registrations(event_id);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id
      ON event_registrations(user_id);
  `);
};
