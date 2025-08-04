-- Migration number: 0003 	 2025-01-27T00:00:00.000Z
-- DBJOURNAL Database Schema

-- Payment transactions table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_number TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME DEFAULT NULL,
    declined_at DATETIME DEFAULT NULL,
    timeout_occurred BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'timeout'))
);

-- Notification log table
CREATE TABLE notification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    response_action TEXT CHECK (response_action IN ('approve', 'decline', 'timeout')),
    FOREIGN KEY (transaction_id) REFERENCES transactions (id)
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_family_number ON transactions(family_number);
CREATE INDEX idx_transactions_vendor_id ON transactions(vendor_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_notification_log_transaction_id ON notification_log(transaction_id); 