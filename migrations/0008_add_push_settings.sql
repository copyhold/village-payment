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

-- Insert default settings (these will be copied to each user when they first access settings)
INSERT INTO push_notification_settings (user_id, setting_key, setting_value) VALUES
    ('default', 'transaction_approvals', 'true'),
    ('default', 'daily_summaries', 'false'),
    ('default', 'limit_alerts', 'true'),
    ('default', 'quiet_hours_start', '22:00'),
    ('default', 'quiet_hours_end', '08:00');

-- Add index for better performance
CREATE INDEX idx_push_settings_user_id ON push_notification_settings(user_id);
