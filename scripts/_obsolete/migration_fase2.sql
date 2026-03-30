ALTER TABLE festivals
ADD COLUMN source_type VARCHAR(10) DEFAULT 'base',
ADD COLUMN verified BOOLEAN DEFAULT false,
ADD COLUMN is_active BOOLEAN DEFAULT true;

UPDATE festivals
SET source_type = 'base',
    verified = false,
    is_active = true;