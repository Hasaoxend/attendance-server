-- Database: student_system
-- (Run this in pgAdmin or psql)
-- CREATE DATABASE student_system;

-- Table: users
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

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student',
    ADD COLUMN IF NOT EXISTS student_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Table: events
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location_lat DECIMAL(10, 8) NOT NULL DEFAULT 0,
    location_lng DECIMAL(11, 8) NOT NULL DEFAULT 0,
    radius INT DEFAULT 50,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
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

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS radius INT DEFAULT 50,
    ADD COLUMN IF NOT EXISTS unit VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS max_participants INT DEFAULT 100,
    ADD COLUMN IF NOT EXISTS qr_type VARCHAR(20) DEFAULT 'dynamic',
    ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS training_points INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS location_name VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS decision_image_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS allowed_faculty VARCHAR(150) DEFAULT '',
    ADD COLUMN IF NOT EXISTS allowed_institute VARCHAR(150) DEFAULT '',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Table: checkins
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

ALTER TABLE checkins
    ADD COLUMN IF NOT EXISTS checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8),
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'success',
    ADD COLUMN IF NOT EXISTS anomaly_details TEXT;

-- Table: event_registrations
CREATE TABLE IF NOT EXISTS event_registrations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);

-- Extend users (students) fields
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS class_name VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS faculty VARCHAR(150) DEFAULT '',
    ADD COLUMN IF NOT EXISTS institute VARCHAR(150) DEFAULT '';

-- Extend events fields
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS location_name VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS decision_image_url TEXT DEFAULT '';
