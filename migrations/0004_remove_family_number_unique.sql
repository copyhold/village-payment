-- Migration number: 0004 	 2025-01-27T00:00:00.000Z

-- Remove the unique constraint on family_number to allow multiple users per family
DROP INDEX IF EXISTS unique_family_number;
