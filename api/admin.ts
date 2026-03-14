import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { id, stats, pending, verify, users, teams, tasks, sessions, recent, birthdays, createSession, settings } = query;

  if (method === 'GET') {
    if (settings) {
      const { key } = query;
      if (!key) return res.status(400).json({ error: 'Key is required' });
      if (supabase) {
        const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).single();
        if (!error && data) return res.json({ value: data.value });
      }
      if (db) {
        const setting = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
        return res.json({ value: setting?.value || null });
      }
      return res.json({ value: null });
    }

    if (birthdays && id) {
      const year = new Date().getFullYear();
      if (supabase) {
        const { data } = await supabase.from('birthday_events').select('*').eq('user_id', id).eq('year', year).maybeSingle();
        return res.json(data || {});
      }
      if (db) {
        const event = db.prepare("SELECT * FROM birthday_events WHERE user_id = ? AND year = ?").get(id, year);
        return res.json(event || {});
      }
    }

    if (stats) {
      if (supabase) {
        const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: activeTeams } = await supabase.from('teams').select('*', { count: 'exact', head: true });
        const { count: pendingTasks } = await supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: monthlyAttendance } = await supabase.from('attendances').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        return res.json({ totalUsers: totalUsers || 0, activeTeams: activeTeams || 0, pendingTasks: pendingTasks || 0, monthlyAttendance: monthlyAttendance || 0 });
      }
      if (db) {
        const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
        const activeTeams = db.prepare("SELECT COUNT(*) as count FROM teams").get().count;
        const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM user_tasks WHERE status = 'pending'").get().count;
        const monthlyAttendance = db.prepare("SELECT COUNT(*) as count FROM attendances WHERE created_at >= date('now', '-30 days')").get().count;
        return res.json({ totalUsers, activeTeams, pendingTasks, monthlyAttendance });
      }
    }

    if (pending) {
      if (supabase) {
        const { data, error } = await supabase
          .from('user_tasks')
          .select(`
            *,
            users (name),
            tasks (title, points)
          `)
          .eq('status', 'pending');
        if (!error) {
          const formatted = data.map(p => ({
            ...p,
            user_name: p.users?.name,
            task_title: p.tasks?.title,
            task_points: p.tasks?.points
          }));
          return res.json(formatted);
        }
      }
      if (db) {
        const data = db.prepare("SELECT ut.*, u.name as user_name, t.title as task_title, t.points as task_points FROM user_tasks ut JOIN users u ON ut.user_id = u.id JOIN tasks t ON ut.task_id = t.id WHERE ut.status = 'pending'").all();
        return res.json(data);
      }
    }

    if (users) {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*, teams(name)').order('points', { ascending: false });
        if (!error) return res.json(data.map(u => ({ ...u, team_name: u.teams?.name || null })));
      }
      if (db) {
        const users = db.prepare("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id ORDER BY u.points DESC").all();
        return res.json(users);
      }
    }

    if (teams) {
      if (supabase) {
        const { data, error } = await supabase.from('teams').select('*').order('total_points', { ascending: false });
        if (!error) return res.json(data);
      }
      if (db) {
        const teams = db.prepare("SELECT t.*, (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count FROM teams t ORDER BY t.total_points DESC").all();
        return res.json(teams);
      }
    }

    if (tasks) {
      if (supabase) {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (!error) return res.json(data);
      }
      if (db) {
        const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
        return res.json(tasks);
      }
    }

    if (sessions) {
      if (supabase) {
        const { data, error } = await supabase.from('attendance_sessions').select('*').order('created_at', { ascending: false });
        if (!error) return res.json(data);
      }
      if (db) {
        const sessions = db.prepare("SELECT * FROM attendance_sessions ORDER BY created_at DESC").all();
        return res.json(sessions);
      }
    }

    if (recent) {
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
    }
  }

  if (method === 'POST') {
    if (settings) {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'Key and value are required' });
      if (supabase) await supabase.from('app_settings').upsert({ key, value });
      if (db) db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, value);
      return res.json({ success: true });
    }

    if (verify) {
      const { userTaskId, status, points, userId } = req.body;
      if (supabase) {
        await supabase.from('user_tasks').update({ status, verified_at: new Date().toISOString() }).eq('id', userTaskId);
        if (status === 'verified') await addPoints(userId, points);
      }
      if (db) {
        db.prepare("UPDATE user_tasks SET status = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, userTaskId);
        if (status === 'verified') await addPoints(userId, points);
      }
      return res.json({ success: true });
    }

    if (users) {
      const { name, email, password, role, team_id, bulk } = req.body;
      if (bulk && Array.isArray(req.body.users)) {
        if (supabase) {
          await supabase.from('users').insert(req.body.users);
        }
        if (db) {
          const insert = db.prepare("INSERT INTO users (name, email, password, role, team_id, points, level) VALUES (?, ?, ?, ?, ?, ?, ?)");
          const insertMany = db.transaction((users) => {
            for (const user of users) {
              insert.run(user.name, user.email, user.password, user.role || "user", user.team_id || null, user.points || 0, user.level || 1);
            }
          });
          insertMany(req.body.users);
        }
        return res.json({ success: true, count: req.body.users.length });
      } else {
        const hashedPassword = await bcrypt.hash(password || "user123", 10);
        let lastId = Date.now();
        if (supabase) {
          const { data } = await supabase.from('users').insert([{ name, email, password: hashedPassword, role: role || 'user', team_id: team_id || null }]).select().single();
          if (data) lastId = data.id;
        }
        if (db) {
          const result = db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run(name, email, hashedPassword, role || 'user', team_id || null);
          if (!supabase) lastId = result.lastInsertRowid;
        }
        return res.json({ id: lastId });
      }
    }

    if (teams) {
      const { name, color, description, leader_id } = req.body;
      let lastId = Date.now();
      if (supabase) {
        const { data } = await supabase.from('teams').insert([{ name, color, description, leader_id: leader_id || null }]).select().single();
        if (data) lastId = data.id;
      }
      if (db) {
        const result = db.prepare("INSERT INTO teams (name, color, description, leader_id) VALUES (?, ?, ?, ?)").run(name, color, description, leader_id || null);
        if (!supabase) lastId = result.lastInsertRowid;
      }
      return res.json({ id: lastId });
    }

    if (tasks) {
      const { title, description, points, category, type, is_recurring, deadline } = req.body;
      let lastId = Date.now();
      if (supabase) {
        const { data } = await supabase.from('tasks').insert([{ title, description, points, category, type, is_recurring: is_recurring || null, deadline: deadline || null }]).select().single();
        if (data) lastId = data.id;
      }
      if (db) {
        const result = db.prepare("INSERT INTO tasks (title, description, points, category, type, is_recurring, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)").run(title, description, points, category, type, is_recurring || null, deadline || null);
        if (!supabase) lastId = result.lastInsertRowid;
      }
      return res.json({ id: lastId });
    }

    if (query.createSession) {
      const { event_type, points, code, max_checkins } = req.body;
      let lastId = Date.now();
      if (supabase) {
        const { data } = await supabase.from('attendance_sessions').insert([{ event_type, points, code, max_checkins: max_checkins || null }]).select().single();
        if (data) lastId = data.id;
      }
      if (db) {
        const result = db.prepare("INSERT INTO attendance_sessions (event_type, points, code, max_checkins) VALUES (?, ?, ?, ?)").run(event_type, points, code, max_checkins || null);
        if (!supabase) lastId = result.lastInsertRowid;
      }
      return res.json({ id: lastId });
    }

    if (birthdays) {
      const { userId, adminMessage, imageUrl } = req.body;
      const year = new Date().getFullYear();
      if (supabase) {
        const { data: existing } = await supabase.from('birthday_events').select('*').eq('user_id', userId).eq('year', year).maybeSingle();
        if (existing) {
          await supabase.from('birthday_events').update({ admin_message: adminMessage, image_url: imageUrl }).eq('id', existing.id);
        } else {
          await supabase.from('birthday_events').insert({ user_id: userId, admin_message: adminMessage, image_url: imageUrl, year });
        }
      }
      if (db) {
        const existing = db.prepare("SELECT * FROM birthday_events WHERE user_id = ? AND year = ?").get(userId, year);
        if (existing) {
          db.prepare("UPDATE birthday_events SET admin_message = ?, image_url = ? WHERE id = ?").run(adminMessage, imageUrl, existing.id);
        } else {
          db.prepare("INSERT INTO birthday_events (user_id, admin_message, image_url, year) VALUES (?, ?, ?, ?)").run(userId, adminMessage, imageUrl, year);
        }
      }
      return res.json({ success: true });
    }
  }

  if (method === 'PUT' && id) {
    if (users) {
      const { name, email, password, role, team_id, points, level, streak } = req.body;
      let hashedPassword = password;
      if (password && !password.startsWith('$2a$') && !password.startsWith('$2b$')) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      if (supabase) {
        const updateData: any = { name, email, role, team_id, points, level, streak };
        if (hashedPassword) updateData.password = hashedPassword;
        await supabase.from('users').update(updateData).eq('id', id);
      }
      if (db) {
        if (hashedPassword) {
          db.prepare("UPDATE users SET name = ?, email = ?, password = ?, role = ?, team_id = ?, points = ?, level = ?, streak = ? WHERE id = ?").run(name, email, hashedPassword, role, team_id, points, level, streak, id);
        } else {
          db.prepare("UPDATE users SET name = ?, email = ?, role = ?, team_id = ?, points = ?, level = ?, streak = ? WHERE id = ?").run(name, email, role, team_id, points, level, streak, id);
        }
      }
      return res.json({ success: true });
    }

    if (teams) {
      const { name, color, description, leader_id, total_points } = req.body;
      if (supabase) {
        await supabase.from('teams').update({ name, color, description, leader_id: leader_id || null, total_points: total_points || 0 }).eq('id', id);
      }
      if (db) {
        db.prepare("UPDATE teams SET name = ?, color = ?, description = ?, leader_id = ?, total_points = ? WHERE id = ?").run(name, color, description, leader_id || null, total_points || 0, id);
      }
      return res.json({ success: true });
    }

    if (tasks) {
      const { title, description, points, category, type, is_active, is_recurring, deadline } = req.body;
      if (supabase) {
        await supabase.from('tasks').update({ title, description, points, category, type, is_active, is_recurring: is_recurring || null, deadline: deadline || null }).eq('id', id);
      }
      if (db) {
        db.prepare("UPDATE tasks SET title = ?, description = ?, points = ?, category = ?, type = ?, is_active = ?, is_recurring = ?, deadline = ? WHERE id = ?").run(title, description, points, category, type, is_active, is_recurring || null, deadline || null, id);
      }
      return res.json({ success: true });
    }
  }

  if (method === 'DELETE' && id) {
    if (users) {
      if (supabase) {
        await supabase.from('user_tasks').delete().eq('user_id', id);
        await supabase.from('attendances').delete().eq('user_id', id);
        await supabase.from('users').delete().eq('id', id);
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

    if (teams) {
      if (supabase) {
        await supabase.from('users').update({ team_id: null }).eq('team_id', id);
        await supabase.from('teams').delete().eq('id', id);
      }
      if (db) {
        db.transaction(() => {
          db.prepare("UPDATE users SET team_id = NULL WHERE team_id = ?").run(id);
          db.prepare("DELETE FROM teams WHERE id = ?").run(id);
        })();
      }
      return res.json({ success: true });
    }

    if (tasks) {
      if (supabase) {
        await supabase.from('user_tasks').delete().eq('task_id', id);
        await supabase.from('tasks').delete().eq('id', id);
      }
      if (db) {
        db.transaction(() => {
          db.prepare("DELETE FROM user_tasks WHERE task_id = ?").run(id);
          db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
        })();
      }
      return res.json({ success: true });
    }

    if (sessions) {
      if (supabase) {
        await supabase.from('attendances').delete().eq('session_id', id);
        await supabase.from('attendance_sessions').delete().eq('id', id);
      }
      if (db) {
        db.transaction(() => {
          db.prepare("DELETE FROM attendances WHERE session_id = ?").run(id);
          db.prepare("DELETE FROM attendance_sessions WHERE id = ?").run(id);
        })();
      }
      return res.json({ success: true });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
