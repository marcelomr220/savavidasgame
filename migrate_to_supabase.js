import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const db = new Database('community.db');

async function migrate() {
  console.log('Starting migration to Supabase...');

  const tables = [
    'teams', 'users', 'tasks', 'user_tasks', 
    'attendance_sessions', 'attendances', 
    'biblical_questions', 'daily_quizzes', 
    'tree_types', 'user_trees', 'app_settings'
  ];

  for (const table of tables) {
    console.log(`Migrating table: ${table}`);
    try {
      let rows = db.prepare(`SELECT * FROM ${table}`).all();
      
      if (rows.length === 0) {
        console.log(`Table ${table} is empty, skipping.`);
        continue;
      }

      // Hash passwords for users table
      if (table === 'users') {
        rows = await Promise.all(rows.map(async (row) => {
          if (row.password && !row.password.startsWith('$2a$') && !row.password.startsWith('$2b$')) {
            row.password = await bcrypt.hash(row.password, 10);
          }
          return row;
        }));
      }

      // Supabase insert
      const { error } = await supabase.from(table).insert(rows);
      
      if (error) {
        console.error(`Error migrating ${table}:`, error.message);
      } else {
        console.log(`Successfully migrated ${rows.length} rows to ${table}`);
      }
    } catch (e) {
      console.error(`Table ${table} does not exist in SQLite or error occurred:`, e.message);
    }
  }

  console.log('Migration finished!');
}

migrate();
