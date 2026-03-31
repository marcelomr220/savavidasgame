import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// --- INITIALIZATION (from _lib.ts) ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) console.warn("Missing SUPABASE_URL environment variable");
if (!supabaseKey) console.warn("Missing SUPABASE_KEY environment variable");

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

let dbInstance: any = null;
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SQLITE === 'true') {
  try {
    const Database = require("better-sqlite3");
    dbInstance = new Database("community.db");
    console.log("SQLite initialized (Development mode)");
  } catch (e) {
    console.warn("SQLite not available in this environment");
  }
}
const db = dbInstance;

async function addPoints(userId: string | number, amount: number) {
  if (amount <= 0) return;
  try {
    const now = new Date().toISOString();
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
    if (supabase) {
      const { data: user, error: fetchError } = await supabase.from('users').select('points, team_id').eq('id', userId).single();
      if (!fetchError && user) {
        const { error: rpcError } = await supabase.rpc('increment_user_points', { row_id: userId, amount });
        if (rpcError) {
          const newPoints = Math.max(0, (user.points || 0) + amount);
          await supabase.from('users').update({ points: newPoints }).eq('id', userId);
        }
        const newPoints = Math.max(0, (user.points || 0) + amount);
        const newLevel = Math.floor(newPoints / 1000) + 1;
        await supabase.from('users').update({ level: newLevel, last_activity_at: now }).eq('id', userId);
        if (user.team_id) {
          await supabase.rpc('increment_team_points', { row_id: user.team_id, amount });
        }
      }
    }
  } catch (err) {
    console.error("Critical error in addPoints helper:", err);
  }
}

function calculateAge(birthDate: string | null): number {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const action = query.action as string;

  console.log(`Unified API Request: ${method} ${req.url}`, { action, query, body });

  if (!action) {
    return res.status(400).json({ error: "Action is required" });
  }

  try {
    switch (action) {
      case "getUserDashboardData": {
        const { userId } = query;
        if (!userId) return res.status(400).json({ error: "User ID required" });
        let userTasks: any[] = [];
        let userAttendance: any[] = [];
        let teamInfo: any = null;

        if (supabase) {
          const [tasksRes, attendanceRes] = await Promise.all([
            supabase.from('user_tasks').select('*, tasks(*)').eq('user_id', userId),
            supabase.from('attendances').select('*, attendance_sessions(*)').eq('user_id', userId)
          ]);
          userTasks = tasksRes.data || [];
          userAttendance = attendanceRes.data || [];
          
          const userRes = await supabase.from('users').select('team_id').eq('id', userId).single();
          if (userRes.data?.team_id) {
            const teamRes = await supabase.from('teams').select('*').eq('id', userRes.data.team_id).single();
            teamInfo = teamRes.data;
          }
        } else if (db) {
          userTasks = db.prepare("SELECT ut.*, t.title, t.points FROM user_tasks ut JOIN tasks t ON ut.task_id = t.id WHERE ut.user_id = ?").all(userId);
          userAttendance = db.prepare("SELECT a.*, asess.title, asess.date FROM attendances a JOIN attendance_sessions asess ON a.session_id = asess.id WHERE a.user_id = ?").all(userId);
          const user = db.prepare("SELECT team_id FROM users WHERE id = ?").get(userId);
          if (user?.team_id) {
            teamInfo = db.prepare("SELECT * FROM teams WHERE id = ?").get(user.team_id);
          }
        }
        return res.json({ userTasks, userAttendance, teamInfo });
      }

      case "bulkCreateUsers": {
        const { users } = body;
        if (!Array.isArray(users)) return res.status(400).json({ error: "Users array required" });
        if (supabase) {
          const { error } = await supabase.from('users').insert(users);
          if (error) throw error;
        }
        if (db) {
          const insert = db.prepare("INSERT INTO users (name, email, role, team_id, points, level, streak, birth_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          db.transaction(() => {
            users.forEach(u => insert.run(u.name, u.email, u.role || 'user', u.team_id || null, u.points || 0, u.level || 1, u.streak || 0, u.birth_date || null));
          })();
        }
        return res.json({ success: true });
      }

      // --- TASKS ---
      case "getTasks": {
        const isAdmin = query.isAdmin === 'true';
        if (supabase) {
          let q = supabase.from('tasks').select('*');
          if (!isAdmin) q = q.eq('is_active', true);
          const { data, error } = await q.order('created_at', { ascending: false });
          if (error) throw error;
          return res.json(data || []);
        }
        if (db) {
          const q = isAdmin ? "SELECT * FROM tasks ORDER BY created_at DESC" : "SELECT * FROM tasks WHERE is_active = 1 ORDER BY created_at DESC";
          return res.json(db.prepare(q).all());
        }
        return res.json([]);
      }

      case "createTask": {
        const { title, description, points, category, type, is_recurring, deadline } = body;
        if (!title) return res.status(400).json({ error: "Title is required" });
        let lastId: any = Date.now();
        if (supabase) {
          const { data, error } = await supabase.from('tasks').insert([{ 
            title, description, points: Number(points) || 0, category, type, 
            is_recurring: is_recurring || null, deadline: deadline || null 
          }]).select().single();
          if (error) throw error;
          if (data) lastId = data.id;
        }
        if (db) {
          const result = db.prepare("INSERT INTO tasks (title, description, points, category, type, is_recurring, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
            title, description, Number(points) || 0, category, type, is_recurring || null, deadline || null
          );
          if (!supabase) lastId = result.lastInsertRowid;
        }
        return res.json({ id: lastId, success: true });
      }

      case "updateTask": {
        const { id } = query;
        const { title, description, points, category, type, is_active, is_recurring, deadline } = body;
        if (!id) return res.status(400).json({ error: "ID is required" });
        if (supabase) {
          const { error } = await supabase.from('tasks').update({ 
            title, description, points: Number(points), category, type, is_active, 
            is_recurring: is_recurring || null, deadline: deadline || null 
          }).eq('id', id);
          if (error) throw error;
        }
        if (db) {
          db.prepare("UPDATE tasks SET title = ?, description = ?, points = ?, category = ?, type = ?, is_active = ?, is_recurring = ?, deadline = ? WHERE id = ?").run(
            title, description, Number(points), category, type, is_active ? 1 : 0, is_recurring || null, deadline || null, id
          );
        }
        return res.json({ success: true });
      }

      case "deleteTask": {
        const { id } = query;
        if (!id) return res.status(400).json({ error: "ID is required" });
        if (supabase) {
          await supabase.from('user_tasks').delete().eq('task_id', id);
          const { error } = await supabase.from('tasks').delete().eq('id', id);
          if (error) throw error;
        }
        if (db) {
          db.transaction(() => {
            db.prepare("DELETE FROM user_tasks WHERE task_id = ?").run(id);
            db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
          })();
        }
        return res.json({ success: true });
      }

      case "getPendingTasks": {
        if (supabase) {
          const { data, error } = await supabase.from('user_tasks').select('*, users(name), tasks(title, points)').eq('status', 'pending');
          if (error) throw error;
          return res.json((data || []).map(p => ({ ...p, user_name: (p as any).users?.name, task_title: (p as any).tasks?.title, task_points: (p as any).tasks?.points })));
        }
        if (db) {
          return res.json(db.prepare("SELECT ut.*, u.name as user_name, t.title as task_title, t.points as task_points FROM user_tasks ut JOIN users u ON ut.user_id = u.id JOIN tasks t ON ut.task_id = t.id WHERE ut.status = 'pending'").all());
        }
        return res.json([]);
      }

      case "verifyTask": {
        const { userTaskId, status, points, userId } = body;
        if (!userTaskId || !status || !userId) return res.status(400).json({ error: "Missing fields" });
        if (supabase) {
          const { error } = await supabase.from('user_tasks').update({ status, verified_at: new Date().toISOString() }).eq('id', userTaskId);
          if (error) throw error;
          if (status === 'verified') await addPoints(userId, Number(points) || 0);
        }
        if (db) {
          db.prepare("UPDATE user_tasks SET status = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, userTaskId);
          if (status === 'verified') await addPoints(userId, Number(points) || 0);
        }
        return res.json({ success: true });
      }

      // --- AUTH ---
      case 'login': {
        if (method !== 'POST') return res.status(405).json({ success: false, error: "Method not allowed" });
        const { email, password } = body;
        if (!email || !password) return res.status(400).json({ success: false, error: "Email e senha são obrigatórios" });

        let authUser = null;
        let authSession = null;

        if (supabase) {
          try {
            // Try Supabase Auth first
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (!authError && authData.user) {
              authUser = authData.user;
              authSession = authData.session;
              
              // Get profile data from our users table
              const { data: userData } = await supabase
                .from('users')
                .select('*, teams!team_id(name)')
                .eq('email', email)
                .single();

              if (userData) {
                const now = new Date().toISOString();
                await supabase.from('users').update({ last_activity_at: now }).eq('id', userData.id);
                
                return res.status(200).json({
                  success: true,
                  user: { ...userData, team_name: userData.teams?.name || null },
                  session: authSession
                });
              }
            }
          } catch (e) {
            console.error("Supabase Auth error:", e);
          }

          // Fallback to custom users table with bcrypt if Supabase Auth fails or user not in Auth
          const { data: user, error: userError } = await supabase
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
              return res.status(200).json({
                success: true,
                user: { ...userWithoutPassword, team_name: user.teams?.name || null },
                session: null
              });
            }
          }
        }

        if (db) {
          const user = db.prepare("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id WHERE u.email = ?").get(email);
          if (user) {
            const isMatch = user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))
              ? await bcrypt.compare(password, user.password)
              : user.password === password;

            if (isMatch) {
              const now = new Date().toISOString();
              db.prepare("UPDATE users SET last_activity_at = ? WHERE id = ?").run(now, user.id);
              const { password: _, ...userWithoutPassword } = user;
              return res.status(200).json({
                success: true,
                user: { ...userWithoutPassword, team_name: user.team_name || null },
                session: null
              });
            }
          }
        }

        return res.status(401).json({ success: false, error: "Credenciais inválidas" });
      }

      case 'register': {
        if (method !== 'POST') return res.status(405).json({ success: false, error: "Method not allowed" });
        const { name, email, password } = body;
        if (!name || !email || !password) return res.status(400).json({ success: false, error: "Nome, email e senha são obrigatórios" });
        const hashedPassword = await bcrypt.hash(password, 10);
        if (supabase) {
          const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
          if (existingUser) return res.status(400).json({ success: false, error: "Este email já está cadastrado" });
          const { data: newUser, error } = await supabase
            .from('users')
            .insert([{ name, email, password: hashedPassword, role: 'user', points: 0, level: 1, streak: 0 }])
            .select()
            .single();
          if (error) return res.status(400).json({ success: false, error: error.message });
          return res.status(200).json({ success: true, user: newUser });
        }
        if (db) {
          const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
          if (existing) return res.status(400).json({ success: false, error: "Este email já está cadastrado" });
          const result = db.prepare("INSERT INTO users (name, email, password, role, points, level, streak) VALUES (?, ?, ?, 'user', 0, 1, 0)").run(name, email, hashedPassword);
          const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
          return res.status(200).json({ success: true, user: newUser });
        }
        return res.status(500).json({ success: false, error: "Serviço de banco de dados indisponível" });
      }

      case 'getUserById': {
        const { id } = query;
        if (supabase) {
          const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
          if (!error) return res.json(data);
        }
        if (db) {
          const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
          if (user) return res.json(user);
        }
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      case "updateUserAvatar": {
        const { id } = query;
        const { avatar } = body;
        if (!id) return res.status(400).json({ error: "ID required" });
        if (supabase) {
          const { error } = await supabase.from('users').update({ avatar }).eq('id', id);
          if (error) throw error;
        }
        if (db) {
          db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, id);
        }
        return res.json({ success: true });
      }

      case "getTeamMembers": {
        const { teamId } = query;
        if (supabase) {
          const { data, error } = await supabase.from('users').select('id, name, avatar, points, level').eq('team_id', teamId).order('points', { ascending: false });
          if (error) throw error;
          return res.json(data || []);
        }
        if (db) {
          return res.json(db.prepare("SELECT id, name, avatar, points, level FROM users WHERE team_id = ? ORDER BY points DESC").all(teamId));
        }
        return res.json([]);
      }

      case "joinTeam": {
        const { userId, teamId } = body;
        if (supabase) {
          const { error } = await supabase.from('users').update({ team_id: teamId }).eq('id', userId);
          if (error) throw error;
        }
        if (db) {
          db.prepare("UPDATE users SET team_id = ? WHERE id = ?").run(teamId, userId);
        }
        return res.json({ success: true });
      }

      case "completeTask": {
        const { userId, taskId, proofUrl } = body;
        if (supabase) {
          const { error } = await supabase.from('user_tasks').insert([{ user_id: userId, task_id: taskId, proof_url: proofUrl, status: 'pending', completed_at: new Date().toISOString() }]);
          if (error) throw error;
        }
        if (db) {
          db.prepare("INSERT INTO user_tasks (user_id, task_id, proof_url, status, completed_at) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)").run(userId, taskId, proofUrl);
        }
        return res.json({ success: true });
      }

      case "getDailyQuiz": {
        if (supabase) {
          const { data, error } = await supabase.from('biblical_questions').select('*').eq('is_active', true);
          if (error) throw error;
          const shuffled = (data || []).sort(() => 0.5 - Math.random());
          return res.json(shuffled.slice(0, 5));
        }
        if (db) {
          const questions = db.prepare("SELECT * FROM biblical_questions WHERE is_active = 1").all();
          const shuffled = (questions || []).sort(() => 0.5 - Math.random());
          return res.json(shuffled.slice(0, 5));
        }
        return res.json([]);
      }

      case "seedTreeTypes": {
        const types = [
          { id: 1, name: 'Oliveira da Paz', rarity: 'Comum', max_stages: 5, points_per_stage: 5 },
          { id: 2, name: 'Cedro do Líbano', rarity: 'Rara', max_stages: 5, points_per_stage: 10 }
        ];
        if (supabase) {
          const { data: existing } = await supabase.from('tree_types').select('id');
          if (!existing || existing.length === 0) {
            await supabase.from('tree_types').upsert(types);
          }
        }
        if (db) {
          const existing = db.prepare("SELECT id FROM tree_types").all();
          if (!existing || existing.length === 0) {
            const insert = db.prepare("INSERT INTO tree_types (id, name, rarity, max_stages, points_per_stage) VALUES (?, ?, ?, ?, ?)");
            types.forEach(t => insert.run(t.id, t.name, t.rarity, t.max_stages, t.points_per_stage));
          }
        }
        return res.json({ success: true });
      }

      case "toggleVisibility": {
        const { bookId, currentVisible } = body;
        if (supabase) {
          const { error } = await supabase.from('bible_books').update({ visible: !currentVisible }).eq('id', bookId);
          if (error) throw error;
        }
        if (db) {
          db.prepare("UPDATE bible_books SET visible = ? WHERE id = ?").run(currentVisible ? 0 : 1, bookId);
        }
        return res.json({ success: true });
      }

      case "toggleRelease": {
        const { bookId, currentReleased } = body;
        if (supabase) {
          const { error } = await supabase.from('bible_books').update({ released: !currentReleased }).eq('id', bookId);
          if (error) throw error;
        }
        if (db) {
          db.prepare("UPDATE bible_books SET released = ? WHERE id = ?").run(currentReleased ? 0 : 1, bookId);
        }
        return res.json({ success: true });
      }

      case "getChapterBlocks": {
        const { chapterId } = query;
        if (supabase) {
          const { data, error } = await supabase.from('chapter_blocks').select('*, bible_verses(*)').eq('chapter_id', chapterId).order('order_index', { ascending: true });
          if (error) throw error;
          return res.json(data);
        }
        if (db) {
          return res.json(db.prepare("SELECT cb.*, bv.verse_number, bv.verse_text, bv.image_url as verse_image_url FROM chapter_blocks cb LEFT JOIN bible_verses bv ON cb.verse_id = bv.id WHERE cb.chapter_id = ? ORDER BY cb.order_index ASC").all(chapterId));
        }
        return res.json([]);
      }

      case "saveChapterBlocks": {
        const { chapterId, blocks } = body;
        if (supabase) {
          // Simplified sync for serverless function
          const verseBlocks = blocks.filter((b: any) => b.block_type === 'verse');
          for (const block of verseBlocks) {
            const verseData = { chapter_id: chapterId, verse_number: block.verse_number, verse_text: block.content_text, image_url: block.image_url };
            if (block.verse_id && !String(block.id).startsWith('v-')) {
              await supabase.from('bible_verses').update(verseData).eq('id', block.verse_id);
            } else {
              const { data: newVerse } = await supabase.from('bible_verses').insert([verseData]).select().single();
              if (newVerse) block.verse_id = newVerse.id;
            }
          }
          await supabase.from('chapter_blocks').delete().eq('chapter_id', chapterId);
          if (blocks.length > 0) {
            const blocksToInsert = blocks.map((block: any, index: number) => ({
              chapter_id: chapterId, block_type: block.block_type, verse_id: block.verse_id || null,
              content_text: block.block_type === 'verse' ? null : (block.content_text || null),
              image_url: block.block_type === 'verse' ? null : (block.image_url || null),
              order_index: index
            }));
            await supabase.from('chapter_blocks').insert(blocksToInsert);
          }
        }
        if (db) {
          db.transaction(() => {
            db.prepare("DELETE FROM chapter_blocks WHERE chapter_id = ?").run(chapterId);
            blocks.forEach((block: any, index: number) => {
              db.prepare("INSERT INTO chapter_blocks (chapter_id, block_type, verse_id, content_text, image_url, order_index) VALUES (?, ?, ?, ?, ?, ?)").run(
                chapterId, block.block_type, block.verse_id || null, block.content_text || null, block.image_url || null, index
              );
            });
          })();
        }
        return res.json({ success: true });
      }

      case "getBibleVerses": {
        const { chapterId } = query;
        if (supabase) {
          const { data, error } = await supabase.from('bible_verses').select('*').eq('chapter_id', chapterId).order('verse_number', { ascending: true });
          if (error) throw error;
          return res.json(data);
        }
        if (db) {
          return res.json(db.prepare("SELECT * FROM bible_verses WHERE chapter_id = ? ORDER BY verse_number ASC").all(chapterId));
        }
        return res.json([]);
      }

      case "updateBookCover": {
        const { bookId, imageUrl } = body;
        if (supabase) {
          const { error } = await supabase.from('bible_books').update({ image_url: imageUrl }).eq('id', bookId);
          if (error) throw error;
        }
        if (db) {
          db.prepare("UPDATE bible_books SET image_url = ? WHERE id = ?").run(imageUrl, bookId);
        }
        return res.json({ success: true });
      }

      case "createBibleChapter": {
        const { book_id, chapter_number, title, content_text, image_url } = body;
        let lastId: any = Date.now();
        if (supabase) {
          const { data, error } = await supabase.from('bible_chapters').insert([{ book_id, chapter_number, title, content_text, image_url }]).select().single();
          if (error) throw error;
          if (data) lastId = data.id;
        }
        if (db) {
          const result = db.prepare("INSERT INTO bible_chapters (book_id, chapter_number, title, content_text, image_url) VALUES (?, ?, ?, ?, ?)").run(book_id, chapter_number, title, content_text, image_url);
          if (!supabase) lastId = result.lastInsertRowid;
        }
        return res.json({ id: lastId, success: true });
      }

      case "updateBibleChapter": {
        const { id } = query;
        const { book_id, chapter_number, title, content_text, image_url } = body;
        if (supabase) {
          const { error } = await supabase.from('bible_chapters').update({ book_id, chapter_number, title, content_text, image_url }).eq('id', id);
          if (error) throw error;
        }
        if (db) {
          db.prepare("UPDATE bible_chapters SET book_id = ?, chapter_number = ?, title = ?, content_text = ?, image_url = ? WHERE id = ?").run(book_id, chapter_number, title, content_text, image_url, id);
        }
        return res.json({ success: true });
      }

      case "deleteBibleChapter": {
        const { id } = query;
        if (supabase) {
          const { error } = await supabase.from('bible_chapters').delete().eq('id', id);
          if (error) throw error;
        }
        if (db) {
          db.prepare("DELETE FROM bible_chapters WHERE id = ?").run(id);
        }
        return res.json({ success: true });
      }

      // --- USERS ---
      case "getUsers": {
        if (supabase) {
          const { data, error } = await supabase.from('users').select('*, teams!team_id(name)').order('points', { ascending: false });
          if (error) throw error;
          return res.json((data || []).map(u => ({ ...u, team_name: (u as any).teams?.name || null })));
        }
        if (db) {
          return res.json(db.prepare("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id ORDER BY u.points DESC").all());
        }
        return res.json([]);
      }

      case "createUser": {
        const { name, email, password, role, team_id } = body;
        if (!name || !email) return res.status(400).json({ error: "Name and email required" });
        const hashedPassword = await bcrypt.hash(password || "user123", 10);
        let lastId: any = Date.now();
        if (supabase) {
          const { data, error } = await supabase.from('users').insert([{ name, email, password: hashedPassword, role: role || 'user', team_id: team_id || null }]).select().single();
          if (error) throw error;
          if (data) lastId = data.id;
        }
        if (db) {
          const result = db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run(name, email, hashedPassword, role || 'user', team_id || null);
          if (!supabase) lastId = result.lastInsertRowid;
        }
        return res.json({ id: lastId, success: true });
      }

      case "updateUser": {
        const { id } = query;
        const { name, email, password, role, team_id, streak, avatar } = body;
        if (!id) return res.status(400).json({ error: "ID required" });
        let hashedPassword = password;
        if (password && !password.startsWith('$2a$') && !password.startsWith('$2b$')) {
          hashedPassword = await bcrypt.hash(password, 10);
        }
        if (supabase) {
          const updateData: any = { name, email, role, team_id, streak, avatar };
          if (hashedPassword) updateData.password = hashedPassword;
          const { error } = await supabase.from('users').update(updateData).eq('id', id);
          if (error) throw error;
        }
        if (db) {
          if (hashedPassword) {
            db.prepare("UPDATE users SET name = ?, email = ?, password = ?, role = ?, team_id = ?, streak = ?, avatar = ? WHERE id = ?").run(name, email, hashedPassword, role, team_id, streak, avatar, id);
          } else {
            db.prepare("UPDATE users SET name = ?, email = ?, role = ?, team_id = ?, streak = ?, avatar = ? WHERE id = ?").run(name, email, role, team_id, streak, avatar, id);
          }
        }
        return res.json({ success: true });
      }

      case "deleteUser": {
        const { id } = query;
        if (!id) return res.status(400).json({ error: "ID required" });
        if (supabase) {
          await supabase.from('user_tasks').delete().eq('user_id', id);
          await supabase.from('attendances').delete().eq('user_id', id);
          const { error } = await supabase.from('users').delete().eq('id', id);
          if (error) throw error;
        }
        if (db) {
          db.transaction(() => {
            db.prepare("DELETE FROM user_tasks WHERE user_id = ?").run(id);
            db.prepare("DELETE FROM attendances WHERE user_id = ?").run(id);
            db.prepare("DELETE FROM users WHERE id = ?").run(id);
          })();
        }
        return res.json({ success: true });
      }

      // --- TEAMS ---
      case "getTeams": {
        if (supabase) {
          const { data, error } = await supabase
            .from('teams')
            .select('*, users!team_id(count), monitor:users!monitor_id(name, avatar), leader:users!leader_id(name, avatar)')
            .order('total_points', { ascending: false });
          
          if (error) throw error;
          
          const formattedTeams = (data || []).map(t => ({
            ...t,
            member_count: (t as any).users?.[0]?.count || 0,
            monitor_name: (t as any).monitor?.name || null,
            monitor_avatar: (t as any).monitor?.avatar || null,
            leader_name: (t as any).leader?.name || null,
            leader_avatar: (t as any).leader?.avatar || null
          }));
          return res.json(formattedTeams);
        }
        if (db) {
          return res.json(db.prepare("SELECT t.*, (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count FROM teams t ORDER BY t.total_points DESC").all());
        }
        return res.json([]);
      }

      case "createTeam": {
        const { name, color, description, leader_id } = body;
        if (!name) return res.status(400).json({ error: "Name required" });
        let lastId: any = Date.now();
        if (supabase) {
          const { data, error } = await supabase.from('teams').insert([{ name, color, description, leader_id: leader_id || null }]).select().single();
          if (error) throw error;
          if (data) lastId = data.id;
        }
        if (db) {
          const result = db.prepare("INSERT INTO teams (name, color, description, leader_id) VALUES (?, ?, ?, ?)").run(name, color, description, leader_id || null);
          if (!supabase) lastId = result.lastInsertRowid;
        }
        return res.json({ id: lastId, success: true });
      }

      case "updateTeam": {
        const { id } = query;
        const { name, color, description, leader_id } = body;
        if (!id) return res.status(400).json({ error: "ID required" });
        if (supabase) {
          const { error } = await supabase.from('teams').update({ name, color, description, leader_id: leader_id || null }).eq('id', id);
          if (error) throw error;
        }
        if (db) {
          db.prepare("UPDATE teams SET name = ?, color = ?, description = ?, leader_id = ? WHERE id = ?").run(name, color, description, leader_id || null, id);
        }
        return res.json({ success: true });
      }

      case "deleteTeam": {
        const { id } = query;
        if (!id) return res.status(400).json({ error: "ID required" });
        if (supabase) {
          await supabase.from('users').update({ team_id: null }).eq('team_id', id);
          const { error } = await supabase.from('teams').delete().eq('id', id);
          if (error) throw error;
        }
        if (db) {
          db.transaction(() => {
            db.prepare("UPDATE users SET team_id = NULL WHERE team_id = ?").run(id);
            db.prepare("DELETE FROM teams WHERE id = ?").run(id);
          })();
        }
        return res.json({ success: true });
      }

      // --- STATS & RECENT ---
      case "getStats": {
        if (supabase) {
          const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
          const { count: activeTeams } = await supabase.from('teams').select('*', { count: 'exact', head: true });
          const { count: pendingTasks } = await supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { count: monthlyAttendance } = await supabase.from('attendances').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo);
          return res.json({ totalUsers: totalUsers || 0, activeTeams: activeTeams || 0, pendingTasks: pendingTasks || 0, monthlyAttendance: monthlyAttendance || 0 });
        }
        if (db) {
          const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
          const activeTeams = db.prepare("SELECT COUNT(*) as count FROM teams").get().count;
          const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM user_tasks WHERE status = 'pending'").get().count;
          const monthlyAttendance = db.prepare("SELECT COUNT(*) as count FROM attendances WHERE created_at >= date('now', '-30 days')").get().count;
          return res.json({ totalUsers, activeTeams, pendingTasks, monthlyAttendance });
        }
        return res.json({ totalUsers: 0, activeTeams: 0, pendingTasks: 0, monthlyAttendance: 0 });
      }

      case "getRecentActivities": {
        if (supabase) {
          const { data: recentUsers } = await supabase.from('users').select('name, created_at, id').order('created_at', { ascending: false }).limit(5);
          const { data: recentTasks } = await supabase.from('user_tasks').select('id, completed_at, users(name), tasks(title)').order('completed_at', { ascending: false }).limit(5);
          const formattedUsers = (recentUsers || []).map(u => ({ type: 'user_registered', title: u.name, date: u.created_at, id: u.id }));
          const formattedTasks = (recentTasks || []).map((ut: any) => ({ type: 'task_completed', title: `${ut.users?.name} completou ${ut.tasks?.title}`, date: ut.completed_at, id: ut.id }));
          const combined = [...formattedUsers, ...formattedTasks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
          return res.json(combined);
        }
        if (db) {
          const recentUsers = db.prepare("SELECT 'user_registered' as type, name as title, created_at as date, id FROM users ORDER BY created_at DESC LIMIT 5").all();
          const recentTasks = db.prepare("SELECT 'task_completed' as type, u.name || ' completou ' || t.title as title, ut.completed_at as date, ut.id FROM user_tasks ut JOIN users u ON ut.user_id = u.id JOIN tasks t ON ut.task_id = t.id ORDER BY ut.completed_at DESC LIMIT 5").all();
          const combined = [...recentUsers, ...recentTasks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
          return res.json(combined);
        }
        return res.json([]);
      }

      // --- SESSIONS ---
      case "getSessions": {
        if (supabase) {
          const { data, error } = await supabase.from('attendance_sessions').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          return res.json(data || []);
        }
        if (db) {
          return res.json(db.prepare("SELECT * FROM attendance_sessions ORDER BY created_at DESC").all());
        }
        return res.json([]);
      }

      case "createSession": {
        const { event_type, points, code, max_checkins } = body;
        if (!event_type || !code) return res.status(400).json({ error: "Event type and code required" });
        let lastId: any = Date.now();
        if (supabase) {
          const { data, error } = await supabase.from('attendance_sessions').insert([{ event_type, points: Number(points) || 10, code, max_checkins: max_checkins || null }]).select().single();
          if (error) throw error;
          if (data) lastId = data.id;
        }
        if (db) {
          const result = db.prepare("INSERT INTO attendance_sessions (event_type, points, code, max_checkins) VALUES (?, ?, ?, ?)").run(event_type, Number(points) || 10, code, max_checkins || null);
          if (!supabase) lastId = result.lastInsertRowid;
        }
        return res.json({ id: lastId, success: true });
      }

      case "deleteSession": {
        const { id } = query;
        if (!id) return res.status(400).json({ error: "ID required" });
        if (supabase) {
          await supabase.from('attendances').delete().eq('session_id', id);
          const { error } = await supabase.from('attendance_sessions').delete().eq('id', id);
          if (error) throw error;
        }
        if (db) {
          db.transaction(() => {
            db.prepare("DELETE FROM attendances WHERE session_id = ?").run(id);
            db.prepare("DELETE FROM attendance_sessions WHERE id = ?").run(id);
          })();
        }
        return res.json({ success: true });
      }

      // --- SETTINGS ---
      case "getSettings": {
        const { key } = query;
        if (!key) return res.status(400).json({ error: 'Key required' });
        if (supabase) {
          const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
          if (!error && data) return res.json({ value: data.value });
        }
        if (db) {
          const setting = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
          return res.json({ value: setting?.value || null });
        }
        return res.json({ value: null });
      }

      case "updateSettings": {
        const { key, value } = body;
        if (!key) return res.status(400).json({ error: 'Key required' });
        if (supabase) {
          const { error } = await supabase.from('app_settings').upsert({ key, value });
          if (error) throw error;
        }
        if (db) {
          db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, value);
        }
        return res.json({ success: true });
      }

      // --- BIRTHDAYS ---
      case "getBirthdays": {
        const today = new Date();
        const monthDay = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        const year = today.getFullYear();
        if (supabase) {
          const { data: allUsers, error } = await supabase.from('users').select('*');
          if (error) throw error;
          const users = (allUsers || []).filter((u: any) => u.birth_date?.endsWith(`-${monthDay}`));
          const results = await Promise.all(users.map(async (user: any) => {
            const { data: event } = await supabase.from('birthday_events').select('*').eq('user_id', user.id).eq('year', year).maybeSingle();
            const { data: msgData } = await supabase.from('birthday_messages').select('*, sender:users!sender_user_id(name, avatar)').eq('birthday_user_id', user.id).order('created_at', { ascending: false });
            return { ...user, age: calculateAge(user.birth_date), event, messages: (msgData || []).map((m: any) => ({ ...m, sender_name: m.sender?.name, sender_avatar: m.sender?.avatar })) };
          }));
          return res.json(results);
        }
        if (db) {
          const users = db.prepare("SELECT * FROM users WHERE birth_date LIKE ?").all(`%-${monthDay}`);
          return res.json(users.map((user: any) => {
            const event = db.prepare("SELECT * FROM birthday_events WHERE user_id = ? AND year = ?").get(user.id, year);
            const messages = db.prepare("SELECT m.*, u.name as sender_name, u.avatar as sender_avatar FROM birthday_messages m JOIN users u ON m.sender_user_id = u.id WHERE m.birthday_user_id = ? ORDER BY m.created_at DESC").all(user.id);
            return { ...user, age: calculateAge(user.birth_date), event, messages };
          }));
        }
        return res.json([]);
      }

      case "postBirthdayMessage": {
        const { birthdayUserId, senderId, message } = body;
        if (supabase) {
          await supabase.from('birthday_messages').insert({ birthday_user_id: birthdayUserId, sender_user_id: senderId, message });
          await addPoints(senderId, 3);
        }
        if (db) {
          db.prepare("INSERT INTO birthday_messages (birthday_user_id, sender_user_id, message) VALUES (?, ?, ?)").run(birthdayUserId, senderId, message);
          await addPoints(senderId, 3);
        }
        return res.json({ success: true });
      }

      // --- ACTIVITIES ---
      case "checkIn": {
        const { userId, code } = body;
        let session;
        if (supabase) {
          const { data, error } = await supabase.from('attendance_sessions').select('*').eq('code', code).eq('is_active', true).single();
          if (!error) session = data;
        }
        if (!session && db) session = db.prepare("SELECT * FROM attendance_sessions WHERE code = ? AND is_active = 1").get(code);
        if (!session) return res.status(400).json({ error: "Código inválido ou expirado" });
        let existing;
        if (supabase) {
          const { data, error } = await supabase.from('attendances').select('id').eq('user_id', userId).eq('session_id', session.id).single();
          if (!error && data) existing = data;
        }
        if (!existing && db) existing = db.prepare("SELECT id FROM attendances WHERE user_id = ? AND session_id = ?").get(userId, session.id);
        if (existing) return res.status(400).json({ error: "Você já registrou presença para este evento" });
        if (supabase) await supabase.from('attendances').insert([{ user_id: userId, session_id: session.id }]);
        if (db) db.prepare("INSERT INTO attendances (user_id, session_id) VALUES (?, ?)").run(userId, session.id);
        await addPoints(userId, session.points);
        return res.json({ success: true, points: session.points });
      }

      case "submitQuiz": {
        const { userId, isCorrect } = body;
        if (isCorrect) await addPoints(userId, 5);
        return res.json({ success: true, points: isCorrect ? 5 : 0 });
      }

      case "waterTree": {
        const { treeId, userId } = body;
        let tree;
        if (supabase) {
          const { data, error } = await supabase.from('user_trees').select('*').eq('id', treeId).single();
          if (!error) tree = data;
        }
        if (!tree && db) tree = db.prepare("SELECT * FROM user_trees WHERE id = ?").get(treeId);
        if (!tree) return res.status(404).json({ error: "Árvore não encontrada" });
        const newProgress = tree.progress + 20;
        let newStatus = tree.status;
        if (newProgress >= 100) {
          if (tree.status === 'seedling') newStatus = 'growing';
          else if (tree.status === 'growing') newStatus = 'mature';
        }
        const finalProgress = newProgress >= 100 ? 0 : newProgress;
        if (supabase) await supabase.from('user_trees').update({ progress: finalProgress, status: newStatus, last_watered: new Date().toISOString() }).eq('id', treeId);
        if (db) db.prepare("UPDATE user_trees SET progress = ?, status = ?, last_watered = CURRENT_TIMESTAMP WHERE id = ?").run(finalProgress, newStatus, treeId);
        await addPoints(userId, 2);
        return res.json({ success: true, points: 2 });
      }

      case "plantTree": {
        const { userId, treeTypeId } = body;
        if (supabase) {
          const { data, error } = await supabase.from('user_trees').insert([{ user_id: userId, tree_type_id: treeTypeId, status: 'seedling', progress: 0 }]).select().single();
          if (!error) return res.json(data);
        }
        if (db) {
          const result = db.prepare("INSERT INTO user_trees (user_id, tree_type_id, status, progress) VALUES (?, ?, ?, ?)").run(userId, treeTypeId, 'seedling', 0);
          return res.json({ id: result.lastInsertRowid });
        }
        return res.json({ error: "Failed to plant tree" });
      }

      case "getTreeTypes": {
        if (supabase) {
          const { data, error } = await supabase.from('tree_types').select('*');
          if (!error) return res.json(data);
        }
        if (db) return res.json(db.prepare("SELECT * FROM tree_types").all());
        return res.json([]);
      }

      case "getUserTrees": {
        const { userId } = query;
        if (supabase) {
          const { data, error } = await supabase.from('user_trees').select('*, tree_types(*)').eq('user_id', userId);
          if (!error) return res.json(data.map((ut: any) => ({ ...ut, name: ut.tree_types?.name, image_url: ut.tree_types?.image_url })));
        }
        if (db) return res.json(db.prepare("SELECT ut.*, tt.name, tt.image_url FROM user_trees ut JOIN tree_types tt ON ut.tree_type_id = tt.id WHERE ut.user_id = ?").all(userId));
        return res.json([]);
      }

      case "recordGamePlay": {
        const { userId, gameId } = body;
        const today = new Date().toISOString().split('T')[0];
        if (db) {
          const play = db.prepare("SELECT id, count FROM game_plays WHERE user_id = ? AND game_id = ? AND date = ?").get(userId, gameId, today);
          if (play) {
            db.prepare("UPDATE game_plays SET count = count + 1 WHERE id = ?").run(play.id);
            return res.json({ success: true, count: play.count + 1 });
          } else {
            db.prepare("INSERT INTO game_plays (user_id, game_id, date, count) VALUES (?, ?, ?, ?)").run(userId, gameId, today, 1);
            return res.json({ success: true, count: 1 });
          }
        }
        return res.json({ success: true, count: 1 });
      }

      case "getGamePlays": {
        const { userId, gameId } = query;
        const today = new Date().toISOString().split('T')[0];
        if (db) {
          const play = db.prepare("SELECT count FROM game_plays WHERE user_id = ? AND game_id = ? AND date = ?").get(userId, gameId, today);
          return res.json({ count: play ? play.count : 0 });
        }
        return res.json({ count: 0 });
      }

      // --- BIBLE ---
      case "getBooks": {
        const isAdmin = query.isAdmin === 'true';
        if (supabase) {
          let q = supabase.from('bible_books').select('*').order('order_index');
          if (!isAdmin) q = q.eq('is_released', 1);
          const { data, error } = await q;
          if (!error) return res.json(data);
        }
        if (db) {
          const q = isAdmin ? "SELECT * FROM bible_books ORDER BY order_index" : "SELECT * FROM bible_books WHERE is_released = 1 ORDER BY order_index";
          return res.json(db.prepare(q).all());
        }
        return res.json([]);
      }

      case "getChapters": {
        const { bookId } = query;
        if (supabase) {
          const { data, error } = await supabase.from('bible_chapters').select('id, chapter_number, title').eq('book_id', bookId).order('chapter_number');
          if (!error) return res.json(data);
        }
        if (db) return res.json(db.prepare("SELECT id, chapter_number, title FROM bible_chapters WHERE book_id = ? ORDER BY chapter_number").all(bookId));
        return res.json([]);
      }

      case "getChapterContent": {
        const { chapterId } = query;
        if (supabase) {
          const { data, error } = await supabase.from('bible_chapters').select('*, bible_books(name)').eq('id', chapterId).single();
          if (!error) return res.json(data);
        }
        if (db) return res.json(db.prepare("SELECT bc.*, bb.name as book_name FROM bible_chapters bc JOIN bible_books bb ON bc.book_id = bb.id WHERE bc.id = ?").get(chapterId));
        return res.json(null);
      }

      case "markChapterAsRead": {
        const { userId, chapterId } = body;
        const today = new Date().toISOString().split('T')[0];
        let alreadyReadToday = false;
        if (supabase) {
          const { data } = await supabase.from('user_bible_readings').select('id').eq('user_id', userId).eq('read_at', today).maybeSingle();
          if (data) alreadyReadToday = true;
        } else if (db) {
          const result = db.prepare("SELECT id FROM user_bible_readings WHERE user_id = ? AND read_at = ?").get(userId, today);
          if (result) alreadyReadToday = true;
        }
        if (alreadyReadToday) return res.status(400).json({ error: "Você já leu um capítulo hoje. Volte amanhã para ganhar mais pontos!" });
        let chapterAlreadyRead = false;
        if (supabase) {
          const { data } = await supabase.from('user_bible_readings').select('id').eq('user_id', userId).eq('chapter_id', chapterId).maybeSingle();
          if (data) chapterAlreadyRead = true;
        } else if (db) {
          const result = db.prepare("SELECT id FROM user_bible_readings WHERE user_id = ? AND chapter_id = ?").get(userId, chapterId);
          if (result) chapterAlreadyRead = true;
        }
        let pointsAwarded = 0;
        if (!chapterAlreadyRead) {
          pointsAwarded = 50;
          await addPoints(userId, pointsAwarded);
        }
        if (db) db.prepare("INSERT INTO user_bible_readings (user_id, chapter_id, read_at, points_awarded) VALUES (?, ?, ?, ?)").run(userId, chapterId, today, pointsAwarded);
        if (supabase) await supabase.from('user_bible_readings').insert([{ user_id: userId, chapter_id: chapterId, read_at: today, points_awarded: pointsAwarded }]);
        return res.json({ success: true, pointsAwarded });
      }

      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (err: any) {
    console.error(`API Error in action ${action}:`, err);
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
}
