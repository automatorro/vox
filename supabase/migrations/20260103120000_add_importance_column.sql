-- Add importance column to items table
ALTER TABLE items 
ADD COLUMN importance text CHECK (importance IN ('low', 'high')) DEFAULT 'low';

-- Update existing rows to have default importance
UPDATE items SET importance = 'low' WHERE importance IS NULL;
