import { supabase } from '../lib/supabase';
import { User, Team, Task, UserTask, BiblicalQuestion, UserTree, InvestigationCase, InvestigationClue, TeamAnswer, InvestigationHint, InvestigationNotification, GameMatch, GamePlayer, GameTask, GamePlayerTask, GameEvent, GameVote } from '../types';

// --- AUTH ---
export async function login(email: string, password: string): Promise<User> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email, password })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Credenciais inválidas');
  }

  const data = await response.json();
  // Support both { success: true, user: ... } and direct user object
  return data.user || data;
}

export async function register(name: string, email: string, password: string): Promise<User> {
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', name, email, password })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao registrar');
  }

  const data = await response.json();
  // Support both { success: true, user: ... } and direct user object
  return data.user || data;
}

// --- USERS ---
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*, teams!team_id(name)')
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
  console.log("api.ts: getTeams called");
  // Simplified query to avoid relationship ambiguity issues
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      users!users_team_id_fkey(count),
      monitor:users!teams_monitor_id_fkey(name, avatar),
      leader:users!teams_leader_id_fkey(name, avatar)
    `)
    .order('total_points', { ascending: false });
  
  if (error) {
    console.error("api.ts: getTeams Supabase error:", error);
    // Fallback to even simpler query if the above fails
    console.log("api.ts: getTeams falling back to simple query...");
    const { data: simpleData, error: simpleError } = await supabase
      .from('teams')
      .select('*')
      .order('total_points', { ascending: false });
      
    if (simpleError) {
      console.error("api.ts: getTeams fallback error:", simpleError);
      throw simpleError;
    }
    
    return (simpleData || []).map(t => ({
      ...t,
      member_count: 0,
      monitor_name: null,
      monitor_avatar: null,
      leader_name: null,
      leader_avatar: null
    })) as Team[];
  }
  
  console.log("api.ts: getTeams raw data:", data);

  const mappedTeams = (data || []).map(t => ({
    ...t,
    member_count: t.users?.[0]?.count || t.users?.count || 0,
    monitor_name: t.monitor?.name || null,
    monitor_avatar: t.monitor?.avatar || null,
    leader_name: t.leader?.name || null,
    leader_avatar: t.leader?.avatar || null
  })) as Team[];

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
  const { data, error } = await supabase
    .from('user_tasks')
    .select(`
      *,
      users (name),
      tasks (title, points)
    `)
    .eq('status', 'pending');

  if (error) throw error;

  return (data || []).map(p => ({
    ...p,
    user_name: p.users?.name,
    task_title: p.tasks?.title,
    task_points: p.tasks?.points
  })) as UserTask[];
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
      description: 'Equipe acertou o enigma',
      points_spent: 0
    }]);
  } else {
    await supabase.from('investigation_team_logs').insert([{
      case_id: caseId,
      team_id: teamId,
      action_type: 'answer_attempt',
      description: 'Equipe tentou uma resposta',
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

// --- SOCIAL DEDUCTION GAME ---
export async function getGameMatches(): Promise<GameMatch[]> {
  const response = await fetch('/api/games/social-deduction/matches');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch matches');
  }
  return response.json();
}

export async function createGameMatch(name: string): Promise<GameMatch> {
  const response = await fetch('/api/games/social-deduction/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create match');
  }
  return response.json();
}

export async function joinGameMatch(matchId: string, userId: number, name: string, avatar?: string): Promise<GamePlayer> {
  const response = await fetch('/api/games/social-deduction/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, userId, name, avatar })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join match');
  }
  return response.json();
}

export async function getGamePlayers(matchId: string): Promise<GamePlayer[]> {
  const response = await fetch(`/api/games/social-deduction/players/${matchId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch players');
  }
  return response.json();
}

export async function startGameMatch(matchId: string) {
  const players = await getGamePlayers(matchId);
  if (players.length < 3) throw new Error('Mínimo 3 jogadores para iniciar');

  // Assign roles
  const impostorCount = Math.max(1, Math.floor(players.length * 0.25));
  const shuffled = [...players].sort(() => 0.5 - Math.random());
  
  const updates = shuffled.map((p, i) => ({
    id: p.id,
    role: i < impostorCount ? 'impostor' : 'crewmate'
  }));

  const response = await fetch('/api/games/social-deduction/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, players: updates })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start match');
  }
}

export async function getPlayerTasks(playerId: string): Promise<(GamePlayerTask & { task: GameTask })[]> {
  const response = await fetch(`/api/games/social-deduction/player-tasks/${playerId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch player tasks');
  }
  return response.json();
}

export async function completeGameTask(playerTaskId: string, playerId: string, matchId: string) {
  const response = await fetch('/api/games/social-deduction/complete-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerTaskId, matchId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to complete task');
  }

  // Check if all tasks are completed
  const players = await getGamePlayers(matchId);
  const crewmateIds = players.filter(p => p.role === 'crewmate').map(p => p.id);
  
  const { data: matchTasks } = await supabase
    .from('game_player_tasks')
    .select('completed')
    .in('player_id', crewmateIds);
  
  if (matchTasks && matchTasks.every(t => t.completed)) {
    await endGameMatch(matchId, 'crewmate');
  }
}

export async function killPlayer(targetPlayerId: string, killerPlayerId: string, matchId: string) {
  const response = await fetch('/api/games/social-deduction/kill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, killerId: killerPlayerId, victimId: targetPlayerId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to kill player');
  }
}

export async function reportBody(reporterId: string, matchId: string) {
  const response = await fetch('/api/games/social-deduction/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, reporterId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to report body');
  }
  return response.json();
}

export async function votePlayer(voterId: string, votedPlayerId: string | null, matchId: string, meetingId: string) {
  const response = await fetch('/api/games/social-deduction/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, voterId, votedPlayerId, meetingId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to vote');
  }
}

export async function getGameVotes(meetingId: string): Promise<GameVote[]> {
  const response = await fetch(`/api/games/social-deduction/votes/${meetingId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch votes');
  }
  return response.json();
}

export async function endGameMatch(matchId: string, winnerRole: 'crewmate' | 'impostor') {
  const response = await fetch('/api/games/social-deduction/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, winnerRole })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to end match');
  }

  // Award points to winners
  const players = await getGamePlayers(matchId);
  const winners = players.filter(p => p.role === winnerRole);
  
  for (const winner of winners) {
    // Award 50 points to each winner
    await addPoints(winner.user_id, 50);
  }
}
