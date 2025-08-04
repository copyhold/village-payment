-- Migration number: 0002 	 2025-01-27T00:00:00.000Z

-- Update users table to include VPCS fields
ALTER TABLE users ADD COLUMN family_number TEXT;
ALTER TABLE users ADD COLUMN surname TEXT;
ALTER TABLE users ADD COLUMN default_limit DECIMAL(10,2) DEFAULT 20.00;
ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
create unique index unique_family_number on users (family_number);

-- Create push subscriptions table
CREATE TABLE push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Create vendor-specific limits table
CREATE TABLE vendor_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_number TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    limit_amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES users (id)
);

-- Create vendor surname cache table for autofill functionality
CREATE TABLE vendor_surname_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id TEXT NOT NULL,
    family_number TEXT NOT NULL,
    surname TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES users (id),
    UNIQUE(vendor_id, family_number)
); 