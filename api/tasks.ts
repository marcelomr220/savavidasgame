import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { complete } = query;

  try {
    if (method === 'GET') {
      if (supabase) {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (!error && tasks) {
          return res.json(tasks);
        }
      }
      
      if (db) {
        const tasks = db.prepare("SELECT * FROM tasks WHERE is_active = 1 ORDER BY created_at DESC").all();
        return res.json(tasks);
      }
      
      return res.json([]);
    }

    if (method === 'POST' && complete) {
      const { userId, taskId, proofUrl } = req.body;
      
      if (supabase) {
        const { error } = await supabase
          .from('user_tasks')
          .insert([{ user_id: userId, task_id: taskId, proof_url: proofUrl, status: 'pending' }]);
        
        if (!error) {
          if (db) {
            db.prepare("INSERT INTO user_tasks (user_id, task_id, proof_url, status) VALUES (?, ?, ?, ?)").run(userId, taskId, proofUrl, 'pending');
          }
          return res.json({ success: true, message: "Tarefa enviada para verificação!" });
        }
        return res.status(500).json({ error: error.message });
      }
      
      if (db) {
        db.prepare("INSERT INTO user_tasks (user_id, task_id, proof_url, status) VALUES (?, ?, ?, ?)").run(userId, taskId, proofUrl, 'pending');
        return res.json({ success: true, message: "Tarefa enviada para verificação!" });
      }
      
      return res.status(500).json({ error: "Database not available" });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error("API Tasks Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
