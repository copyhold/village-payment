-- Migration number: 0005 	 2025-01-27T00:00:00.000Z

-- Add new_user_id column to one_time_links table
-- This stores the ID of the user accepting the invite, separate from the inviter's user_id
ALTER TABLE one_time_links ADD COLUMN new_user_id TEXT;
