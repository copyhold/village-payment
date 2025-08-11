-- Migration number: 0007 	 2025-01-27T00:00:00.000Z

-- Enhance notification_log table to track individual subscription responses
ALTER TABLE notification_log ADD COLUMN subscription_id INTEGER;
ALTER TABLE notification_log ADD COLUMN delivered_at DATETIME;
ALTER TABLE notification_log ADD COLUMN failed_at DATETIME;
ALTER TABLE notification_log ADD COLUMN error_message TEXT;
ALTER TABLE notification_log ADD COLUMN retry_count INTEGER DEFAULT 0;

-- Add subscription endpoint for logging purposes (cross-database reference alternative)
ALTER TABLE notification_log ADD COLUMN subscription_endpoint TEXT;

-- Add indexes for subscription tracking
CREATE INDEX idx_notification_log_subscription_id ON notification_log(subscription_id);
CREATE INDEX idx_notification_log_delivered_at ON notification_log(delivered_at);
