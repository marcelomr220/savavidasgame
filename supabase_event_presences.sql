CREATE TABLE IF NOT EXISTS event_presences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  points_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_date)
);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE event_presences;

-- Add RLS
ALTER TABLE event_presences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event presences are viewable by everyone" ON event_presences FOR SELECT USING (true);
CREATE POLICY "Event presences are manageable by admins" ON event_presences FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
