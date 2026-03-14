import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const { id, avatar: isAvatarUpdate, members, join, teams: isTeamsRequest } = query;

  if (method === 'GET') {
    // TEAMS MEMBERS
    if (id && members) {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('id, name, avatar, points, level').eq('team_id', id).order('points', { ascending: false });
        if (!error) return res.json(data);
      }
      if (db) {
        const membersList = db.prepare("SELECT id, name, avatar, points, level FROM users WHERE team_id = ? ORDER BY points DESC").all(id);
        return res.json(membersList);
      }
    }

    // TEAMS LIST
    if (isTeamsRequest || req.url?.includes('/teams')) {
      if (supabase) {
        const { data, error } = await supabase.from('teams').select('*, users(count)').order('total_points', { ascending: false });
        if (!error) return res.json(data.map((t: any) => ({ ...t, member_count: t.users?.[0]?.count || 0 })));
      }
      if (db) {
        const teams = db.prepare("SELECT t.*, (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count FROM teams t ORDER BY t.total_points DESC").all();
        return res.json(teams);
      }
    }

    // USER BY ID
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
    }

    // USERS LIST
    if (req.url?.includes('/users')) {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*, teams(name)').order('points', { ascending: false });
        if (!error) return res.json(data.map((u: any) => ({ ...u, team_name: u.teams?.name || null })));
      }
      if (db) {
        const users = db.prepare("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id ORDER BY u.points DESC").all();
        return res.json(users);
      }
    }
  }

  if (method === 'POST') {
    // JOIN TEAM
    if (join || req.url?.includes('/join')) {
      const { userId, teamId } = body;
      if (supabase) {
        await supabase.from('users').update({ team_id: teamId }).eq('id', userId);
      }
      if (db) {
        db.prepare("UPDATE users SET team_id = ? WHERE id = ?").run(teamId, userId);
      }
      return res.json({ success: true });
    }
  }

  if (method === 'PUT') {
    // UPDATE AVATAR
    if (id && isAvatarUpdate) {
      const { avatar } = body;
      if (supabase) {
        await supabase.from('users').update({ avatar }).eq('id', id);
      }
      if (db) {
        db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, id);
      }
      return res.json({ success: true });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
