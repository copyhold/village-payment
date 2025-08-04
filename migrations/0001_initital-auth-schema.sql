-- Migration number: 0001 	 2025-08-02T12:35:09.985Z

-- Drop tables if they exist to ensure a clean slate on re-application during development.
DROP TABLE IF EXISTS one_time_links;
DROP TABLE IF EXISTS authenticators;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    current_challenge TEXT
);

-- Create authenticators table
-- This table stores the WebAuthn authenticators associated with each user.
CREATE TABLE authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    -- The credentialID is a URL-safe base64-encoded string.
    credential_id TEXT NOT NULL UNIQUE,
    -- The public key is stored as a blob.
    credential_public_key BLOB NOT NULL,
    -- The counter is used to prevent replay attacks.
    counter INTEGER NOT NULL,
    -- Transports can be 'internal', 'usb', 'nfc', 'ble', 'hybrid'. Stored as JSON array.
    transports TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create one_time_links table
-- This table stores tokens for adding new devices.
CREATE TABLE one_time_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);