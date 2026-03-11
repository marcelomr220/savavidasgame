import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const { plays, recordPlay } = query;

  if (method === 'GET' && plays) {
    const { userId, gameId } = query;
    const today = new Date().toISOString().split('T')[0];

    if (!userId || !gameId) {
      return res.status(400).json({ error: "userId and gameId are required" });
    }

    if (db) {
      const play = db.prepare("SELECT count FROM game_plays WHERE user_id = ? AND game_id = ? AND date = ?").get(userId, gameId, today);
      return res.json({ count: play ? play.count : 0 });
    }
    return res.json({ count: 0 });
  }

  if (method === 'POST' && recordPlay) {
    const { userId, gameId } = body;
    const today = new Date().toISOString().split('T')[0];

    if (!userId || !gameId) {
      return res.status(400).json({ error: "userId and gameId are required" });
    }

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

  res.status(405).json({ error: 'Method not allowed' });
}
