import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { id, members, join } = query;

  if (method === 'GET') {
    if (id && members) {
      if (db) {
        const membersList = db.prepare("SELECT id, name, avatar, points, level FROM users WHERE team_id = ? ORDER BY points DESC").all(id);
        return res.json(membersList);
      }
    } else {
      if (db) {
        const teams = db.prepare("SELECT * FROM teams ORDER BY total_points DESC").all();
        return res.json(teams);
      }
    }
  }

  if (method === 'POST' && join) {
    const { userId, teamId } = req.body;
    if (db) {
      db.prepare("UPDATE users SET team_id = ? WHERE id = ?").run(teamId, userId);
      return res.json({ success: true });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
