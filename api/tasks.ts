import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { complete } = query;

  if (method === 'GET') {
    if (db) {
      const tasks = db.prepare("SELECT * FROM tasks WHERE is_active = 1").all();
      return res.json(tasks);
    }
  }

  if (method === 'POST' && complete) {
    const { userId, taskId, proofUrl } = req.body;
    if (db) {
      db.prepare("INSERT INTO user_tasks (user_id, task_id, proof_url, status) VALUES (?, ?, ?, ?)").run(userId, taskId, proofUrl, 'pending');
      return res.json({ success: true, message: "Tarefa enviada para verificação!" });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
