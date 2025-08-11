-- Migration number: 0006 	 2025-01-27T00:00:00.000Z

-- Enhance push_subscriptions table with additional fields for better management
ALTER TABLE push_subscriptions ADD COLUMN last_used DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE push_subscriptions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE push_subscriptions ADD COLUMN user_agent TEXT;
ALTER TABLE push_subscriptions ADD COLUMN device_name TEXT;

-- Add indexes for better query performance
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_is_active ON push_subscriptions(is_active);
