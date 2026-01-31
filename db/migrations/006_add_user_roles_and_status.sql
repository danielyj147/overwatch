-- Add role and status columns to users table
ALTER TABLE users
ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create index for faster queries
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

-- Update any existing users to be approved (for backwards compatibility)
UPDATE users SET status = 'approved' WHERE status = 'pending';
