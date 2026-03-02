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
}

export interface Team {
  id: number;
  name: string;
  color: string;
  leader_id?: number;
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
