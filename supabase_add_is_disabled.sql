-- Add is_disabled column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;

-- Update existing users to be active by default
UPDATE users SET is_disabled = FALSE WHERE is_disabled IS NULL;
