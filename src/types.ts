export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  team_id?: number;
  team_name?: string;
  points: number;
  level: number;
  streak: number;
  role: 'user' | 'admin';
  birth_date?: string;
  last_activity_at?: string;
  is_disabled?: boolean;
}

export interface BirthdayMessage {
  id: number;
  birthday_user_id: number;
  sender_user_id: number;
  sender_name?: string;
  sender_avatar?: string;
  message: string;
  created_at: string;
}

export interface BirthdayEvent {
  id: number;
  user_id: number;
  admin_message?: string;
  image_url?: string;
  year: number;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  color: string;
  leader_id?: number;
  leader_name?: string;
  leader_avatar?: string;
  monitor_id?: number;
  monitor_name?: string;
  monitor_avatar?: string;
  description?: string;
  photo?: string;
  total_points: number;
  member_count: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  points: number;
  category: string;
  type: string;
  is_active: boolean;
  available_from?: string;
  deadline?: string;
}

export interface UserTask {
  id: number;
  user_id: number;
  user_name: string;
  task_id: number;
  task_title: string;
  status: 'pending' | 'completed' | 'verified' | 'rejected';
  points: number;
}

export interface BiblicalQuestion {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  category: string;
  difficulty: string;
}

export interface UserTree {
  id: number;
  user_id: number;
  tree_type_id: number;
  name: string;
  rarity: string;
  stage: number;
  max_stages: number;
  water_count: number;
  points_per_stage: number;
}

export interface InvestigationCase {
  id: string;
  title: string;
  description: string;
  answer: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  reward_points: number;
  use_dynamic_scoring: boolean;
  max_attempts: number;
  created_at: string;
}

export interface InvestigationTeamLog {
  id: string;
  case_id: string;
  team_id: number;
  team_name?: string;
  action_type: 'hint_purchase' | 'answer_attempt' | 'correct_answer' | 'eliminated';
  description: string;
  points_spent: number;
  created_at: string;
}

export interface InvestigationTeamAttempt {
  id: string;
  case_id: string;
  team_id: number;
  attempts_used: number;
  is_eliminated: boolean;
}

export interface InvestigationClue {
  id: string;
  case_id: string;
  clue_text: string;
  release_datetime: string;
  created_at: string;
}

export interface InvestigationHint {
  id: string;
  case_id: string;
  hint_text: string;
  cost_points: number;
  release_datetime: string;
  created_at: string;
}

export interface InvestigationNotification {
  id: string;
  case_id: string;
  clue_id: string;
  message: string;
  created_at: string;
}

export interface TeamAction {
  id: string;
  team_id: number;
  action_type: string;
  cost: number;
  created_at: string;
}

export interface TeamAnswer {
  id: string;
  team_id: number;
  case_id: string;
  answer_text: string;
  is_correct: boolean;
  points_awarded: number;
  created_at: string;
}

export interface UserInvestigationNotification {
  id: string;
  user_id: number;
  notification_id: string;
  seen_at: string;
}
