import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

async function migrate() {
  console.log("Iniciando migração de senhas...");

  // 1. Migrate SQLite
  try {
    const db = new Database("community.db");
    const users = db.prepare("SELECT * FROM users").all();
    let migratedCount = 0;

    for (const user of users) {
      if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        const hash = await bcrypt.hash(user.password, 10);
        db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, user.id);
        migratedCount++;
      }
    }
    console.log(`SQLite: ${migratedCount} senhas migradas.`);
  } catch (e) {
    console.warn("SQLite não encontrado ou erro ao migrar:", e.message);
  }

  // 2. Migrate Supabase
  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: users, error } = await supabase.from('users').select('*');

    if (error) {
      console.error("Erro ao buscar usuários no Supabase:", error.message);
      return;
    }

    let migratedCount = 0;
    for (const user of users) {
      if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        const hash = await bcrypt.hash(user.password, 10);
        const { error: updateError } = await supabase
          .from('users')
          .update({ password: hash })
          .eq('id', user.id);
        
        if (updateError) {
          console.error(`Erro ao atualizar usuário ${user.email}:`, updateError.message);
        } else {
          migratedCount++;
        }
      }
    }
    console.log(`Supabase: ${migratedCount} senhas migradas.`);
  } else {
    console.warn("Supabase Service Key não configurada. Pulando migração remota.");
  }

  console.log("Migração concluída.");
}

migrate().catch(console.error);
