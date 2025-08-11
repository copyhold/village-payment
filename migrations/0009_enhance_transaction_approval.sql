-- Migration number: 0009 	 2025-01-27T00:00:00.000Z

-- Enhance transaction tracking for the approval workflow
ALTER TABLE transactions ADD COLUMN approval_requested_at DATETIME;
ALTER TABLE transactions ADD COLUMN approval_timeout_at DATETIME;
ALTER TABLE transactions ADD COLUMN approved_by_user_id TEXT;
ALTER TABLE transactions ADD COLUMN declined_by_user_id TEXT;
ALTER TABLE transactions ADD COLUMN decline_reason TEXT;

-- Add indexes for approval workflow queries
CREATE INDEX idx_transactions_approval_requested_at ON transactions(approval_requested_at);
CREATE INDEX idx_transactions_approval_timeout_at ON transactions(approval_timeout_at);
CREATE INDEX idx_transactions_approved_by ON transactions(approved_by_user_id);
CREATE INDEX idx_transactions_declined_by ON transactions(declined_by_user_id);
