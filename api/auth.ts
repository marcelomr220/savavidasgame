import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db } from './_lib';
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const { login, register } = query;

  if (method === 'POST') {
    // LOGIN
    if (login || req.url?.includes('/login')) {
      const { email, password } = body;
      if (!email || !password) return res.status(400).json({ error: "Email e senha são obrigatórios" });

      try {
        let user;
        if (supabase) {
          const { data, error } = await supabase.from('users').select('*, teams(name)').eq('email', email).single();
          if (!error && data) user = data;
        }
        if (!user && db) {
          user = db.prepare("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id WHERE u.email = ?").get(email);
        }

        if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

        const isMatch = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') 
          ? await bcrypt.compare(password, user.password)
          : user.password === password;

        if (!isMatch) return res.status(401).json({ error: "Credenciais inválidas" });

        // If password wasn't hashed, hash it now (migration)
        if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          const hashedPassword = await bcrypt.hash(password, 10);
          if (supabase) await supabase.from('users').update({ password: hashedPassword }).eq('id', user.id);
          if (db) db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
        }

        const { password: _, ...userWithoutPassword } = user;
        return res.json({ ...userWithoutPassword, team_name: user.team_name || (user.teams?.name || null) });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }

    // REGISTER
    if (register || req.url?.includes('/register')) {
      const { name, email, password } = body;
      if (!name || !email || !password) return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        if (supabase) {
          const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
          if (existingUser) return res.status(400).json({ error: "Este email já está cadastrado" });

          const { data: newUser, error } = await supabase
            .from('users')
            .insert([{ name, email, password: hashedPassword, role: 'user', points: 0, level: 1, streak: 0 }])
            .select()
            .single();
          if (!error) return res.json(newUser);
        }

        if (db) {
          const result = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, hashedPassword);
          const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
          return res.json(newUser);
        }
      } catch (e: any) {
        return res.status(400).json({ error: e.message });
      }
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
