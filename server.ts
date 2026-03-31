import express from "express";
console.log("Server file loaded, starting initialization...");
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import multer from "multer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Initializing database...");
let db: any;
try {
  db = new Database("community.db");
  console.log("SQLite database initialized.");
} catch (e) {
  console.warn("SQLite database not available, using Supabase only", e);
}

// Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)?.trim();

let supabase: any = null;
if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized.");
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
} else {
  console.warn("Supabase URL or Key is missing or invalid. Check your environment variables.");
}

// Helper function to calculate age
function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Initialize Database
try {
  if (db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      leader_id INTEGER,
      description TEXT,
      photo TEXT,
      total_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      team_id INTEGER,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      birth_date TEXT,
      last_login DATETIME,
      last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      points INTEGER DEFAULT 0,
      category TEXT, -- 'Culto', 'Célula', 'Especial', 'Desafio'
      type TEXT, -- 'Individual', 'Equipe', 'Ambos'
      is_active INTEGER DEFAULT 1,
      is_recurring TEXT, -- 'daily', 'weekly', 'monthly'
      available_from DATETIME DEFAULT CURRENT_TIMESTAMP,
      deadline DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      task_id INTEGER,
      status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'verified', 'rejected'
      proof_url TEXT,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (task_id) REFERENCES tasks (id)
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT, -- 'Célula Salva', 'Culto Salva', 'Culto Domingo', 'Especial'
      code TEXT UNIQUE,
      points INTEGER DEFAULT 10,
      is_active INTEGER DEFAULT 1,
      max_checkins INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (session_id) REFERENCES attendance_sessions (id)
    );

    CREATE TABLE IF NOT EXISTS biblical_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      correct_option TEXT,
      category TEXT,
      difficulty TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS daily_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT,
      score INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS tree_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rarity TEXT, -- 'Comum', 'Rara', 'Épica'
      max_stages INTEGER DEFAULT 6,
      points_per_stage INTEGER DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS user_trees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      tree_type_id INTEGER,
      stage INTEGER DEFAULT 1,
      water_count INTEGER DEFAULT 0,
      last_watered_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (tree_type_id) REFERENCES tree_types (id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS game_plays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      game_id TEXT,
      date TEXT,
      count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS birthday_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      birthday_user_id INTEGER,
      sender_user_id INTEGER,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (birthday_user_id) REFERENCES users (id),
      FOREIGN KEY (sender_user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS birthday_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      admin_message TEXT,
      image_url TEXT,
      year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

  // Migration: Add last_activity_at if it doesn't exist
  try {
    db.prepare("ALTER TABLE users ADD COLUMN last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP").run();
  } catch (e) {}

  // Daily Birthday Check
  async function checkBirthdays() {
    console.log("Checking for birthdays...");
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    try {
      let birthdayUsers: any[] = [];
      if (supabase) {
        const { data, error } = await supabase
          .from('users')
          .select('*');
        
        if (error) throw error;
        
        birthdayUsers = data.filter(user => {
          if (!user.birth_date) return false;
          const bDate = new Date(user.birth_date);
          return bDate.getUTCDate() === day && (bDate.getUTCMonth() + 1) === month;
        });
      } else if (db) {
        const users = db.prepare("SELECT * FROM users WHERE birth_date IS NOT NULL").all();
        birthdayUsers = users.filter((user: any) => {
          const bDate = new Date(user.birth_date);
          return bDate.getUTCDate() === day && (bDate.getUTCMonth() + 1) === month;
        });
      }

      for (const user of birthdayUsers) {
        // Check if point already awarded this year
        let alreadyAwarded = false;
        if (supabase) {
          const { data } = await supabase
            .from('birthday_events')
            .select('*')
            .eq('user_id', user.id)
            .eq('year', year);
          alreadyAwarded = data && data.length > 0;
        } else if (db) {
          const event = db.prepare("SELECT * FROM birthday_events WHERE user_id = ? AND year = ?").get(user.id, year);
          alreadyAwarded = !!event;
        }

        if (!alreadyAwarded) {
          console.log(`Awarding birthday points to ${user.name}`);
          // Award 100 points
          if (supabase) {
            await supabase.rpc('increment_user_points', { row_id: user.id, amount: 100 });
            await supabase.from('birthday_events').insert({
              user_id: user.id,
              year: year,
              admin_message: `Parabéns pelos seus ${calculateAge(user.birth_date)} anos!`,
            });
          } else if (db) {
            db.prepare("UPDATE users SET points = points + 100 WHERE id = ?").run(user.id);
            db.prepare("INSERT INTO birthday_events (user_id, year, admin_message) VALUES (?, ?, ?)").run(
              user.id,
              year,
              `Parabéns pelos seus ${calculateAge(user.birth_date)} anos!`
            );
          }
        }
      }
    } catch (error) {
      console.error("Error checking birthdays:", error);
    }
  }

  // Run check every 24 hours
  setInterval(checkBirthdays, 24 * 60 * 60 * 1000);
  // Run once on startup
  checkBirthdays();

  }
} catch (err) {
  console.error("Database initialization error:", err);
}

// Helper for adding points to user and team
async function addPoints(userId: any, amount: number) {
  if (amount <= 0) return;
  
  try {
    const now = new Date().toISOString();
    // Update SQLite if available
    if (db) {
      db.prepare("UPDATE users SET points = points + ?, last_activity_at = ? WHERE id = ?").run(amount, now, userId);
      const user = db.prepare("SELECT points, team_id FROM users WHERE id = ?").get(userId);
      if (user) {
        const newLevel = Math.floor(Math.max(0, user.points) / 1000) + 1;
        db.prepare("UPDATE users SET level = ? WHERE id = ?").run(newLevel, userId);
        if (user.team_id) {
          db.prepare("UPDATE teams SET total_points = total_points + ? WHERE id = ?").run(amount, user.team_id);
        }
      }
    }

    // Update Supabase
    if (supabase) {
      const { data: user } = await supabase.from('users').select('points, team_id').eq('id', userId).single();
      if (user) {
        await supabase.rpc('increment_user_points', { row_id: userId, amount });
        
        const newPoints = Math.max(0, (user.points || 0) + amount);
        const newLevel = Math.floor(newPoints / 1000) + 1;
        await supabase.from('users').update({ 
          level: newLevel, 
          last_activity_at: now 
        }).eq('id', userId);
        
        if (user.team_id) {
          await supabase.rpc('increment_team_points', { row_id: user.team_id, amount });
        }
      }
    }
  } catch (err) {
    console.error("Error adding points:", err);
  }
}

// Seed initial data if empty
if (db) {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (userCount === 0) {
    db.prepare("INSERT INTO teams (name, color, description) VALUES (?, ?, ?)").run("Leões de Judá", "#ef4444", "Equipe forte e corajosa");
    db.prepare("INSERT INTO teams (name, color, description) VALUES (?, ?, ?)").run("Águias do Reino", "#3b82f6", "Visão e renovo");
    
    const adminPass = bcrypt.hashSync("admin123", 10);
    const userPass = bcrypt.hashSync("user123", 10);
    db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run("Admin", "admin@church.com", adminPass, "admin", 1);
    db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run("João Silva", "joao@church.com", userPass, "user", 1);
    db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run("Maria Santos", "maria@church.com", userPass, "user", 2);

    db.prepare("INSERT INTO tasks (title, description, points, category, type) VALUES (?, ?, ?, ?, ?)").run("Ler Salmo 23", "Ler e meditar no Salmo 23", 10, "Desafio", "Individual");
    db.prepare("INSERT INTO tasks (title, description, points, category, type) VALUES (?, ?, ?, ?, ?)").run("Trazer Visitante", "Trazer um novo amigo para a célula", 50, "Célula", "Individual");

    db.prepare("INSERT INTO tree_types (name, rarity, points_per_stage) VALUES (?, ?, ?)").run("Oliveira da Paz", "Comum", 5);
    db.prepare("INSERT INTO tree_types (name, rarity, points_per_stage) VALUES (?, ?, ?)").run("Cedro do Líbano", "Rara", 10);

    db.prepare("INSERT INTO biblical_questions (question, option_a, option_b, option_c, option_d, correct_option, category, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("Quem construiu a arca?", "Moisés", "Noé", "Abraão", "Davi", "B", "Antigo Testamento", "Fácil");
    db.prepare("INSERT INTO biblical_questions (question, option_a, option_b, option_c, option_d, correct_option, category, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("Qual o primeiro livro da Bíblia?", "Êxodo", "Levítico", "Gênesis", "Números", "C", "Antigo Testamento", "Fácil");
  }
}

async function startServer(app: any) {
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  // --- API Routes ---
  app.get("/api/supabase/status", async (req, res) => {
    let testResult = null;
    if (supabase) {
      const { data, error } = await supabase.from('users').select('count');
      testResult = error ? { error: error.message } : { success: true, data };
    }
    res.json({
      configured: !!supabase,
      url: supabaseUrl || null,
      hasKey: !!supabaseKey,
      test: testResult
    });
  });

  // Auth (Simplified with Hashing)
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password, action } = req.body;
      
      // If action is provided, it should be 'login'
      if (action && action !== 'login') {
        return res.status(400).json({ success: false, error: "Invalid action for this endpoint" });
      }

      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email e senha são obrigatórios" });
      }
      
      if (supabase) {
        const { data: user, error } = await supabase
          .from('users')
          .select('*, teams!team_id(name)')
          .eq('email', email)
          .single();

        if (user) {
          const isMatch = user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) 
            ? await bcrypt.compare(password, user.password)
            : user.password === password;

          if (isMatch) {
            const now = new Date().toISOString();
            await supabase.from('users').update({ last_activity_at: now }).eq('id', user.id);
            
            const { password: _, ...userWithoutPassword } = user;
            return res.json({
              success: true,
              user: { ...userWithoutPassword, team_name: user.teams?.name || null }
            });
          }
        }
      }

      // Fallback to SQLite
      if (db) {
        const user = db.prepare("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id WHERE u.email = ?").get(email);
        
        if (user) {
          const isMatch = user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) 
            ? await bcrypt.compare(password, user.password)
            : user.password === password;

          if (isMatch) {
            const now = new Date().toISOString();
            db.prepare("UPDATE users SET last_activity_at = ? WHERE id = ?").run(now, user.id);
            
            if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
              const hashedPassword = await bcrypt.hash(password, 10);
              db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
            }
            
            const { password: _, ...userWithoutPassword } = user;
            return res.json({
              success: true,
              user: { ...userWithoutPassword, team_name: user.team_name || null }
            });
          }
        }
      }

      res.status(401).json({ success: false, error: "Credenciais inválidas" });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, error: "Erro interno no servidor" });
    }
  });

  app.post("/api/register", async (req, res) => {
    const { name, email, password, action } = req.body;
    
    if (action && action !== 'register') {
      return res.status(400).json({ success: false, error: "Invalid action for this endpoint" });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Nome, email e senha são obrigatórios" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      if (supabase) {
        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();
        
        if (existingUser) {
          return res.status(400).json({ error: "Este email já está cadastrado" });
        }

        const { data: newUser, error } = await supabase
          .from('users')
          .insert([{ 
            name, 
            email, 
            password: hashedPassword, 
            role: 'user',
            points: 0,
            level: 1,
            streak: 0
          }])
          .select()
          .single();
        
        if (error) throw error;

        // Sync to SQLite
        if (db) {
          db.prepare("INSERT OR REPLACE INTO users (id, name, email, password, role, points, level, streak) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
            newUser.id, name, email, hashedPassword, 'user', 0, 1, 0
          );
        }

        return res.json({ success: true, user: newUser });
      }

      // SQLite only fallback
      if (db) {
        const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
        if (existingUser) {
          return res.status(400).json({ success: false, error: "Este email já está cadastrado" });
        }

        const result = db.prepare("INSERT INTO users (name, email, password, role, points, level, streak) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
          name, email, hashedPassword, 'user', 0, 1, 0
        );
        const lastId = result.lastInsertRowid;
        
        if (supabase) {
          await supabase.from('users').insert([{ id: lastId, name, email, password: hashedPassword, role: 'user', points: 0, level: 1, streak: 0 }]);
        }
        
        const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(lastId);
        return res.json({ success: true, user: newUser });
      }
      
      return res.status(500).json({ success: false, error: "Serviço de banco de dados indisponível" });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ success: false, error: err.message || "Erro ao realizar cadastro" });
    }
  });

  // Admin GET endpoints
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*, teams!team_id(name)').order('points', { ascending: false });
        if (!error && data) {
          return res.json(data.map(u => ({ ...u, team_name: u.teams?.name || null })));
        }
      }
      
      if (db) {
        const users = db.prepare(`
          SELECT u.*, t.name as team_name 
          FROM users u 
          LEFT JOIN teams t ON u.team_id = t.id 
          ORDER BY u.points DESC
        `).all();
        return res.json(users);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/teams", async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('teams')
          .select('*, users!team_id(count), monitor:users!monitor_id(name, avatar), leader:users!leader_id(name, avatar)')
          .order('total_points', { ascending: false });
        
        if (!error && data) {
          const formattedTeams = data.map(t => ({
            ...t,
            member_count: (t as any).users?.[0]?.count || 0,
            monitor_name: (t as any).monitor?.name || null,
            monitor_avatar: (t as any).monitor?.avatar || null,
            leader_name: (t as any).leader?.name || null,
            leader_avatar: (t as any).leader?.avatar || null
          }));
          return res.json(formattedTeams);
        }
      }
      
      if (db) {
        const teams = db.prepare(`
          SELECT t.*, (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count 
          FROM teams t
          ORDER BY t.total_points DESC
        `).all();
        return res.json(teams);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/tasks", async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (!error && data) return res.json(data);
      }
      
      if (db) {
        const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
        return res.json(tasks);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (supabase) {
        const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: activeTeams } = await supabase.from('teams').select('*', { count: 'exact', head: true });
        const { count: pendingTasks } = await supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        
        return res.json({
          totalUsers: totalUsers || 0,
          activeTeams: activeTeams || 0,
          pendingTasks: pendingTasks || 0,
          monthlyAttendance: 0 // Placeholder or separate query
        });
      }
      
      if (db) {
        const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
        const activeTeams = db.prepare("SELECT COUNT(*) as count FROM teams").get().count;
        const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM user_tasks WHERE status = 'pending'").get().count;
        
        const monthlyAttendance = db.prepare(`
          SELECT COUNT(*) as count 
          FROM attendances 
          WHERE created_at >= date('now', '-30 days')
        `).get().count;

        return res.json({
          totalUsers,
          activeTeams,
          pendingTasks,
          monthlyAttendance
        });
      }
      res.json({ totalUsers: 0, activeTeams: 0, pendingTasks: 0, monthlyAttendance: 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/recent-activities", async (req, res) => {
    try {
      // Combine recent user registrations and task completions
      const recentUsers = db.prepare(`
        SELECT 'user_registered' as type, name as title, created_at as date, id
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `).all();

      const recentTasks = db.prepare(`
        SELECT 'task_completed' as type, u.name || ' completou ' || t.title as title, ut.completed_at as date, ut.id
        FROM user_tasks ut
        JOIN users u ON ut.user_id = u.id
        JOIN tasks t ON ut.task_id = t.id
        ORDER BY ut.completed_at DESC 
        LIMIT 5
      `).all();

      const combined = [...recentUsers, ...recentTasks]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      res.json(combined);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users", async (req, res) => {
    if (supabase) {
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('*, teams!team_id(name)')
          .order('points', { ascending: false });
        
        if (!error) {
          console.log(`Fetched ${users.length} users from Supabase`);
          const formattedUsers = users.map(u => ({
            ...u,
            team_name: u.teams?.name || null
          }));
          return res.json(formattedUsers);
        } else {
          console.error("Supabase error fetching users:", error.message);
        }
      } catch (supaErr: any) {
        console.error("Supabase connection error fetching users:", supaErr.message);
      }
    }

    const users = db.prepare(`
      SELECT u.*, t.name as team_name 
      FROM users u 
      LEFT JOIN teams t ON u.team_id = t.id 
      ORDER BY u.points DESC
    `).all();
    res.json(users);
  });

  app.get("/api/users/:id", async (req, res) => {
    if (supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (!error) return res.json(user);
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    res.json(user);
  });

  app.put("/api/users/:id/avatar", (req, res) => {
    const { avatar } = req.body;
    try {
      db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    const { name, email, password, role, team_id } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      if (supabase) {
        const { data, error } = await supabase
          .from('users')
          .insert([{ name, email, password: hashedPassword, role: role || 'user', team_id: team_id || null }])
          .select()
          .single();
        
        if (!error) {
          // Sync to SQLite for backup
          db.prepare("INSERT INTO users (id, name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?, ?)").run(data.id, name, email, hashedPassword, role || 'user', team_id || null);
          return res.json({ id: data.id });
        }
      }

      const result = db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run(name, email, hashedPassword, role || 'user', team_id || null);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/admin/users/bulk", async (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: "Invalid users format" });
    }

    try {
      const insert = db.prepare(`
        INSERT INTO users (name, email, password, role, team_id, points, level) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const usersWithHashedPasswords = await Promise.all(users.map(async (u) => ({
        ...u,
        password: await bcrypt.hash(u.password || "user123", 10)
      })));

      const insertMany = db.transaction((users) => {
        for (const user of users) {
          insert.run(
            user.name,
            user.email,
            user.password,
            user.role || "user",
            user.team_id || null,
            user.points || 0,
            user.level || 1
          );
        }
      });

      insertMany(usersWithHashedPasswords);
      res.json({ success: true, count: users.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    const { name, email, password, role, team_id, streak, birth_date } = req.body;
    const userId = req.params.id;
    try {
      let hashedPassword = password;
      if (password && !password.startsWith('$2a$') && !password.startsWith('$2b$')) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // Always update SQLite
      if (password) {
        db.prepare(`
          UPDATE users 
          SET name = ?, email = ?, password = ?, role = ?, team_id = ?, streak = ?, birth_date = ? 
          WHERE id = ?
        `).run(name, email, hashedPassword, role, team_id, streak, birth_date, userId);
      } else {
        db.prepare(`
          UPDATE users 
          SET name = ?, email = ?, role = ?, team_id = ?, streak = ?, birth_date = ? 
          WHERE id = ?
        `).run(name, email, role, team_id, streak, birth_date, userId);
      }

      // Attempt Supabase update if configured
      if (supabase) {
        const updateData: any = { name, email, role, team_id, streak, birth_date };
        if (password) updateData.password = hashedPassword;
        
        try {
          const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);
          
          if (error) {
            console.error("Supabase update error (logged but continuing):", error.message);
            // We don't return error here because SQLite was successful
          }
        } catch (supaErr: any) {
          console.error("Supabase connection error during update:", supaErr.message);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating user:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const userId = req.params.id;
    
    try {
      // Always update SQLite first
      const deleteUser = db.transaction(() => {
        db.prepare("DELETE FROM user_tasks WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM attendances WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM daily_quizzes WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM user_trees WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM user_bible_readings WHERE user_id = ?").run(userId);
        db.prepare("UPDATE teams SET leader_id = NULL WHERE leader_id = ?").run(userId);
        db.prepare("DELETE FROM users WHERE id = ?").run(userId);
      });
      deleteUser();

      // Attempt Supabase delete if configured
      if (supabase) {
        try {
          const { error } = await supabase.from('users').delete().eq('id', userId);
          if (error) {
            console.error("Supabase delete error (logged but continuing):", error.message);
          }
        } catch (supaErr: any) {
          console.error("Supabase connection error during delete:", supaErr.message);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting user:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/teams", async (req, res) => {
    if (supabase) {
      try {
        const { data: teams, error } = await supabase
          .from('teams')
          .select(`
            *,
            users!team_id (id)
          `)
          .order('total_points', { ascending: false });
        
        if (!error) {
          console.log(`Fetched ${teams.length} teams from Supabase`);
          const formattedTeams = teams.map(t => ({
            ...t,
            member_count: t.users?.length || 0
          }));
          return res.json(formattedTeams);
        } else {
          console.error("Supabase error fetching teams:", error.message);
        }
      } catch (supaErr: any) {
        console.error("Supabase connection error fetching teams:", supaErr.message);
      }
    }

    const teams = db.prepare(`
      SELECT t.*, (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count 
      FROM teams t
      ORDER BY t.total_points DESC
    `).all();
    res.json(teams);
  });

  app.get("/api/teams/:id/members", async (req, res) => {
    if (supabase) {
      const { data: members, error } = await supabase
        .from('users')
        .select('id, name, avatar, points, level, role')
        .eq('team_id', req.params.id)
        .order('points', { ascending: false });
      if (!error) return res.json(members);
    }

    const members = db.prepare(`
      SELECT id, name, avatar, points, level, role 
      FROM users 
      WHERE team_id = ? 
      ORDER BY points DESC
    `).all(req.params.id);
    res.json(members);
  });

  app.post("/api/teams/join", async (req, res) => {
    const { userId, teamId } = req.body;
    if (supabase) {
      const { error } = await supabase
        .from('users')
        .update({ team_id: teamId })
        .eq('id', userId);
      if (!error) {
        db.prepare("UPDATE users SET team_id = ? WHERE id = ?").run(teamId, userId);
        return res.json({ success: true });
      }
    }
    db.prepare("UPDATE users SET team_id = ? WHERE id = ?").run(teamId, userId);
    res.json({ success: true });
  });

  app.post("/api/admin/teams", async (req, res) => {
    const { name, color, description, leader_id, photo } = req.body;
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('teams')
          .insert([{ name, color, description, leader_id: leader_id || null, photo: photo || null }])
          .select()
          .single();
        
        if (!error) {
          db.prepare("INSERT INTO teams (id, name, color, description, leader_id, photo) VALUES (?, ?, ?, ?, ?, ?)").run(data.id, name, color, description, leader_id || null, photo || null);
          return res.json({ id: data.id });
        }
      }

      const result = db.prepare("INSERT INTO teams (name, color, description, leader_id, photo) VALUES (?, ?, ?, ?, ?)").run(name, color, description, leader_id || null, photo || null);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/admin/teams/:id", async (req, res) => {
    const { name, color, description, leader_id, photo } = req.body;
    const teamId = req.params.id;
    try {
      // Always update SQLite
      db.prepare(`
        UPDATE teams 
        SET name = ?, color = ?, description = ?, leader_id = ?, photo = ? 
        WHERE id = ?
      `).run(name, color, description, leader_id, photo, teamId);

      // Attempt Supabase update
      if (supabase) {
        try {
          const { error } = await supabase
            .from('teams')
            .update({ name, color, description, leader_id, photo })
            .eq('id', teamId);
          
          if (error) {
            console.error("Supabase team update error (logged):", error.message);
          }
        } catch (supaErr: any) {
          console.error("Supabase connection error during team update:", supaErr.message);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/admin/teams/:id", async (req, res) => {
    const teamId = req.params.id;
    try {
      // Always update SQLite first
      const deleteTeam = db.transaction(() => {
        db.prepare("UPDATE users SET team_id = NULL WHERE team_id = ?").run(teamId);
        db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
      });
      deleteTeam();

      // Attempt Supabase delete
      if (supabase) {
        try {
          const { error } = await supabase.from('teams').delete().eq('id', teamId);
          if (error) {
            console.error("Supabase team delete error (logged):", error.message);
          }
        } catch (supaErr: any) {
          console.error("Supabase connection error during team delete:", supaErr.message);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting team:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    if (supabase) {
      try {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error) return res.json(tasks);
      } catch (supaErr: any) {
        console.error("Supabase connection error fetching tasks:", supaErr.message);
      }
    }
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
    res.json(tasks);
  });

  app.post("/api/admin/tasks", async (req, res) => {
    const { title, description, points, category, type, available_from, deadline } = req.body;
    try {
      // Always update SQLite first
      const result = db.prepare(`
        INSERT INTO tasks (title, description, points, category, type, available_from, deadline) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(title, description, points, category, type, available_from || null, deadline || null);
      
      const taskId = result.lastInsertRowid;

      // Attempt Supabase insert
      if (supabase) {
        try {
          const { error } = await supabase
            .from('tasks')
            .insert([{ id: taskId, title, description, points, category, type, available_from: available_from || null, deadline: deadline || null }]);
          
          if (error) {
            console.error("Supabase task create error (logged):", error.message);
          }
        } catch (supaErr: any) {
          console.error("Supabase connection error during task creation:", supaErr.message);
        }
      }

      res.json({ id: taskId });
    } catch (err: any) {
      console.error("Error creating task:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/admin/tasks/bulk", (req, res) => {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: "Invalid tasks format" });
    }

    try {
      const insert = db.prepare(`
        INSERT INTO tasks (title, description, points, category, type, available_from, deadline) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((tasks) => {
        for (const task of tasks) {
          insert.run(
            task.title,
            task.description || "",
            task.points || 0,
            task.category || "Culto",
            task.type || "Individual",
            task.available_from || null,
            task.deadline || null
          );
        }
      });

      insertMany(tasks);
      res.json({ success: true, count: tasks.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/admin/tasks/:id", async (req, res) => {
    const { title, description, points, category, type, available_from, deadline, is_active } = req.body;
    const taskId = req.params.id;
    try {
      // Always update SQLite
      const result = db.prepare(`
        UPDATE tasks 
        SET title = ?, description = ?, points = ?, category = ?, type = ?, available_from = ?, deadline = ?, is_active = ? 
        WHERE id = ?
      `).run(title, description, points, category, type, available_from || null, deadline || null, is_active ?? 1, taskId);

      console.log(`Task update result: ${result.changes} changes for ID ${taskId}`);

      // Attempt Supabase update
      if (supabase) {
        try {
          const { error } = await supabase
            .from('tasks')
            .update({ title, description, points, category, type, available_from: available_from || null, deadline: deadline || null, is_active: is_active ?? 1 })
            .eq('id', taskId);
          
          if (error) {
            console.error("Supabase task update error (logged):", error.message);
          }
        } catch (supaErr: any) {
          console.error("Supabase connection error during task update:", supaErr.message);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating task:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/admin/tasks/:id", async (req, res) => {
    const taskId = req.params.id;
    try {
      // Always update SQLite first
      const deleteTask = db.transaction(() => {
        db.prepare("DELETE FROM user_tasks WHERE task_id = ?").run(taskId);
        db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
      });
      deleteTask();

      // Attempt Supabase delete
      if (supabase) {
        try {
          const { error } = await supabase.from('tasks').delete().eq('id', taskId);
          if (error) {
            console.error("Supabase task delete error (logged):", error.message);
          }
        } catch (supaErr: any) {
          console.error("Supabase connection error during task delete:", supaErr.message);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting task:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/tasks/complete", async (req, res) => {
    const { userId, taskId } = req.body;
    if (supabase) {
      const { error } = await supabase
        .from('user_tasks')
        .insert([{ user_id: userId, task_id: taskId, status: 'pending' }]);
      if (!error) {
        db.prepare("INSERT INTO user_tasks (user_id, task_id, status) VALUES (?, ?, 'pending')").run(userId, taskId);
        return res.json({ success: true });
      }
    }
    db.prepare("INSERT INTO user_tasks (user_id, task_id, status) VALUES (?, ?, 'pending')").run(userId, taskId);
    res.json({ success: true });
  });

  app.get("/api/admin/tasks/pending", async (req, res) => {
    if (supabase) {
      try {
        const { data: pending, error } = await supabase
          .from('user_tasks')
          .select(`
            *,
            users (name),
            tasks (title, points)
          `)
          .eq('status', 'pending');
        
        if (!error) {
          const formatted = pending.map(p => ({
            ...p,
            user_name: p.users?.name,
            task_title: p.tasks?.title,
            points: p.tasks?.points
          }));
          return res.json(formatted);
        }
      } catch (supaErr: any) {
        console.error("Supabase connection error fetching pending tasks:", supaErr.message);
      }
    }
    const pending = db.prepare(`
      SELECT ut.*, u.name as user_name, t.title as task_title, t.points 
      FROM user_tasks ut
      JOIN users u ON ut.user_id = u.id
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.status = 'pending'
    `).all();
    res.json(pending);
  });

  app.post("/api/admin/tasks/verify/:id", async (req, res) => {
    const { id: userTaskId } = req.params;
    const { status } = req.body; // status: 'verified' or 'rejected'
    
    try {
      const userTask = db.prepare("SELECT * FROM user_tasks WHERE id = ?").get(userTaskId);
      if (!userTask) return res.status(404).json({ error: "Task not found" });

      // Always update SQLite
      db.prepare("UPDATE user_tasks SET status = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, userTaskId);

      if (status === 'verified') {
        const task = db.prepare("SELECT points FROM tasks WHERE id = ?").get(userTask.task_id);
        await addPoints(userTask.user_id, task.points);
        
        // Update Supabase status specifically for user_tasks
        if (supabase) {
          try {
            await supabase
              .from('user_tasks')
              .update({ status, verified_at: new Date().toISOString() })
              .eq('id', userTaskId);
          } catch (supaErr) {
            console.error("Supabase task status update error:", supaErr);
          }
        }
      } else if (supabase) {
        // Just update status to rejected in Supabase
        try {
          await supabase
            .from('user_tasks')
            .update({ status, verified_at: new Date().toISOString() })
            .eq('id', userTaskId);
        } catch (supaErr) {
          console.error("Supabase task status update error:", supaErr);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error verifying task:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Attendance
  app.get("/api/admin/sessions", async (req, res) => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error) return res.json(data);
      } catch (supaErr: any) {
        console.error("Supabase connection error fetching sessions:", supaErr.message);
      }
    }
    const sessions = db.prepare("SELECT * FROM attendance_sessions ORDER BY created_at DESC").all();
    res.json(sessions);
  });

  app.delete("/api/admin/sessions/:id", async (req, res) => {
    const sessionId = req.params.id;
    try {
      // Always update SQLite first
      const deleteSession = db.transaction(() => {
        db.prepare("DELETE FROM attendances WHERE session_id = ?").run(sessionId);
        db.prepare("DELETE FROM attendance_sessions WHERE id = ?").run(sessionId);
      });
      deleteSession();

      // Attempt Supabase delete
      if (supabase) {
        try {
          const { error } = await supabase.from('attendance_sessions').delete().eq('id', sessionId);
          if (error) {
            console.error("Supabase session delete error (logged):", error.message);
          }
        } catch (supaErr: any) {
          console.error("Supabase connection error during session delete:", supaErr.message);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/admin/create-session", async (req, res) => {
    const { eventType, points, maxCheckins } = req.body;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      // Always update SQLite
      const result = db.prepare("INSERT INTO attendance_sessions (event_type, code, points, max_checkins) VALUES (?, ?, ?, ?)").run(eventType, code, points, maxCheckins);
      const sessionId = result.lastInsertRowid;

      // Attempt Supabase insert
      if (supabase) {
        try {
          const { error } = await supabase
            .from('attendance_sessions')
            .insert([{ id: sessionId, event_type: eventType, code, points, max_checkins: maxCheckins }]);
          
          if (error) {
            console.error("Supabase session create error (logged):", error.message);
          }
        } catch (supaErr: any) {
          console.error("Supabase connection error during session creation:", supaErr.message);
        }
      }

      res.json({ id: sessionId, code });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/attendance/checkin", async (req, res) => {
    const { userId, code } = req.body;
    
    if (supabase) {
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();
      
      if (!session) return res.status(400).json({ error: "Código inválido ou sessão expirada" });

      const { data: alreadyChecked } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', session.id)
        .single();
      
      if (alreadyChecked) return res.status(400).json({ error: "Presença já registrada" });

      const { error: checkinError } = await supabase
        .from('attendances')
        .insert([{ user_id: userId, session_id: session.id }]);
      
      if (!checkinError) {
        await supabase.rpc('increment_user_points', { row_id: userId, amount: session.points });
        const { data: userWithTeam } = await supabase.from('users').select('team_id').eq('id', userId).single();
        if (userWithTeam?.team_id) {
          await supabase.rpc('increment_team_points', { row_id: userWithTeam.team_id, amount: session.points });
        }
        
        // Sync to SQLite
        db.prepare("INSERT INTO attendances (user_id, session_id) VALUES (?, ?)").run(userId, session.id);
        db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(session.points, userId);
        const user = db.prepare("SELECT team_id FROM users WHERE id = ?").get(userId);
        if (user?.team_id) {
          db.prepare("UPDATE teams SET total_points = total_points + ? WHERE id = ?").run(session.points, user.team_id);
        }
        return res.json({ success: true, points: session.points });
      }
    }

    const session = db.prepare("SELECT * FROM attendance_sessions WHERE code = ? AND is_active = 1").get(code);
    if (!session) return res.status(400).json({ error: "Código inválido ou sessão expirada" });

    const alreadyChecked = db.prepare("SELECT * FROM attendances WHERE user_id = ? AND session_id = ?").get(userId, session.id);
    if (alreadyChecked) return res.status(400).json({ error: "Presença já registrada" });

    db.prepare("INSERT INTO attendances (user_id, session_id) VALUES (?, ?)").run(userId, session.id);
    db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(session.points, userId);
    
    const user = db.prepare("SELECT team_id FROM users WHERE id = ?").get(userId);
    if (user.team_id) {
      db.prepare("UPDATE teams SET total_points = total_points + ? WHERE id = ?").run(session.points, user.team_id);
    }

    res.json({ success: true, points: session.points });
  });

  // Games - Quiz
  app.get("/api/quiz/daily", async (req, res) => {
    const userId = req.query.userId;
    const today = new Date().toISOString().split('T')[0];

    if (userId && userId !== 'undefined') {
      try {
        const attempt = db.prepare("SELECT * FROM daily_quizzes WHERE user_id = ? AND date = ?").get(userId, today);
        if (attempt) {
          return res.status(403).json({ error: "Você já realizou o quiz hoje. Volte amanhã!" });
        }
      } catch (e) {
        console.error("Error checking quiz attempt:", e);
      }
    }

    try {
      if (supabase) {
        const { data: questions, error } = await supabase
          .from('biblical_questions')
          .select('*')
          .eq('is_active', true);
        
        if (!error && questions && questions.length > 0) {
          const shuffled = questions.sort(() => 0.5 - Math.random()).slice(0, 3);
          return res.json(shuffled);
        }
      }
      const questions = db.prepare("SELECT * FROM biblical_questions WHERE is_active = 1 ORDER BY RANDOM() LIMIT 3").all();
      res.json(questions);
    } catch (err) {
      console.error("Quiz daily error:", err);
      res.status(500).json({ error: "Erro ao buscar quiz" });
    }
  });

  // Games - Play Tracking
  app.get("/api/games/plays", async (req, res) => {
    const { userId, gameId } = req.query;
    const today = new Date().toISOString().split('T')[0];

    if (!userId || !gameId) {
      return res.status(400).json({ error: "userId and gameId are required" });
    }

    try {
      const play = db.prepare("SELECT count FROM game_plays WHERE user_id = ? AND game_id = ? AND date = ?").get(userId, gameId, today);
      res.json({ count: play ? play.count : 0 });
    } catch (err) {
      res.status(500).json({ error: "Error fetching plays" });
    }
  });

  app.post("/api/games/record-play", async (req, res) => {
    const { userId, gameId } = req.body;
    const today = new Date().toISOString().split('T')[0];

    if (!userId || !gameId) {
      return res.status(400).json({ error: "userId and gameId are required" });
    }

    try {
      const play = db.prepare("SELECT id, count FROM game_plays WHERE user_id = ? AND game_id = ? AND date = ?").get(userId, gameId, today);
      
      if (play) {
        db.prepare("UPDATE game_plays SET count = count + 1 WHERE id = ?").run(play.id);
        res.json({ success: true, count: play.count + 1 });
      } else {
        db.prepare("INSERT INTO game_plays (user_id, game_id, date, count) VALUES (?, ?, ?, ?)").run(userId, gameId, today, 1);
        res.json({ success: true, count: 1 });
      }
    } catch (err) {
      res.status(500).json({ error: "Error recording play" });
    }
  });

  app.post("/api/quiz/submit", async (req, res) => {
    const { userId, score } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Record quiz attempt
      db.prepare("INSERT INTO daily_quizzes (user_id, date, score) VALUES (?, ?, ?)").run(userId, today, score);
      
      if (supabase) {
        await supabase.from('daily_quizzes').insert([{ user_id: userId, date: today, score }]);
      }

      // Award points
      await addPoints(userId, score);
      
      res.json({ success: true });
    } catch (err: any) {
      console.error("Quiz submit error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Games - Tree
  app.get("/api/tree/types", async (req, res) => {
    if (supabase) {
      const { data: types, error } = await supabase.from('tree_types').select('*');
      if (!error) return res.json(types);
    }
    const types = db.prepare("SELECT * FROM tree_types").all();
    res.json(types);
  });

  app.get("/api/tree/user/:userId", async (req, res) => {
    if (supabase) {
      const { data: tree, error } = await supabase
        .from('user_trees')
        .select(`
          *,
          tree_types (name, rarity, max_stages, points_per_stage)
        `)
        .eq('user_id', req.params.userId)
        .single();
      
      if (!error && tree) {
        const formatted = {
          ...tree,
          name: tree.tree_types?.name,
          rarity: tree.tree_types?.rarity,
          max_stages: tree.tree_types?.max_stages,
          points_per_stage: tree.tree_types?.points_per_stage
        };
        return res.json(formatted);
      }
    }

    const tree = db.prepare(`
      SELECT ut.*, tt.name, tt.rarity, tt.max_stages, tt.points_per_stage 
      FROM user_trees ut
      JOIN tree_types tt ON ut.tree_type_id = tt.id
      WHERE ut.user_id = ?
    `).get(req.params.userId);
    res.json(tree || null);
  });

  app.post("/api/tree/plant", async (req, res) => {
    const { userId, treeTypeId } = req.body;
    if (supabase) {
      const { error } = await supabase
        .from('user_trees')
        .insert([{ user_id: userId, tree_type_id: treeTypeId }]);
      if (!error) {
        db.prepare("INSERT INTO user_trees (user_id, tree_type_id) VALUES (?, ?)").run(userId, treeTypeId);
        return res.json({ success: true });
      }
    }
    db.prepare("INSERT INTO user_trees (user_id, tree_type_id) VALUES (?, ?)").run(userId, treeTypeId);
    res.json({ success: true });
  });

  app.post("/api/tree/water", async (req, res) => {
    const { userId, treeId } = req.body;
    
    if (supabase) {
      const { data: tree, error: fetchError } = await supabase
        .from('user_trees')
        .select('*, tree_types(points_per_stage, max_stages)')
        .eq('id', treeId)
        .single();

      if (!fetchError && tree) {
        const newWaterCount = tree.water_count + 1;
        let newStage = tree.stage;
        let pointsEarned = 0;

        if (newWaterCount % 5 === 0 && tree.stage < tree.tree_types?.max_stages) {
          newStage += 1;
          pointsEarned = tree.tree_types?.points_per_stage;
          await supabase.rpc('increment_user_points', { row_id: userId, amount: pointsEarned });
        }

        const { error: updateError } = await supabase
          .from('user_trees')
          .update({ water_count: newWaterCount, stage: newStage, last_watered_at: new Date().toISOString() })
          .eq('id', treeId);

        if (!updateError) {
          // Sync to SQLite
          db.prepare("UPDATE user_trees SET water_count = ?, stage = ?, last_watered_at = CURRENT_TIMESTAMP WHERE id = ?").run(newWaterCount, newStage, treeId);
          if (pointsEarned > 0) {
            await addPoints(userId, pointsEarned);
          }
          return res.json({ success: true, stage: newStage, pointsEarned });
        }
      }
    }

    const tree = db.prepare("SELECT ut.*, tt.points_per_stage, tt.max_stages FROM user_trees ut JOIN tree_types tt ON ut.tree_type_id = tt.id WHERE ut.id = ?").get(treeId);
    
    const newWaterCount = tree.water_count + 1;
    let newStage = tree.stage;
    let pointsEarned = 0;

    // Every 5 waters = 1 stage up
    if (newWaterCount % 5 === 0 && tree.stage < tree.max_stages) {
      newStage += 1;
      pointsEarned = tree.points_per_stage;
      await addPoints(userId, pointsEarned);
    }

    db.prepare("UPDATE user_trees SET water_count = ?, stage = ?, last_watered_at = CURRENT_TIMESTAMP WHERE id = ?").run(newWaterCount, newStage, treeId);
    res.json({ success: true, stage: newStage, pointsEarned });
  });

  // --- App Settings & Manifest ---
  app.get("/api/settings/:key", async (req, res) => {
    const { key } = req.params;
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', key)
          .single();
        if (!error && data) return res.json({ value: data.value });
      }
      
      if (db) {
        const setting = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
        return res.json({ value: setting?.value || null });
      }
      res.json({ value: null });
    } catch (err) {
      res.status(500).json({ error: "Error fetching settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    const { key, value } = req.body;
    try {
      if (db) {
        db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, value);
      }
      if (supabase) {
        await supabase.from('app_settings').upsert({ key, value });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error saving settings" });
    }
  });

  app.get("/manifest.json", async (req, res) => {
    let logoUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=SalvaVidas&backgroundColor=b6e3f4";
    
    try {
      if (supabase) {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'login_logo').single();
        if (data?.value) logoUrl = data.value;
      } else if (db) {
        const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'login_logo'").get();
        if (setting?.value) logoUrl = setting.value;
      }
    } catch (e) {
      console.error("Error fetching logo for manifest:", e);
    }

    const manifest = {
      short_name: "Salva Vidas",
      name: "Salva Vidas Game",
      icons: [
        {
          src: logoUrl,
          type: logoUrl.includes('.svg') ? "image/svg+xml" : (logoUrl.includes('.png') ? "image/png" : "image/jpeg"),
          sizes: "512x512",
          purpose: "any maskable"
        }
      ],
      start_url: ".",
      display: "standalone",
      theme_color: "#dc2626",
      background_color: "#f8fafc"
    };

    res.json(manifest);
  });

  app.get("/api/app-logo", async (req, res) => {
    let logoUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=SalvaVidas&backgroundColor=b6e3f4";
    try {
      if (supabase) {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'login_logo').single();
        if (data?.value) logoUrl = data.value;
      } else if (db) {
        const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'login_logo'").get();
        if (setting?.value) logoUrl = setting.value;
      }
    } catch (e) {}

    if (logoUrl.startsWith('data:')) {
      const matches = logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const type = matches[1];
        const data = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', type);
        return res.send(data);
      }
    }
    res.redirect(logoUrl);
  });

  // Birthday Endpoints
  app.get("/api/birthdays", async (req, res) => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    try {
      let users: any[] = [];
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        users = data;
      } else if (db) {
        users = db.prepare("SELECT * FROM users").all();
      }

      const birthdayUsers = users.filter(user => {
        if (!user.birth_date) return false;
        const bDate = new Date(user.birth_date);
        return bDate.getUTCDate() === day && (bDate.getUTCMonth() + 1) === month;
      });

      const results = await Promise.all(birthdayUsers.map(async (user) => {
        let event = null;
        let messages = [];

        if (supabase) {
          const { data: eventData } = await supabase
            .from('birthday_events')
            .select('*')
            .eq('user_id', user.id)
            .eq('year', year)
            .maybeSingle();
          event = eventData;

          const { data: msgData } = await supabase
            .from('birthday_messages')
            .select('*, sender:users!sender_user_id(name, avatar)')
            .eq('birthday_user_id', user.id)
            .order('created_at', { ascending: false });
          messages = (msgData || []).map((m: any) => ({
            ...m,
            sender_name: m.sender?.name,
            sender_avatar: m.sender?.avatar
          }));
        } else if (db) {
          event = db.prepare("SELECT * FROM birthday_events WHERE user_id = ? AND year = ?").get(user.id, year);
          messages = db.prepare(`
            SELECT m.*, u.name as sender_name, u.avatar as sender_avatar 
            FROM birthday_messages m 
            JOIN users u ON m.sender_user_id = u.id 
            WHERE m.birthday_user_id = ? 
            ORDER BY m.created_at DESC
          `).all(user.id);
        }

        return {
          ...user,
          age: calculateAge(user.birth_date),
          event,
          messages
        };
      }));

      res.json(results);
    } catch (error) {
      console.error("Error fetching birthdays:", error);
      res.status(500).json({ error: "Failed to fetch birthdays" });
    }
  });

  app.post("/api/birthdays/:userId/messages", async (req, res) => {
    const { userId } = req.params;
    const { senderId, message } = req.body;

    try {
      if (supabase) {
        await supabase.from('birthday_messages').insert({
          birthday_user_id: userId,
          sender_user_id: senderId,
          message
        });
        // Award 3 points to sender
        await addPoints(senderId, 3);
      } else if (db) {
        db.prepare("INSERT INTO birthday_messages (birthday_user_id, sender_user_id, message) VALUES (?, ?, ?)").run(
          userId,
          senderId,
          message
        );
        await addPoints(senderId, 3);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending birthday message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/admin/birthdays/:userId", async (req, res) => {
    const { userId } = req.params;
    const year = new Date().getFullYear();

    try {
      let event = null;
      if (supabase) {
        const { data } = await supabase
          .from('birthday_events')
          .select('*')
          .eq('user_id', userId)
          .eq('year', year)
          .maybeSingle();
        event = data;
      } else if (db) {
        event = db.prepare("SELECT * FROM birthday_events WHERE user_id = ? AND year = ?").get(userId, year);
      }
      res.json(event || {});
    } catch (error) {
      console.error("Error fetching birthday settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/birthdays", async (req, res) => {
    const { userId, adminMessage, imageUrl } = req.body;
    const year = new Date().getFullYear();

    try {
      if (supabase) {
        const { data: existing } = await supabase
          .from('birthday_events')
          .select('*')
          .eq('user_id', userId)
          .eq('year', year)
          .maybeSingle();

        if (existing) {
          await supabase.from('birthday_events').update({
            admin_message: adminMessage,
            image_url: imageUrl
          }).eq('id', existing.id);
        } else {
          await supabase.from('birthday_events').insert({
            user_id: userId,
            admin_message: adminMessage,
            image_url: imageUrl,
            year
          });
        }
      } else if (db) {
        const existing = db.prepare("SELECT * FROM birthday_events WHERE user_id = ? AND year = ?").get(userId, year);
        if (existing) {
          db.prepare("UPDATE birthday_events SET admin_message = ?, image_url = ? WHERE id = ?").run(
            adminMessage,
            imageUrl,
            existing.id
          );
        } else {
          db.prepare("INSERT INTO birthday_events (user_id, admin_message, image_url, year) VALUES (?, ?, ?, ?)").run(
            userId,
            adminMessage,
            imageUrl,
            year
          );
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating birthday event:", error);
      res.status(500).json({ error: "Failed to update birthday event" });
    }
  });

  // --- Vite Middleware ---
  const isProd = process.env.NODE_ENV === "production";
  console.log(`Running in ${isProd ? "production" : "development"} mode.`);
  if (!isProd) {
    console.log("Creating Vite server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    console.log("Vite server created.");
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  console.log(`Starting server on port ${PORT}...`);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export const app = express();
startServer(app).catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
