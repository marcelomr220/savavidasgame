import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables missing!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const db = new Database("community.db");

async function migrate() {
  console.log("Starting migration to Supabase...");

  const tables = [
    'teams', 
    'users', 
    'tasks', 
    'user_tasks', 
    'attendance_sessions', 
    'attendances', 
    'biblical_questions', 
    'daily_quizzes', 
    'tree_types', 
    'user_trees', 
    'app_settings'
  ];

  for (const table of tables) {
    try {
      const data = db.prepare(`SELECT * FROM ${table}`).all();
      console.log(`Migrating ${data.length} records from ${table}...`);
      
      if (data.length === 0) continue;

      // Upsert data to Supabase
      const { error } = await supabase.from(table).upsert(data);
      if (error) {
        console.error(`Error migrating ${table}:`, error.message);
      } else {
        console.log(`Successfully migrated ${table}`);
      }
    } catch (err) {
      console.error(`Table ${table} not found or error:`, err.message);
    }
  }

  console.log("Migration finished!");
}

migrate();
