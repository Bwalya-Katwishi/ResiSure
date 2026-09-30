-- Add optional deep-link for in-app notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
