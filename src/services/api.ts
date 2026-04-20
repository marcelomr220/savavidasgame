import { supabase } from '../lib/supabase';
import { User, Team, Task, UserTask, BiblicalQuestion, UserTree, InvestigationCase, InvestigationClue, TeamAnswer, InvestigationHint, InvestigationNotification } from '../types';

// --- AUTH ---
export async function login(email: string, password: string): Promise<User> {
  console.log('FRONTEND LOGIN ATTEMPT:', email);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error('FRONTEND LOGIN ERROR:', authError);
    if (authError.message.includes('Invalid login credentials')) {
      throw new Error('Credenciais inválidas');
    }
    throw new Error(authError.message);
  }

  // Auth successful, fetch profile from public.users table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*, teams!team_id(name)')
    .eq('email', email)
    .single();

  if (profileError) {
    console.warn('PROFILE NOT FOUND AFTER AUTH SUCCESS:', profileError);
    // If profile is missing, return a basic user object from auth data
    return {
      id: authData.user.id as any,
      email: authData.user.email!,
      name: authData.user.user_metadata?.name || email.split('@')[0],
      role: 'user',
      points: 0,
      level: 1,
      streak: 0
    } as User;
  }

  return {
    ...userProfile,
    team_name: userProfile.teams?.name || null
  } as User;
}

export async function register(name: string, email: string, password: string): Promise<User> {
  console.log('FRONTEND REGISTER ATTEMPT:', email);

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  });

  if (authError) {
    console.error('FRONTEND REGISTER ERROR:', authError);
    throw new Error(authError.message);
  }

  // 2. Create profile in public.users
  const { data: newUser, error: profileError } = await supabase
    .from('users')
    .insert([{
      name,
      email,
      role: 'user',
      points: 0,
      level: 1,
      streak: 0
    }])
    .select()
    .single();

  if (profileError) {
    console.error('FRONTEND PROFILE CREATION ERROR:', profileError);
    // If it's a conflict, maybe the user exists in profile but not auth?
    // In many cases, we might want to return the auth user anyway if this fails
    if (profileError.code === '23505') {
       throw new Error('Este email já está cadastrado no sistema.');
    }
    throw new Error('Erro ao criar perfil de usuário.');
  }

  return newUser as User;
}

// --- USERS ---
export async function getUsers(includeDisabled: boolean = false): Promise<User[]> {
  try {
    let query = supabase
      .from('users')
      .select('*, teams!team_id(name)')
      .order('points', { ascending: false });
    
    if (!includeDisabled) {
      query = query.eq('is_disabled', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(u => ({
      ...u,
      team_name: u.teams?.name || null
    })) as User[];
  } catch (error) {
    // Fallback if column doesn't exist
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('*, teams!team_id(name)')
      .order('points', { ascending: false });
    
    if (fetchError) throw fetchError;
    
    return (data || []).map(u => ({
      ...u,
      team_name: u.teams?.name || null
    })) as User[];
  }
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
  console.log("api.ts: getTeams called");
  
  // Fetch teams first
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .order('total_points', { ascending: false });
    
  if (teamsError) {
    console.error("api.ts: getTeams Supabase error:", teamsError);
    throw teamsError;
  }
  
  // Fetch all users to map leader/monitor names and count members
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, name, avatar, team_id');
    
  if (usersError) {
    console.error("api.ts: getTeams users fetch error:", usersError);
    // Continue with teams only if users fetch fails
  }
  
  const users = usersData || [];
  
  const mappedTeams = (teamsData || []).map(t => {
    const members = users.filter(u => u.team_id === t.id);
    const leader = users.find(u => u.id === t.leader_id);
    const monitor = users.find(u => u.id === t.monitor_id);
    
    return {
      ...t,
      member_count: members.length,
      leader_name: leader?.name || null,
      leader_avatar: leader?.avatar || null,
      monitor_name: monitor?.name || null,
      monitor_avatar: monitor?.avatar || null
    };
  }) as Team[];

  console.log("api.ts: getTeams mapped data:", mappedTeams);
  return mappedTeams;
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
export async function getTasks(isAdmin: boolean = false): Promise<Task[]> {
  if (isAdmin) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Task[];
  }
  
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .or(`available_from.is.null,available_from.lte.${now}`)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Task[];
}

export async function getPendingTasks(): Promise<UserTask[]> {
  try {
    const { data, error } = await supabase
      .from('user_tasks')
      .select(`
        *,
        users (name, is_disabled),
        tasks (title, points)
      `)
      .eq('status', 'pending');

    if (error) throw error;

    return (data || [])
      .filter(p => !p.users?.is_disabled)
      .map(p => ({
        ...p,
        user_name: p.users?.name,
        task_title: p.tasks?.title,
        task_points: p.tasks?.points
      })) as UserTask[];
  } catch (error) {
    // Fallback if is_disabled column doesn't exist
    const { data, error: fetchError } = await supabase
      .from('user_tasks')
      .select(`
        *,
        users (name),
        tasks (title, points)
      `)
      .eq('status', 'pending');

    if (fetchError) throw fetchError;

    return (data || []).map(p => ({
      ...p,
      user_name: p.users?.name,
      task_title: p.tasks?.title,
      task_points: p.tasks?.points
    })) as UserTask[];
  }
}

export async function addPoints(userId: number, amount: number) {
  if (amount <= 0) return;
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('points, team_id')
    .eq('id', userId)
    .single();
  
  if (userError || !user) return;

  // Increment user points using RPC
  await supabase.rpc('increment_user_points', { row_id: userId, amount });
  
  const newPoints = Math.max(0, (user.points || 0) + amount);
  const newLevel = Math.floor(newPoints / 1000) + 1;
  
  await supabase.from('users').update({ 
    level: newLevel, 
    last_activity_at: new Date().toISOString() 
  }).eq('id', userId);
  
  if (user.team_id) {
    await supabase.rpc('increment_team_points', { row_id: user.team_id, amount });
  }
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
    await addPoints(userId, points);
  }

  return { success: true };
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
  const { data, error } = await supabase
    .from('tasks')
    .update(taskData)
    .eq('id', taskId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: number) {
  // Delete related user_tasks first
  await supabase.from('user_tasks').delete().eq('task_id', taskId);
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) throw error;
  return { success: true };
}

export async function completeTask(userId: number, taskId: number, proofUrl: string) {
  const { error } = await supabase
    .from('user_tasks')
    .insert([{ 
      user_id: userId, 
      task_id: taskId, 
      proof_url: proofUrl, 
      status: 'pending',
      completed_at: new Date().toISOString()
    }]);
  
  if (error) throw error;
  return true;
}

// --- ADMIN / VERIFICATION ---
export async function getAdminStats() {
  let totalUsersCount = 0;
  try {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_disabled', false);
    totalUsersCount = count || 0;
  } catch (e) {
    // Fallback if column doesn't exist yet
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    totalUsersCount = count || 0;
  }
  
  const { count: activeTeams } = await supabase.from('teams').select('*', { count: 'exact', head: true });
  const { count: pendingTasks } = await supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const { count: monthlyAttendance } = await supabase.from('attendances').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  return {
    totalUsers: totalUsersCount,
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

export async function checkIn(userId: number, code: string): Promise<number> {
  const { data: session, error: sessionError } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();
  
  if (sessionError || !session) {
    throw new Error('Código inválido ou expirado');
  }

  const { data: existing } = await supabase
    .from('attendances')
    .select('id')
    .eq('user_id', userId)
    .eq('session_id', session.id)
    .maybeSingle();
  
  if (existing) {
    throw new Error('Você já registrou presença para este evento');
  }

  const { error: insertError } = await supabase
    .from('attendances')
    .insert([{ user_id: userId, session_id: session.id }]);
  
  if (insertError) throw insertError;
  
  await addPoints(userId, session.points);
  return session.points;
}

// --- GAMES ---
export async function getGamePlays(userId: number, gameId: string): Promise<number> {
  const response = await fetch(`/api/games/plays?userId=${userId}&gameId=${gameId}`);
  if (!response.ok) return 0;
  const data = await response.json();
  return data.count || 0;
}

export async function recordGamePlay(userId: number, gameId: string): Promise<number> {
  const response = await fetch('/api/games/record-play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, gameId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to record play');
  }
  const data = await response.json();
  return data.count;
}

// --- QUIZ ---
export async function getDailyQuiz(userId?: number): Promise<BiblicalQuestion[]> {
  const { data, error } = await supabase
    .from('biblical_questions')
    .select('*')
    .eq('is_active', true);
  
  if (error) throw error;
  
  // Shuffle and pick 5
  const shuffled = (data || []).sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5) as BiblicalQuestion[];
}

export async function submitQuiz(userId: number, score: number): Promise<number> {
  if (score > 0) {
    await addPoints(userId, 5);
  }
  return score;
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

export async function waterTree(treeId: number, userId: number): Promise<{ stage: number, pointsEarned: number }> {
  const { data: tree, error: fetchError } = await supabase
    .from('user_trees')
    .select('*')
    .eq('id', treeId)
    .single();
  
  if (fetchError || !tree) throw new Error('Árvore não encontrada');

  const newProgress = (tree.progress || 0) + 20;
  let newStatus = tree.status;
  let newStage = tree.stage || 1;

  if (newProgress >= 100) {
    newStage = (tree.stage || 1) + 1;
    // You might want to update status based on stage or progress
    // For now, let's keep it simple as in the API
  }

  const finalProgress = newProgress >= 100 ? 0 : newProgress;
  
  const { error: updateError } = await supabase
    .from('user_trees')
    .update({ 
      progress: finalProgress, 
      stage: newStage,
      last_watered: new Date().toISOString() 
    })
    .eq('id', treeId);
  
  if (updateError) throw updateError;
  
  await addPoints(userId, 2);
  return { stage: newStage, pointsEarned: 2 };
}

// --- APP SETTINGS ---
export async function getAppSettings(key: string) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data?.value || null;
}

export async function updateAppSettings(key: string, value: string) {
  const { error } = await supabase
    .from('app_settings')
    .upsert([{ key, value }]);
  
  if (error) throw error;
}

export async function giveBirthdayGift(userId: number, userName: string): Promise<boolean> {
  const today = new Date();
  const year = today.getFullYear();

  // Check if already given
  const { data: existing } = await supabase
    .from('birthday_events')
    .select('id')
    .eq('user_id', userId)
    .eq('year', year)
    .maybeSingle();

  if (existing) return false;

  const adminMessage = `Parabéns ${userName} pelo seu dia, desejamos muito que Deus abençoe seu dia e sua vida, te amamos muito! Você ganhou 100 pontos de presente! 🎁`;

  // Give points
  await addPoints(userId, 100);

  // Record event
  const { error } = await supabase
    .from('birthday_events')
    .insert([{
      user_id: userId,
      year,
      admin_message: adminMessage,
      created_at: new Date().toISOString()
    }]);

  if (error) throw error;
  return true;
}

// --- INVESTIGATION MODE ---
export async function getActiveInvestigationCase(): Promise<InvestigationCase | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('investigation_cases')
    .select('*')
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function getInvestigationClues(caseId: string): Promise<InvestigationClue[]> {
  const { data, error } = await supabase
    .from('investigation_clues')
    .select('*')
    .eq('case_id', caseId)
    .order('release_datetime', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getInvestigationHints(caseId: string): Promise<InvestigationHint[]> {
  const { data, error } = await supabase
    .from('investigation_hints')
    .select('*')
    .eq('case_id', caseId)
    .order('release_datetime', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function purchaseInvestigationHint(userId: number, teamId: number, hintId: string, cost: number, caseId: string) {
  // 1. Check if user has enough points
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single();
  
  if (userError || !user) throw new Error('Usuário não encontrado');
  if (user.points < cost) throw new Error('Você não tem pontos suficientes para pagar esta dica.');

  // 2. Record purchase
  const { error: purchaseError } = await supabase
    .from('investigation_hint_purchases')
    .insert([{
      hint_id: hintId,
      team_id: teamId,
      user_id: userId
    }]);
  
  if (purchaseError) {
    if (purchaseError.code === '23505') return true; // Already purchased
    throw purchaseError;
  }

  // 3. Deduct points from user and team
  await supabase.rpc('increment_user_points', { row_id: userId, amount: -cost });
  await supabase.rpc('increment_team_points', { row_id: teamId, amount: -cost });

  // 4. Log action
  await supabase.from('investigation_team_logs').insert([{
    case_id: caseId,
    team_id: teamId,
    action_type: 'hint_purchase',
    description: 'Equipe comprou uma dica',
    points_spent: cost
  }]);
  
  return true;
}

export async function getPurchasedHints(teamId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('investigation_hint_purchases')
    .select('hint_id')
    .eq('team_id', teamId);
  
  if (error) throw error;
  return (data || []).map(p => p.hint_id);
}

export async function getInvestigationNotifications(caseId: string): Promise<InvestigationNotification[]> {
  const { data, error } = await supabase
    .from('investigation_notifications')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function syncInvestigationNotifications(caseId: string) {
  const now = new Date().toISOString();
  
  // 1. Get clues that should be released but don't have a notification yet
  const { data: clues } = await supabase
    .from('investigation_clues')
    .select('*')
    .eq('case_id', caseId)
    .lte('release_datetime', now);
  
  if (!clues) return;

  for (const clue of clues) {
    // Check if notification already exists
    const { data: existing } = await supabase
      .from('investigation_notifications')
      .select('id')
      .eq('clue_id', clue.id)
      .maybeSingle();
    
    if (!existing) {
      await supabase.from('investigation_notifications').insert([{
        case_id: caseId,
        clue_id: clue.id,
        message: `🚨 NOVA PISTA LIBERADA: ${clue.clue_text.substring(0, 50)}...`
      }]);
    }
  }
}

export async function getTeamAnswers(teamId: number, caseId: string): Promise<TeamAnswer[]> {
  const { data, error } = await supabase
    .from('team_answers')
    .select('*')
    .eq('team_id', teamId)
    .eq('case_id', caseId)
    .order('submitted_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function submitInvestigationAnswer(userId: number, teamId: number, caseId: string, answer: string): Promise<{ isCorrect: boolean; points: number }> {
  // 1. Get the case and team info
  const { data: investigationCase, error: caseError } = await supabase
    .from('investigation_cases')
    .select('*')
    .eq('id', caseId)
    .single();
  
  if (caseError || !investigationCase) throw new Error('Caso não encontrado');

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('monitor_id')
    .eq('id', teamId)
    .single();

  if (teamError || !team) throw new Error('Equipe não encontrada');

  // 2. Check if user is monitor
  if (team.monitor_id !== userId) {
    throw new Error('Apenas o monitor da equipe pode enviar a resposta final.');
  }

  // 3. Check if team already got it right or is eliminated
  const { data: attemptInfo } = await supabase
    .from('investigation_team_attempts')
    .select('*')
    .eq('team_id', teamId)
    .eq('case_id', caseId)
    .maybeSingle();

  if (attemptInfo?.is_eliminated) {
    throw new Error('Sua equipe foi desclassificada por exceder o limite de tentativas.');
  }

  const { data: existingCorrect } = await supabase
    .from('team_answers')
    .select('id')
    .eq('team_id', teamId)
    .eq('case_id', caseId)
    .eq('is_correct', true)
    .maybeSingle();
  
  if (existingCorrect) throw new Error('Sua equipe já desvendou este mistério!');

  // 4. Check max attempts
  const attemptsUsed = attemptInfo?.attempts_used || 0;
  if (investigationCase.max_attempts && attemptsUsed >= investigationCase.max_attempts) {
    throw new Error('Limite de tentativas atingido para este caso.');
  }

  // 5. Normalize answers for comparison
  const normalizedSubmitted = answer.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normalizedCorrect = investigationCase.answer.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const isCorrect = normalizedSubmitted === normalizedCorrect;
  let pointsAwarded = 0;

  // 6. Update attempts
  const newAttemptsUsed = attemptsUsed + (isCorrect ? 0 : 1);
  const isEliminated = !isCorrect && investigationCase.max_attempts && newAttemptsUsed >= investigationCase.max_attempts;

  await supabase
    .from('investigation_team_attempts')
    .upsert([{
      case_id: caseId,
      team_id: teamId,
      attempts_used: newAttemptsUsed,
      is_eliminated: !!isEliminated
    }], { onConflict: 'case_id,team_id' });

  // 7. Log action
  if (isCorrect) {
    if (investigationCase.use_dynamic_scoring) {
      const startsAt = new Date(investigationCase.starts_at);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24));
      pointsAwarded = Math.max(10, (investigationCase.reward_points || 100) - (diffDays * 15));
    } else {
      pointsAwarded = investigationCase.reward_points || 100;
    }

    await supabase.rpc('increment_team_points', { row_id: teamId, amount: pointsAwarded });
    
    await supabase.from('investigation_team_logs').insert([{
      case_id: caseId,
      team_id: teamId,
      action_type: 'correct_answer',
      description: `Equipe desvendou o mistério com a resposta: "${answer.trim()}"`,
      points_spent: 0
    }]);
  } else {
    await supabase.from('investigation_team_logs').insert([{
      case_id: caseId,
      team_id: teamId,
      action_type: 'answer_attempt',
      description: `Equipe tentou a resposta: "${answer.trim()}"`,
      points_spent: 0
    }]);

    if (isEliminated) {
      await supabase.from('investigation_team_logs').insert([{
        case_id: caseId,
        team_id: teamId,
        action_type: 'eliminated',
        description: 'Equipe foi desclassificada por exceder tentativas',
        points_spent: 0
      }]);
    }
  }

  // 8. Save the answer
  const { error: insertError } = await supabase
    .from('team_answers')
    .insert([{
      team_id: teamId,
      case_id: caseId,
      answer_text: answer.trim(),
      is_correct: isCorrect,
      points_awarded: pointsAwarded
    }]);
  
  if (insertError) {
    console.error('Error saving team answer:', insertError);
    // If answer_text fails, try answer (to match some schema versions)
    if (insertError.message.includes('column "answer_text" of relation "team_answers" does not exist')) {
      const { error: retryError } = await supabase
        .from('team_answers')
        .insert([{
          team_id: teamId,
          case_id: caseId,
          answer: answer.trim(),
          is_correct: isCorrect,
          points_awarded: pointsAwarded
        }]);
      if (retryError) throw retryError;
    } else {
      throw insertError;
    }
  }

  return { isCorrect, points: pointsAwarded };
}

export async function getInvestigationTeamLogs(caseId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('investigation_team_logs')
    .select('*, teams!team_id(name)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data || []).map(log => ({
    ...log,
    team_name: log.teams?.name
  }));
}

export async function getInvestigationTeamAttempt(caseId: string, teamId: number): Promise<any> {
  const { data, error } = await supabase
    .from('investigation_team_attempts')
    .select('*')
    .eq('case_id', caseId)
    .eq('team_id', teamId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function getInvestigationRanking(caseId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('team_answers')
    .select('team_id, created_at, teams(name, color)')
    .eq('case_id', caseId)
    .eq('is_correct', true)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function addPointsToTeam(teamId: number, amount: number) {
  const { error } = await supabase.rpc('increment_team_points', { row_id: teamId, amount });
  if (error) throw error;
  return true;
}

export async function getAllInvestigationAttempts(caseId: string): Promise<any[]> {
  // 1. Fetch all teams to get names and colors
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, color');
  
  if (teamsError) throw teamsError;

  // 2. Fetch all attempts for this case
  const { data: attempts, error: attemptsError } = await supabase
    .from('investigation_team_attempts')
    .select('*')
    .eq('case_id', caseId);
  
  if (attemptsError) throw attemptsError;

  // 3. Fetch all answers for this case
  const { data: answers, error: answersError } = await supabase
    .from('team_answers')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });
  
  if (answersError) throw answersError;

  // 4. Map everything together
  return (teams || []).map(team => {
    const attempt = (attempts || []).find(a => a.team_id === team.id);
    const teamAnswers = (answers || []).filter(a => a.team_id === team.id);
    
    // Only return teams that have at least one attempt or answer
    if (!attempt && teamAnswers.length === 0) return null;

    return {
      id: attempt?.id || `temp-${team.id}`,
      team_id: team.id,
      team_name: team.name,
      team_color: team.color,
      attempts_used: attempt?.attempts_used || teamAnswers.length,
      is_eliminated: attempt?.is_eliminated || false,
      answers: teamAnswers
    };
  }).filter(Boolean);
}

export async function seedInvestigationCase() {
  const now = new Date();
  // Set starts_at to the beginning of the current week (Sunday)
  const startsAt = new Date(now);
  startsAt.setDate(now.getDate() - now.getDay());
  startsAt.setHours(0, 0, 0, 0);
  
  const endsAt = new Date(startsAt);
  endsAt.setDate(startsAt.getDate() + 7);
  endsAt.setHours(23, 59, 59, 999);

  const caseData = {
    title: "O Eco do Nome Esquecido",
    description: "Antes de reis se levantarem, eu já era escolhido.\nFui separado não por coroa, mas por propósito.\nMinha voz nunca foi minha… mas carregava autoridade.\nFui rejeitado por quem deveria ouvir.\nE mesmo assim… cumpri aquilo que me foi ordenado.",
    answer: "Samuel",
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString()
  };

  // Check if case already exists
  const { data: existing } = await supabase
    .from('investigation_cases')
    .select('id')
    .eq('title', caseData.title)
    .maybeSingle();
  
  if (existing) return;

  const { data: newCase, error: caseError } = await supabase
    .from('investigation_cases')
    .insert([caseData])
    .select()
    .single();
  
  if (caseError) throw caseError;

  const clues = [
    { clue_text: "Não escrevi leis, mas ungi quem governaria.", release_datetime: new Date(startsAt.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() },
    { clue_text: "Minha história começa com uma mulher que chorava em silêncio.", release_datetime: new Date(startsAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() },
    { clue_text: "Ouvi meu nome sendo chamado enquanto ainda era criança… mas não sabia quem falava.", release_datetime: new Date(startsAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    { clue_text: "Fui instruído por alguém que já não ouvia mais claramente a voz de Deus.", release_datetime: new Date(startsAt.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString() },
    { clue_text: "Toquei a cabeça de dois reis… um caiu, o outro se levantou.", release_datetime: new Date(startsAt.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString() },
    { clue_text: "Minha morte não encerrou minha voz.", release_datetime: new Date(startsAt.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString() },
    { clue_text: "Mesmo depois de morto, fui chamado novamente.", release_datetime: new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  const cluesToInsert = clues.map(c => ({
    ...c,
    case_id: newCase.id
  }));

  const { error: cluesError } = await supabase
    .from('investigation_clues')
    .insert(cluesToInsert);
  
  if (cluesError) throw cluesError;
}
