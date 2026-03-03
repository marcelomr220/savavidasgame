-- Supabase RLS (Row Level Security) Policies
-- Copy and paste this into the Supabase SQL Editor to secure your database

-- 1. Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblical_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Basic Policies (Select for everyone, Insert/Update for authenticated/admin)

-- Teams: Everyone can see, only admins can modify
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);
CREATE POLICY "Teams are modifiable by admins" ON teams FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Users: Everyone can see basic info, users can see their own full info
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Tasks: Everyone can see active tasks
CREATE POLICY "Tasks are viewable by everyone" ON tasks FOR SELECT USING (is_active = true);

-- User Tasks: Users can see their own tasks, admins can see all
CREATE POLICY "User tasks are viewable by owner or admin" ON user_tasks FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Users can insert their own tasks" ON user_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Attendance: Users can see their own, admins can see all
CREATE POLICY "Attendances are viewable by owner or admin" ON attendances FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- App Settings: Everyone can see, only admins can modify
CREATE POLICY "App settings are viewable by everyone" ON app_settings FOR SELECT USING (true);
CREATE POLICY "App settings are modifiable by admins" ON app_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- NOTE: If you are NOT using Supabase Auth (auth.uid()), 
-- but a custom login with the anon key, you should be very careful.
-- The policies above assume you are using Supabase Auth.
-- Since your app uses a custom login, you should ideally use the 
-- service_role key ONLY on the server and keep the anon key restricted.
