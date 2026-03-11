import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { id, stats, pending, verify, users, teams, tasks, sessions, recent } = query;

  if (method === 'GET') {
    if (stats) {
      if (supabase) {
        const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: activeTeams } = await supabase.from('teams').select('*', { count: 'exact', head: true });
        const { count: pendingTasks } = await supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: monthlyAttendance } = await supabase.from('attendances').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        return res.json({ totalUsers, activeTeams, pendingTasks, monthlyAttendance });
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
          .select('*, users(name), tasks(title, points)')
          .eq('status', 'pending');
        if (error) {
          console.error("Supabase error fetching pending tasks:", error);
        } else if (data && data.length > 0) {
          const formatted = data.map((d: any) => ({
            ...d,
            user_name: Array.isArray(d.users) ? d.users[0]?.name : d.users?.name,
            task_title: Array.isArray(d.tasks) ? d.tasks[0]?.title : d.tasks?.title,
            points: Array.isArray(d.tasks) ? d.tasks[0]?.points : d.tasks?.points
          }));
          return res.json(formatted);
        }
      }
      if (db) {
        try {
          const data = db.prepare("SELECT ut.*, u.name as user_name, t.title as task_title, t.points as task_points FROM user_tasks ut JOIN users u ON ut.user_id = u.id JOIN tasks t ON ut.task_id = t.id WHERE ut.status = 'pending'").all();
          return res.json(data);
        } catch (e) {
          console.error("SQLite error fetching pending tasks:", e);
        }
      }
      return res.json([]);
    }

    if (users) {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*, teams(name)').order('points', { ascending: false });
        if (error) {
          console.error("Supabase error fetching admin users:", error);
        } else if (data && data.length > 0) {
          const formatted = data.map((u: any) => ({ ...u, team_name: Array.isArray(u.teams) ? u.teams[0]?.name : u.teams?.name }));
          return res.json(formatted);
        }
      }
      if (db) {
        try {
          const users = db.prepare("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id ORDER BY u.points DESC").all();
          return res.json(users);
        } catch (e) {
          console.error("SQLite error fetching admin users:", e);
        }
      }
      return res.json([]);
    }

    if (teams) {
      if (supabase) {
        const { data, error } = await supabase.from('teams').select('*, users(count)').order('total_points', { ascending: false });
        if (error) {
          console.error("Supabase error fetching admin teams:", error);
        } else if (data && data.length > 0) {
          const formatted = data.map((t: any) => ({ ...t, member_count: Array.isArray(t.users) ? t.users[0]?.count : t.users?.count || 0 }));
          return res.json(formatted);
        }
      }
      if (db) {
        try {
          const teams = db.prepare("SELECT t.*, (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count FROM teams t ORDER BY t.total_points DESC").all();
          return res.json(teams);
        } catch (e) {
          console.error("SQLite error fetching admin teams:", e);
        }
      }
      return res.json([]);
    }

    if (tasks) {
      if (supabase) {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) {
          console.error("Supabase error fetching admin tasks:", error);
        } else if (data && data.length > 0) {
          return res.json(data);
        }
      }
      if (db) {
        try {
          const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
          return res.json(tasks);
        } catch (e) {
          console.error("SQLite error fetching admin tasks:", e);
        }
      }
      return res.json([]);
    }

    if (sessions) {
      if (db) {
        const sessions = db.prepare("SELECT * FROM attendance_sessions ORDER BY created_at DESC").all();
        return res.json(sessions);
      }
    }

    if (recent) {
      if (supabase) {
        const { data: recentUsers } = await supabase.from('users').select('id, name, created_at').order('created_at', { ascending: false }).limit(5);
        const { data: recentTasks } = await supabase.from('user_tasks').select('id, completed_at, users(name), tasks(title)').order('completed_at', { ascending: false }).limit(5);
        
        const usersFormatted = (recentUsers || []).map(u => ({ type: 'user_registered', title: u.name, date: u.created_at, id: u.id }));
        const tasksFormatted = (recentTasks || []).map((ut: any) => {
          const userName = Array.isArray(ut.users) ? ut.users[0]?.name : ut.users?.name;
          const taskTitle = Array.isArray(ut.tasks) ? ut.tasks[0]?.title : ut.tasks?.title;
          return { 
            type: 'task_completed', 
            title: `${userName || 'Usuário'} completou ${taskTitle || 'Tarefa'}`, 
            date: ut.completed_at, 
            id: ut.id 
          };
        });
        
        const combined = [...usersFormatted, ...tasksFormatted].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
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
    if (verify) {
      const userTaskId = id || req.body.userTaskId;
      const { status, points, userId } = req.body;
      
      if (supabase) {
        await supabase.from('user_tasks').update({ status, verified_at: new Date().toISOString() }).eq('id', userTaskId);
        if (status === 'verified') await addPoints(userId, points);
      }
      if (db) {
        db.prepare("UPDATE user_tasks SET status = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, userTaskId);
        if (status === 'verified' && !supabase) await addPoints(userId, points);
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
        let newId: any;
        if (supabase) {
          const { data, error } = await supabase.from('users').insert([{ name, email, password: hashedPassword, role: role || 'user', team_id: team_id || null }]).select();
          if (!error && data) newId = data[0].id;
        }
        if (db) {
          const result = db.prepare("INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, ?)").run(name, email, hashedPassword, role || 'user', team_id || null);
          if (!newId) newId = result.lastInsertRowid;
        }
        return res.json({ id: newId });
      }
    }

    if (teams) {
      const { name, color, description, leader_id } = req.body;
      let newId: any;
      if (supabase) {
        const { data, error } = await supabase.from('teams').insert([{ name, color, description, leader_id: leader_id || null }]).select();
        if (!error && data) newId = data[0].id;
      }
      if (db) {
        const result = db.prepare("INSERT INTO teams (name, color, description, leader_id) VALUES (?, ?, ?, ?)").run(name, color, description, leader_id || null);
        if (!newId) newId = result.lastInsertRowid;
      }
      return res.json({ id: newId });
    }

    if (tasks) {
      const { title, description, points, category, type, is_recurring, deadline } = req.body;
      let newId: any;
      if (supabase) {
        const { data, error } = await supabase.from('tasks').insert([{ title, description, points, category, type, is_recurring: is_recurring || null, deadline: deadline || null }]).select();
        if (!error && data) newId = data[0].id;
      }
      if (db) {
        const result = db.prepare("INSERT INTO tasks (title, description, points, category, type, is_recurring, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)").run(title, description, points, category, type, is_recurring || null, deadline || null);
        if (!newId) newId = result.lastInsertRowid;
      }
      return res.json({ id: newId });
    }

    if (query.createSession) {
      const { event_type, points, code, max_checkins } = req.body;
      let newId: any;
      if (supabase) {
        const { data, error } = await supabase.from('attendance_sessions').insert([{ event_type, points, code, max_checkins: max_checkins || null }]).select();
        if (!error && data) newId = data[0].id;
      }
      if (db) {
        const result = db.prepare("INSERT INTO attendance_sessions (event_type, points, code, max_checkins) VALUES (?, ?, ?, ?)").run(event_type, points, code, max_checkins || null);
        if (!newId) newId = result.lastInsertRowid;
      }
      return res.json({ id: newId });
    }
  }

  if (method === 'PUT' && id) {
    if (users) {
      const { name, email, password, role, team_id, points, level, streak } = req.body;
      if (db) {
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          db.prepare("UPDATE users SET name = ?, email = ?, password = ?, role = ?, team_id = ?, points = ?, level = ?, streak = ? WHERE id = ?").run(name, email, hashedPassword, role, team_id, points, level, streak, id);
        } else {
          db.prepare("UPDATE users SET name = ?, email = ?, role = ?, team_id = ?, points = ?, level = ?, streak = ? WHERE id = ?").run(name, email, role, team_id, points, level, streak, id);
        }
        return res.json({ success: true });
      }
    }

    if (teams) {
      const { name, color, description, leader_id, total_points } = req.body;
      if (db) {
        db.prepare("UPDATE teams SET name = ?, color = ?, description = ?, leader_id = ?, total_points = ? WHERE id = ?").run(name, color, description, leader_id || null, total_points || 0, id);
        return res.json({ success: true });
      }
    }

    if (tasks) {
      const { title, description, points, category, type, is_active, is_recurring, deadline } = req.body;
      if (db) {
        db.prepare("UPDATE tasks SET title = ?, description = ?, points = ?, category = ?, type = ?, is_active = ?, is_recurring = ?, deadline = ? WHERE id = ?").run(title, description, points, category, type, is_active, is_recurring || null, deadline || null, id);
        return res.json({ success: true });
      }
    }
  }

  if (method === 'DELETE' && id) {
    if (users) {
      if (db) {
        db.transaction(() => {
          db.prepare("DELETE FROM user_tasks WHERE user_id = ?").run(id);
          db.prepare("DELETE FROM attendances WHERE user_id = ?").run(id);
          db.prepare("DELETE FROM users WHERE id = ?").run(id);
        })();
        return res.json({ success: true });
      }
    }

    if (teams) {
      if (db) {
        db.transaction(() => {
          db.prepare("UPDATE users SET team_id = NULL WHERE team_id = ?").run(id);
          db.prepare("DELETE FROM teams WHERE id = ?").run(id);
        })();
        return res.json({ success: true });
      }
    }

    if (tasks) {
      if (db) {
        db.transaction(() => {
          db.prepare("DELETE FROM user_tasks WHERE task_id = ?").run(id);
          db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
        })();
        return res.json({ success: true });
      }
    }

    if (sessions) {
      if (db) {
        db.transaction(() => {
          db.prepare("DELETE FROM attendances WHERE session_id = ?").run(id);
          db.prepare("DELETE FROM attendance_sessions WHERE id = ?").run(id);
        })();
        return res.json({ success: true });
      }
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
