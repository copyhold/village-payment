-- Migration number: 0010 	 2025-01-27T00:00:00.000Z

-- Add notification templates table for centralized notification content management
CREATE TABLE notification_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_key TEXT NOT NULL UNIQUE,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    icon_url TEXT,
    badge_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default templates
INSERT INTO notification_templates (template_key, title_template, body_template, icon_url, badge_url) VALUES
    ('transaction_approval', 'Purchase Approval Request', '{{vendor_name}} requests approval for {{amount}} purchase', '/icon-192x192.png', '/badge-72x72.png'),
    ('transaction_approved', 'Purchase Approved', 'Your purchase of {{amount}} has been approved', '/icon-192x192.png', '/badge-72x72.png'),
    ('transaction_declined', 'Purchase Declined', 'Your purchase of {{amount}} has been declined', '/icon-192x192.png', '/badge-72x72.png'),
    ('limit_alert', 'Spending Limit Alert', 'You have reached {{percentage}}% of your spending limit', '/icon-192x192.png', '/badge-72x72.png'),
    ('daily_summary', 'Daily Spending Summary', 'Today''s spending: {{total_amount}} across {{transaction_count}} purchases', '/icon-192x192.png', '/badge-72x72.png');

-- Add index for template lookups
CREATE INDEX idx_notification_templates_key ON notification_templates(template_key);
