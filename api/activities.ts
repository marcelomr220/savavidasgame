import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const { 
    checkin, 
    plays, recordPlay, 
    daily, submit: quizSubmit,
    userId: treeUserId, plant, water, types: treeTypes,
    tasks: isTasksRequest, complete: isTaskComplete
  } = query;

  if (method === 'GET') {
    // TASKS LIST
    if (isTasksRequest || req.url?.includes('/tasks')) {
      if (supabase) {
        const { data, error } = await supabase.from('tasks').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (!error) return res.json(data);
      }
      if (db) {
        const tasks = db.prepare("SELECT * FROM tasks WHERE is_active = 1 ORDER BY created_at DESC").all();
        return res.json(tasks);
      }
    }

    // GAME PLAYS
    if (plays) {
      const { userId, gameId } = query;
      const today = new Date().toISOString().split('T')[0];
      if (db) {
        const play = db.prepare("SELECT count FROM game_plays WHERE user_id = ? AND game_id = ? AND date = ?").get(userId, gameId, today);
        return res.json({ count: play ? play.count : 0 });
      }
      return res.json({ count: 0 });
    }

    // DAILY QUIZ
    if (daily) {
      if (supabase) {
        const { data, error } = await supabase.from('biblical_questions').select('*');
        if (!error && data.length > 0) return res.json(data[Math.floor(Math.random() * data.length)]);
      }
      if (db) {
        const questions = db.prepare("SELECT * FROM biblical_questions ORDER BY RANDOM() LIMIT 1").all();
        return res.json(questions[0]);
      }
    }

    // TREE TYPES
    if (treeTypes) {
      if (supabase) {
        const { data, error } = await supabase.from('tree_types').select('*');
        if (!error) return res.json(data);
      }
      if (db) {
        const treeTypesList = db.prepare("SELECT * FROM tree_types").all();
        return res.json(treeTypesList);
      }
    }

    // USER TREES
    if (treeUserId) {
      if (supabase) {
        const { data, error } = await supabase.from('user_trees').select('*, tree_types(*)').eq('user_id', treeUserId);
        if (!error) return res.json(data.map((ut: any) => ({ ...ut, name: ut.tree_types?.name, image_url: ut.tree_types?.image_url })));
      }
      if (db) {
        const trees = db.prepare("SELECT ut.*, tt.name, tt.image_url FROM user_trees ut JOIN tree_types tt ON ut.tree_type_id = tt.id WHERE ut.user_id = ?").all(treeUserId);
        return res.json(trees);
      }
    }
  }

  if (method === 'POST') {
    // ATTENDANCE CHECKIN
    if (checkin || req.url?.includes('/attendance/checkin')) {
      const { userId, code } = body;
      let session;
      if (supabase) {
        const { data, error } = await supabase.from('attendance_sessions').select('*').eq('code', code).eq('is_active', true).single();
        if (!error) session = data;
      }
      if (!session && db) {
        session = db.prepare("SELECT * FROM attendance_sessions WHERE code = ? AND is_active = 1").get(code);
      }

      if (!session) return res.status(400).json({ error: "Código inválido ou expirado" });

      let existing;
      if (supabase) {
        const { data, error } = await supabase.from('attendances').select('id').eq('user_id', userId).eq('session_id', session.id).single();
        if (!error && data) existing = data;
      }
      if (!existing && db) {
        existing = db.prepare("SELECT id FROM attendances WHERE user_id = ? AND session_id = ?").get(userId, session.id);
      }

      if (existing) return res.status(400).json({ error: "Você já registrou presença para este evento" });

      if (supabase) await supabase.from('attendances').insert([{ user_id: userId, session_id: session.id }]);
      if (db) db.prepare("INSERT INTO attendances (user_id, session_id) VALUES (?, ?)").run(userId, session.id);
      
      await addPoints(userId, session.points);
      return res.json({ success: true, points: session.points });
    }

    // RECORD GAME PLAY
    if (recordPlay) {
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

    // QUIZ SUBMIT
    if (quizSubmit) {
      const { userId, isCorrect } = body;
      if (isCorrect) {
        await addPoints(userId, 5);
        return res.json({ success: true, points: 5 });
      }
      return res.json({ success: true, points: 0 });
    }

    // PLANT TREE
    if (plant) {
      const { userId, treeTypeId } = body;
      if (supabase) {
        const { data, error } = await supabase.from('user_trees').insert([{ user_id: userId, tree_type_id: treeTypeId, status: 'seedling', progress: 0 }]).select().single();
        if (!error) return res.json(data);
      }
      if (db) {
        const result = db.prepare("INSERT INTO user_trees (user_id, tree_type_id, status, progress) VALUES (?, ?, ?, ?)").run(userId, treeTypeId, 'seedling', 0);
        return res.json({ id: result.lastInsertRowid });
      }
    }

    // WATER TREE
    if (water) {
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

    // COMPLETE TASK
    if (isTaskComplete || req.url?.includes('/tasks/complete')) {
      const { userId, taskId, proofUrl } = body;
      if (supabase) {
        await supabase.from('user_tasks').insert([{ user_id: userId, task_id: taskId, proof_url: proofUrl, status: 'pending', completed_at: new Date().toISOString() }]);
      }
      if (db) {
        db.prepare("INSERT INTO user_tasks (user_id, task_id, proof_url, status, completed_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)").run(userId, taskId, proofUrl, 'pending');
      }
      return res.json({ success: true });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
