import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// SQLite Database - only use in development or if explicitly enabled
let dbInstance: any = null;
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SQLITE === 'true') {
  try {
    // Dynamic import to avoid build-time errors with native modules on Vercel
    const Database = (await import("better-sqlite3")).default;
    dbInstance = new Database("community.db");
  } catch (e) {
    console.warn("SQLite database not available, using Supabase only");
  }
}
export const db = dbInstance;

// Helper for adding points to user and team
export async function addPoints(userId: any, amount: number) {
  if (amount === 0) return;
  
  try {
    const now = new Date().toISOString();
    // Update SQLite if available
    if (db) {
      db.prepare("UPDATE users SET points = points + ?, last_activity_at = ? WHERE id = ?").run(amount, now, userId);
      const user = db.prepare("SELECT team_id FROM users WHERE id = ?").get(userId);
      if (user && user.team_id) {
        db.prepare("UPDATE teams SET total_points = total_points + ? WHERE id = ?").run(amount, user.team_id);
      }
    }

    // Update Supabase
    if (supabase) {
      await supabase.rpc('increment_user_points', { row_id: userId, amount });
      await supabase.from('users').update({ last_activity_at: now }).eq('id', userId);
      const { data: userData } = await supabase.from('users').select('team_id').eq('id', userId).single();
      if (userData?.team_id) {
        await supabase.rpc('increment_team_points', { row_id: userData.team_id, amount });
      }
    }
  } catch (err) {
    console.error("Error adding points:", err);
  }
}

export function calculateAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
