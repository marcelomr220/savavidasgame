import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { daily, submit } = query;

  if (method === 'GET' && daily) {
    if (supabase) {
      const { data, error } = await supabase.from('biblical_questions').select('*');
      if (!error && data.length > 0) return res.json(data[Math.floor(Math.random() * data.length)]);
    }
    if (db) {
      const questions = db.prepare("SELECT * FROM biblical_questions ORDER BY RANDOM() LIMIT 1").all();
      return res.json(questions[0]);
    }
  }

  if (method === 'POST' && submit) {
    const { userId, questionId, answerIndex, isCorrect } = req.body;
    if (isCorrect) {
      await addPoints(userId, 5);
      return res.json({ success: true, points: 5 });
    }
    return res.json({ success: true, points: 0 });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
