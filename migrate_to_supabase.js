import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const db = new Database('community.db');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("Starting migration from SQLite to Supabase...");

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
    console.log(`Migrating table: ${table}...`);
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      
      if (rows.length === 0) {
        console.log(`Table ${table} is empty, skipping.`);
        continue;
      }

      // Supabase insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from(table).upsert(batch);
        
        if (error) {
          console.error(`Error migrating ${table} batch:`, error.message);
        } else {
          console.log(`Migrated ${i + batch.length}/${rows.length} rows for ${table}`);
        }
      }
    } catch (err) {
      console.error(`Failed to migrate table ${table}:`, err.message);
    }
  }

  console.log("Migration finished!");
}

migrate();
