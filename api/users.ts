import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { id, avatar: isAvatarUpdate } = query;

  if (method === 'GET') {
    if (id) {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*, teams(name)').eq('id', id).single();
        if (!error && data) return res.json({ ...data, team_name: data.teams?.name || null });
      }
      if (db) {
        const user = db.prepare("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id WHERE u.id = ?").get(id);
        if (user) return res.json(user);
      }
      return res.status(404).json({ error: "Usuário não encontrado" });
    } else {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*, teams(name)').order('points', { ascending: false });
        if (!error) return res.json(data.map(u => ({ ...u, team_name: u.teams?.name || null })));
      }
      if (db) {
        const users = db.prepare("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id ORDER BY u.points DESC").all();
        return res.json(users);
      }
    }
  }

  if (method === 'PUT' && id && isAvatarUpdate) {
    const { avatar } = req.body;
    if (supabase) {
      await supabase.from('users').update({ avatar }).eq('id', id);
    }
    if (db) {
      db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, id);
    }
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
