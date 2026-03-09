import { supabase } from '../lib/supabase';
import { User, Team, Task, UserTask, BiblicalQuestion, UserTree } from '../types';
import bcrypt from "bcryptjs";

// --- AUTH ---
export async function login(email: string, password: string): Promise<User> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*, teams(name)')
    .eq('email', email)
    .single();

  if (error || !user) throw new Error('Credenciais inválidas');

  const isMatch = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') 
    ? await bcrypt.compare(password, user.password)
    : user.password === password;

  if (!isMatch) throw new Error('Credenciais inválidas');

  // If password wasn't hashed, hash it now (migration)
  if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await supabase.from('users').update({ password: hashedPassword }).eq('id', user.id);
  }

  return {
    ...user,
    team_name: user.teams?.name || null
  } as User;
}

export async function register(name: string, email: string, password: string): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
  
  if (existingUser) throw new Error('Este email já está cadastrado');

  const { data: newUser, error } = await supabase
    .from('users')
    .insert([{ 
      name, 
      email, 
      password: hashedPassword, 
      role: 'user', 
      points: 0, 
      level: 1, 
      streak: 0 
    }])
    .select()
    .single();
  
  if (error) throw error;
  return newUser as User;
}

// --- USERS ---
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*, teams(name)')
    .order('points', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(u => ({
    ...u,
    team_name: u.teams?.name || null
  })) as User[];
}

export async function getUserById(id: string | number): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as User;
}

export async function updateUserAvatar(userId: number, avatar: string) {
  const { error } = await supabase
    .from('users')
    .update({ avatar })
    .eq('id', userId);
  
  if (error) throw error;
  return true;
}

export async function updateUser(userId: number, userData: Partial<User>) {
  const { error } = await supabase
    .from('users')
    .update(userData)
    .eq('id', userId);
  
  if (error) throw error;
  return true;
}

export async function deleteUser(userId: number) {
  // First delete related records
  await supabase.from('user_tasks').delete().eq('user_id', userId);
  await supabase.from('attendances').delete().eq('user_id', userId);
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);
  
  if (error) throw error;
  return true;
}

// --- TEAMS ---
export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*, users(count)')
    .order('total_points', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(t => ({
    ...t,
    member_count: t.users?.[0]?.count || 0
  })) as Team[];
}

export async function getTeamMembers(teamId: number): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, avatar, points, level')
    .eq('team_id', teamId)
    .order('points', { ascending: false });
  
  if (error) throw error;
  return data as User[];
}

export async function joinTeam(userId: number, teamId: number) {
  const { error } = await supabase
    .from('users')
    .update({ team_id: teamId })
    .eq('id', userId);
  
  if (error) throw error;
  return true;
}

export async function createTeam(teamData: Partial<Team>) {
  const { data, error } = await supabase
    .from('teams')
    .insert([teamData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTeam(teamId: number, teamData: Partial<Team>) {
  const { error } = await supabase
    .from('teams')
    .update(teamData)
    .eq('id', teamId);
  
  if (error) throw error;
  return true;
}

export async function deleteTeam(teamId: number) {
  // Clear team_id from users first
  await supabase.from('users').update({ team_id: null }).eq('team_id', teamId);
  
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);
  
  if (error) throw error;
  return true;
}

// --- TASKS ---
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Task[];
}

export async function createTask(taskData: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTask(taskId: number, taskData: Partial<Task>) {
  const { error } = await supabase
    .from('tasks')
    .update(taskData)
    .eq('id', taskId);
  
  if (error) throw error;
  return true;
}

export async function deleteTask(taskId: number) {
  await supabase.from('user_tasks').delete().eq('task_id', taskId);
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) throw error;
  return true;
}

export async function completeTask(userId: number, taskId: number, proofUrl: string) {
  const { error } = await supabase
    .from('user_tasks')
    .insert([{
      user_id: userId,
      task_id: taskId,
      proof_url: proofUrl,
      status: 'pending'
    }]);
  
  if (error) throw error;
  return true;
}

// --- ADMIN / VERIFICATION ---
export async function getPendingTasks(): Promise<UserTask[]> {
  const { data, error } = await supabase
    .from('user_tasks')
    .select('*, users(name), tasks(title, points)')
    .eq('status', 'pending');
  
  if (error) throw error;
  
  return (data || []).map(ut => ({
    ...ut,
    user_name: ut.users?.name,
    task_title: ut.tasks?.title,
    points: ut.tasks?.points
  })) as UserTask[];
}

export async function verifyTask(userTaskId: number, status: 'verified' | 'rejected', userId: number, points: number) {
  const { error } = await supabase
    .from('user_tasks')
    .update({ 
      status, 
      verified_at: new Date().toISOString() 
    })
    .eq('id', userTaskId);
  
  if (error) throw error;
  
  if (status === 'verified') {
    // Add points to user
    const { data: user } = await supabase.from('users').select('points').eq('id', userId).single();
    if (user) {
      const newPoints = user.points + points;
      const newLevel = Math.floor(newPoints / 100) + 1;
      await supabase.from('users').update({ points: newPoints, level: newLevel }).eq('id', userId);
    }
  }
  
  return true;
}

export async function getAdminStats() {
  const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: activeTeams } = await supabase.from('teams').select('*', { count: 'exact', head: true });
  const { count: pendingTasks } = await supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const { count: monthlyAttendance } = await supabase.from('attendances').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  return {
    totalUsers: totalUsers || 0,
    activeTeams: activeTeams || 0,
    pendingTasks: pendingTasks || 0,
    monthlyAttendance: monthlyAttendance || 0
  };
}

export async function getRecentActivities() {
  // Combine recent user registrations and task completions
  const { data: recentUsers } = await supabase
    .from('users')
    .select('name, created_at, id')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentTasks } = await supabase
    .from('user_tasks')
    .select('id, completed_at, users(name), tasks(title)')
    .order('completed_at', { ascending: false })
    .limit(5);

  const formattedUsers = (recentUsers || []).map(u => ({
    type: 'user_registered',
    title: u.name,
    date: u.created_at,
    id: u.id
  }));

  const formattedTasks = (recentTasks || []).map((ut: any) => ({
    type: 'task_completed',
    title: `${ut.users?.name} completou ${ut.tasks?.title}`,
    date: ut.completed_at,
    id: ut.id
  }));

  return [...formattedUsers, ...formattedTasks]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

// --- ATTENDANCE ---
export async function getAttendanceSessions() {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createAttendanceSession(eventType: string, points: number, maxCheckins: number) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert([{ 
      event_type: eventType, 
      points, 
      max_checkins: maxCheckins, 
      code, 
      is_active: true 
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteAttendanceSession(sessionId: number) {
  // First delete related attendances
  await supabase.from('attendances').delete().eq('session_id', sessionId);
  
  const { error } = await supabase
    .from('attendance_sessions')
    .delete()
    .eq('id', sessionId);
  
  if (error) throw error;
  return true;
}

export async function checkIn(userId: number, code: string) {
  const { data: session, error: sessionError } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();
  
  if (sessionError || !session) throw new Error('Código inválido ou expirado');
  
  // Check if already checked in
  const { data: existing } = await supabase
    .from('attendances')
    .select('id')
    .eq('user_id', userId)
    .eq('session_id', session.id)
    .single();
  
  if (existing) throw new Error('Você já registrou presença para este evento');
  
  // Register attendance
  const { error: attendanceError } = await supabase
    .from('attendances')
    .insert([{ user_id: userId, session_id: session.id }]);
  
  if (attendanceError) throw attendanceError;
  
  // Add points
  const { data: user } = await supabase.from('users').select('points').eq('id', userId).single();
  if (user) {
    const newPoints = user.points + session.points;
    const newLevel = Math.floor(newPoints / 100) + 1;
    await supabase.from('users').update({ points: newPoints, level: newLevel }).eq('id', userId);
  }
  
  return session.points;
}

// --- QUIZ ---
export async function getDailyQuiz(): Promise<BiblicalQuestion[]> {
  const { data, error } = await supabase
    .from('biblical_questions')
    .select('*')
    .limit(3); // Return 3 questions for the daily quiz
  
  if (error) throw error;
  return data as BiblicalQuestion[];
}

export async function submitQuiz(userId: number, score: number) {
  if (score > 0) {
    const { data: user } = await supabase.from('users').select('points').eq('id', userId).single();
    if (user) {
      const newPoints = user.points + score;
      const newLevel = Math.floor(newPoints / 100) + 1;
      await supabase.from('users').update({ points: newPoints, level: newLevel }).eq('id', userId);
      return score;
    }
  }
  return 0;
}

// --- TREES ---
export async function seedTreeTypes() {
  const types = [
    { id: 1, name: 'Oliveira da Paz', rarity: 'Comum', max_stages: 5, points_per_stage: 5 },
    { id: 2, name: 'Cedro do Líbano', rarity: 'Rara', max_stages: 5, points_per_stage: 10 }
  ];
  
  try {
    const { data: existing, error: fetchError } = await supabase.from('tree_types').select('id');
    if (fetchError) {
      console.error("Error checking tree_types table. It might not exist.", fetchError);
      return;
    }
    if (!existing || existing.length === 0) {
      const { error: insertError } = await supabase.from('tree_types').upsert(types);
      if (insertError) console.error("Error seeding tree_types:", insertError);
    }
  } catch (err) {
    console.error("Critical error in seedTreeTypes:", err);
  }
}

export async function getTreeTypes() {
  await seedTreeTypes();
  const { data, error } = await supabase.from('tree_types').select('*');
  if (error) {
    console.error("Error fetching tree types:", error);
    return [];
  }
  return data || [];
}

export async function getUserTrees(userId: number): Promise<UserTree[]> {
  const { data, error } = await supabase
    .from('user_trees')
    .select('*, tree_types(*)')
    .eq('user_id', userId);
  
  if (error) throw error;
  
  return (data || []).map(ut => ({
    ...ut,
    name: ut.tree_types?.name,
    rarity: ut.tree_types?.rarity,
    max_stages: ut.tree_types?.max_stages,
    points_per_stage: ut.tree_types?.points_per_stage
  })) as UserTree[];
}

export async function plantTree(userId: number, treeTypeId: number) {
  const { data, error } = await supabase
    .from('user_trees')
    .insert([{ 
      user_id: userId, 
      tree_type_id: treeTypeId, 
      stage: 1, 
      water_count: 0 
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function waterTree(treeId: number, userId: number) {
  const { data: tree, error: treeError } = await supabase
    .from('user_trees')
    .select('*, tree_types(*)')
    .eq('id', treeId)
    .single();
  
  if (treeError || !tree) throw treeError || new Error('Árvore não encontrada');
  
  const newWaterCount = tree.water_count + 1;
  let newStage = tree.stage;
  let pointsEarned = 0;
  
  if (newWaterCount % 5 === 0 && tree.stage < tree.tree_types.max_stages) {
    newStage += 1;
    pointsEarned = tree.tree_types.points_per_stage;
    
    // Add points to user
    const { data: user } = await supabase.from('users').select('points').eq('id', userId).single();
    if (user) {
      const newPoints = user.points + pointsEarned;
      const newLevel = Math.floor(newPoints / 100) + 1;
      await supabase.from('users').update({ points: newPoints, level: newLevel }).eq('id', userId);
    }
  }
  
  await supabase
    .from('user_trees')
    .update({ 
      water_count: newWaterCount, 
      stage: newStage, 
      last_watered_at: new Date().toISOString() 
    })
    .eq('id', treeId);
  
  return { stage: newStage, pointsEarned };
}

// --- APP SETTINGS ---
export async function getAppSettings(key: string) {
  try {
    const response = await fetch(`/api/settings/${key}`);
    const data = await response.json();
    return data.value;
  } catch (err) {
    console.error("Error fetching settings:", err);
    return null;
  }
}

export async function updateAppSettings(key: string, value: string) {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao salvar configurações');
  }
}
