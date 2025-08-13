-- Migration number: 0008 	 2025-01-27T00:00:00.000Z

-- Add push notification settings table for user preferences
CREATE TABLE push_notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, setting_key)
);

-- Add index for better performance
CREATE INDEX idx_push_settings_user_id ON push_notification_settings(user_id);
