import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("community.db");

// Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize Database
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
    last_login DATETIME,
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
`);

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
if (userCount === 0) {
  db.prepare("INSERT INTO teams (name, color, description) VALUES (?, ?, ?)").run("Leões de Judá", "#ef4444", "Equipe forte e corajosa");
  db.prepare("INSERT INTO teams (name, color, description) VALUES (?, ?, ?)").run("Águias do Reino", "#3b82f6", "Visão e renovo");
  
  db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run("Admin", "admin@church.com", "admin123", "admin", 1);
  db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run("João Silva", "joao@church.com", "user123", "user", 1);
  db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run("Maria Santos", "maria@church.com", "user123", "user", 2);

  db.prepare("INSERT INTO tasks (title, description, points, category, type) VALUES (?, ?, ?, ?, ?)").run("Ler Salmo 23", "Ler e meditar no Salmo 23", 10, "Desafio", "Individual");
  db.prepare("INSERT INTO tasks (title, description, points, category, type) VALUES (?, ?, ?, ?, ?)").run("Trazer Visitante", "Trazer um novo amigo para a célula", 50, "Célula", "Individual");

  db.prepare("INSERT INTO tree_types (name, rarity, points_per_stage) VALUES (?, ?, ?)").run("Oliveira da Paz", "Comum", 5);
  db.prepare("INSERT INTO tree_types (name, rarity, points_per_stage) VALUES (?, ?, ?)").run("Cedro do Líbano", "Rara", 10);

  db.prepare("INSERT INTO biblical_questions (question, option_a, option_b, option_c, option_d, correct_option, category, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run("Quem construiu a arca?", "Moisés", "Noé", "Abraão", "Davi", "B", "Antigo Testamento", "Fácil");
  db.prepare("INSERT INTO biblical_questions (question, option_a, option_b, option_c, option_d, correct_option, category, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run("Qual o primeiro livro da Bíblia?", "Êxodo", "Levítico", "Gênesis", "Números", "C", "Antigo Testamento", "Fácil");
}

async function startServer() {
  const app = express();
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
    const { email, password } = req.body;
    
    if (supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*, teams(name)')
        .eq('email', email)
        .single();

      if (user) {
        const isMatch = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') 
          ? await bcrypt.compare(password, user.password)
          : user.password === password;

        if (isMatch) {
          // Flatten team name if it exists from the join
          const formattedUser = {
            ...user,
            team_name: user.teams?.name || null
          };
          return res.json(formattedUser);
        }
      }
    }

    // Fallback to SQLite
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    
    if (user) {
      const isMatch = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') 
        ? await bcrypt.compare(password, user.password)
        : user.password === password;

      if (isMatch) {
        if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          const hashedPassword = await bcrypt.hash(password, 10);
          db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
        }
        res.json(user);
      } else {
        res.status(401).json({ error: "Credenciais inválidas" });
      }
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    if (supabase) {
      const { data: users, error } = await supabase
        .from('users')
        .select('*, teams(name)')
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
        const fs = await import('fs');
        fs.appendFileSync('supabase_errors.log', `${new Date().toISOString()} - Users: ${error.message}\n`);
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
    const { name, email, password, role, team_id, points, level, streak } = req.body;
    try {
      let hashedPassword = password;
      if (password && !password.startsWith('$2a$') && !password.startsWith('$2b$')) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      if (supabase) {
        const updateData: any = { name, email, role, team_id, points, level, streak };
        if (password) updateData.password = hashedPassword;
        
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', req.params.id);
        
        if (!error) {
          if (password) {
            db.prepare(`
              UPDATE users 
              SET name = ?, email = ?, password = ?, role = ?, team_id = ?, points = ?, level = ?, streak = ? 
              WHERE id = ?
            `).run(name, email, hashedPassword, role, team_id, points, level, streak, req.params.id);
          } else {
            db.prepare(`
              UPDATE users 
              SET name = ?, email = ?, role = ?, team_id = ?, points = ?, level = ?, streak = ? 
              WHERE id = ?
            `).run(name, email, role, team_id, points, level, streak, req.params.id);
          }
          return res.json({ success: true });
        }
      }

      if (password) {
        db.prepare(`
          UPDATE users 
          SET name = ?, email = ?, password = ?, role = ?, team_id = ?, points = ?, level = ?, streak = ? 
          WHERE id = ?
        `).run(name, email, hashedPassword, role, team_id, points, level, streak, req.params.id);
      } else {
        db.prepare(`
          UPDATE users 
          SET name = ?, email = ?, role = ?, team_id = ?, points = ?, level = ?, streak = ? 
          WHERE id = ?
        `).run(name, email, role, team_id, points, level, streak, req.params.id);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

    try {
      if (supabase) {
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (!error) {
          const deleteUser = db.transaction(() => {
            db.prepare("DELETE FROM user_tasks WHERE user_id = ?").run(userId);
            db.prepare("DELETE FROM attendances WHERE user_id = ?").run(userId);
            db.prepare("DELETE FROM daily_quizzes WHERE user_id = ?").run(userId);
            db.prepare("DELETE FROM user_trees WHERE user_id = ?").run(userId);
            db.prepare("UPDATE teams SET leader_id = NULL WHERE leader_id = ?").run(userId);
            db.prepare("DELETE FROM users WHERE id = ?").run(userId);
          });
          deleteUser();
          return res.json({ success: true });
        }
      }

      const deleteUser = db.transaction(() => {
        // Remove related records
        db.prepare("DELETE FROM user_tasks WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM attendances WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM daily_quizzes WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM user_trees WHERE user_id = ?").run(userId);
        
        // Clear leader_id in teams if this user was a leader
        db.prepare("UPDATE teams SET leader_id = NULL WHERE leader_id = ?").run(userId);
        
        // Finally delete the user
        const result = db.prepare("DELETE FROM users WHERE id = ?").run(userId);
        if (result.changes === 0) throw new Error("User not found");
      });
      
      deleteUser();
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting user:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Teams
  app.get("/api/teams", async (req, res) => {
    if (supabase) {
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
    const { name, color, description, leader_id, total_points, photo } = req.body;
    try {
      if (supabase) {
        const { error } = await supabase
          .from('teams')
          .update({ name, color, description, leader_id, total_points, photo })
          .eq('id', req.params.id);
        
        if (!error) {
          db.prepare(`
            UPDATE teams 
            SET name = ?, color = ?, description = ?, leader_id = ?, total_points = ?, photo = ? 
            WHERE id = ?
          `).run(name, color, description, leader_id, total_points, photo, req.params.id);
          return res.json({ success: true });
        }
      }

      db.prepare(`
        UPDATE teams 
        SET name = ?, color = ?, description = ?, leader_id = ?, total_points = ?, photo = ? 
        WHERE id = ?
      `).run(name, color, description, leader_id, total_points, photo, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/admin/teams/:id", async (req, res) => {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) return res.status(400).json({ error: "Invalid team ID" });

    try {
      if (supabase) {
        const { error } = await supabase.from('teams').delete().eq('id', teamId);
        if (!error) {
          const deleteTeam = db.transaction(() => {
            db.prepare("UPDATE users SET team_id = NULL WHERE team_id = ?").run(teamId);
            db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
          });
          deleteTeam();
          return res.json({ success: true });
        }
      }

      const deleteTeam = db.transaction(() => {
        // Set team_id to NULL for all users in this team
        db.prepare("UPDATE users SET team_id = NULL WHERE team_id = ?").run(teamId);
        // Finally delete the team
        const result = db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
        if (result.changes === 0) throw new Error("Team not found");
      });
      deleteTeam();
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting team:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Tasks
  app.get("/api/tasks", async (req, res) => {
    if (supabase) {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) return res.json(tasks);
    }
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
    res.json(tasks);
  });

  app.post("/api/admin/tasks", async (req, res) => {
    const { title, description, points, category, type, available_from, deadline } = req.body;
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('tasks')
          .insert([{ title, description, points, category, type, available_from: available_from || null, deadline: deadline || null }])
          .select()
          .single();
        if (!error) {
          db.prepare(`
            INSERT INTO tasks (id, title, description, points, category, type, available_from, deadline) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(data.id, title, description, points, category, type, available_from || null, deadline || null);
          return res.json({ id: data.id });
        }
      }
      const result = db.prepare(`
        INSERT INTO tasks (title, description, points, category, type, available_from, deadline) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(title, description, points, category, type, available_from || null, deadline || null);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
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

  app.put("/api/admin/tasks/:id", (req, res) => {
    const { title, description, points, category, type, available_from, deadline, is_active } = req.body;
    try {
      db.prepare(`
        UPDATE tasks 
        SET title = ?, description = ?, points = ?, category = ?, type = ?, available_from = ?, deadline = ?, is_active = ? 
        WHERE id = ?
      `).run(title, description, points, category, type, available_from, deadline, is_active, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/admin/tasks/:id", (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task ID" });

    try {
      const deleteTask = db.transaction(() => {
        // Remove related user_tasks first
        db.prepare("DELETE FROM user_tasks WHERE task_id = ?").run(taskId);
        // Finally delete the task
        const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
        if (result.changes === 0) throw new Error("Task not found");
      });
      deleteTask();
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

  app.get("/api/admin/pending-tasks", async (req, res) => {
    if (supabase) {
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

  app.post("/api/admin/verify-task", async (req, res) => {
    const { userTaskId, status } = req.body; // status: 'verified' or 'rejected'
    
    if (supabase) {
      const { data: userTask, error: fetchError } = await supabase
        .from('user_tasks')
        .select('*, tasks(points)')
        .eq('id', userTaskId)
        .single();

      if (!fetchError && userTask) {
        const { error: updateError } = await supabase
          .from('user_tasks')
          .update({ status, verified_at: new Date().toISOString() })
          .eq('id', userTaskId);

        if (!updateError && status === 'verified') {
          const points = userTask.tasks?.points || 0;
          // Update user points
          const { data: userData } = await supabase.rpc('increment_user_points', { row_id: userTask.user_id, amount: points });
          
          // Update team points if user has team
          const { data: userWithTeam } = await supabase.from('users').select('team_id').eq('id', userTask.user_id).single();
          if (userWithTeam?.team_id) {
            await supabase.rpc('increment_team_points', { row_id: userWithTeam.team_id, amount: points });
          }
        }
        
        // Sync to SQLite
        db.prepare("UPDATE user_tasks SET status = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, userTaskId);
        if (status === 'verified') {
          const points = userTask.tasks?.points || 0;
          db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(points, userTask.user_id);
          const user = db.prepare("SELECT team_id FROM users WHERE id = ?").get(userTask.user_id);
          if (user?.team_id) {
            db.prepare("UPDATE teams SET total_points = total_points + ? WHERE id = ?").run(points, user.team_id);
          }
        }
        return res.json({ success: true });
      }
    }

    const userTask = db.prepare("SELECT * FROM user_tasks WHERE id = ?").get(userTaskId);
    if (!userTask) return res.status(404).json({ error: "Task not found" });

    db.prepare("UPDATE user_tasks SET status = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, userTaskId);

    if (status === 'verified') {
      const task = db.prepare("SELECT points FROM tasks WHERE id = ?").get(userTask.task_id);
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(task.points, userTask.user_id);
      
      const user = db.prepare("SELECT team_id FROM users WHERE id = ?").get(userTask.user_id);
      if (user.team_id) {
        db.prepare("UPDATE teams SET total_points = total_points + ? WHERE id = ?").run(task.points, user.team_id);
      }
    }
    res.json({ success: true });
  });

  // Attendance
  app.post("/api/admin/create-session", async (req, res) => {
    const { eventType, points, maxCheckins } = req.body;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    if (supabase) {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert([{ event_type: eventType, code, points, max_checkins: maxCheckins }])
        .select()
        .single();
      if (!error) {
        db.prepare("INSERT INTO attendance_sessions (id, event_type, code, points, max_checkins) VALUES (?, ?, ?, ?, ?)").run(data.id, eventType, code, points, maxCheckins);
        return res.json({ id: data.id, code });
      }
    }

    const result = db.prepare("INSERT INTO attendance_sessions (event_type, code, points, max_checkins) VALUES (?, ?, ?, ?)").run(eventType, code, points, maxCheckins);
    res.json({ id: result.lastInsertRowid, code });
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
    if (supabase) {
      const { data: questions, error } = await supabase
        .from('biblical_questions')
        .select('*')
        .eq('is_active', true);
      
      if (!error && questions.length > 0) {
        // Shuffle and take 3
        const shuffled = questions.sort(() => 0.5 - Math.random()).slice(0, 3);
        return res.json(shuffled);
      }
    }
    const questions = db.prepare("SELECT * FROM biblical_questions WHERE is_active = 1 ORDER BY RANDOM() LIMIT 3").all();
    res.json(questions);
  });

  app.post("/api/quiz/submit", async (req, res) => {
    const { userId, score } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    if (supabase) {
      const { error } = await supabase
        .from('daily_quizzes')
        .insert([{ user_id: userId, date: today, score }]);
      
      if (!error) {
        await supabase.rpc('increment_user_points', { row_id: userId, amount: score });
        // Sync to SQLite
        db.prepare("INSERT INTO daily_quizzes (user_id, date, score) VALUES (?, ?, ?)").run(userId, today, score);
        db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(score, userId);
        return res.json({ success: true });
      }
    }

    db.prepare("INSERT INTO daily_quizzes (user_id, date, score) VALUES (?, ?, ?)").run(userId, today, score);
    db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(score, userId);
    res.json({ success: true });
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
            db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(pointsEarned, userId);
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
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(pointsEarned, userId);
    }

    db.prepare("UPDATE user_trees SET water_count = ?, stage = ?, last_watered_at = CURRENT_TIMESTAMP WHERE id = ?").run(newWaterCount, newStage, treeId);
    res.json({ success: true, stage: newStage, pointsEarned });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
