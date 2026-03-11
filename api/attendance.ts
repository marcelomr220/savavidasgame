import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { checkin } = query;

  if (method === 'POST' && checkin) {
    const { userId, code } = req.body;
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

    if (supabase) {
      await supabase.from('attendances').insert([{ user_id: userId, session_id: session.id }]);
    }
    if (db) {
      db.prepare("INSERT INTO attendances (user_id, session_id) VALUES (?, ?)").run(userId, session.id);
    }
    await addPoints(userId, session.points);
    return res.json({ success: true, points: session.points });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
