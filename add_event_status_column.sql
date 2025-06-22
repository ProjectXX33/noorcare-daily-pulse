ALTER TABLE events
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','finished'));

-- Backfill existing records
UPDATE events SET status = 'active' WHERE status IS NULL; 