import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase environment variables missing!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const db = new Database("community.db");

async function restore() {
  console.log("🚀 Starting restoration from Supabase → SQLite...\n");

  const tables = [
    "teams",
    "users",
    "tasks",
    "user_tasks",
    "attendance_sessions",
    "attendances",
    "biblical_questions",
    "daily_quizzes",
    "tree_types",
    "user_trees",
    "app_settings",
    "bible_books",
    "bible_chapters",
  ];

  for (const table of tables) {
    try {
      console.log(`📥 Fetching data from Supabase table: ${table}`);

      const { data, error } = await supabase.from(table).select("*");

      if (error) {
        console.error(`❌ Error fetching ${table}:`, error.message);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`⚠️ No data found in Supabase table: ${table}\n`);
        continue;
      }

      console.log(`💾 Restoring ${data.length} records into SQLite table: ${table}`);

      // Limpa tabela local
      db.prepare(`DELETE FROM ${table}`).run();

      const columns = Object.keys(data[0]);
      const placeholders = columns.map(() => "?").join(",");

      const insert = db.prepare(
        `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`
      );

      const insertMany = db.transaction((records) => {
        for (const record of records) {
          const values = columns.map((col) => record[col]);
          insert.run(...values);
        }
      });

      insertMany(data);

      console.log(`✅ Successfully restored table: ${table}\n`);
    } catch (err) {
      console.error(`❌ Error processing table ${table}:`, err.message);
    }
  }

  console.log("🎉 Restoration finished successfully!");
}

restore();
