-- Create chapter_blocks table
CREATE TABLE IF NOT EXISTS chapter_blocks (
  id BIGSERIAL PRIMARY KEY,
  chapter_id BIGINT REFERENCES bible_chapters(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'verse')),
  verse_id BIGINT REFERENCES bible_verses(id) ON DELETE SET NULL,
  content_text TEXT,
  image_url TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure bible_verses has image_url if not already there
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bible_verses' AND column_name='image_url') THEN
    ALTER TABLE bible_verses ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE chapter_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access for chapter_blocks" ON chapter_blocks FOR SELECT USING (true);
CREATE POLICY "Admin full access for chapter_blocks" ON chapter_blocks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
