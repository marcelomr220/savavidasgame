import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { checkin } = query;

  if (method === 'POST' && checkin) {
    const { userId, code } = req.body;
    if (db) {
      const session = db.prepare("SELECT * FROM attendance_sessions WHERE code = ? AND is_active = 1").get(code);
      if (!session) return res.status(400).json({ error: "Código inválido ou expirado" });

      const existing = db.prepare("SELECT id FROM attendances WHERE user_id = ? AND session_id = ?").get(userId, session.id);
      if (existing) return res.status(400).json({ error: "Você já registrou presença para este evento" });

      db.prepare("INSERT INTO attendances (user_id, session_id) VALUES (?, ?)").run(userId, session.id);
      await addPoints(userId, session.points);
      return res.json({ success: true, points: session.points });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
