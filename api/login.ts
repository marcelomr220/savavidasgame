import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db } from './_lib';
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  
  if (supabase) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, teams(name)')
      .eq('email', email)
      .single();

    if (user) {
      const isMatch = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') 
        ? await bcrypt.compare(password, user.password)
        : user.password === password;

      if (isMatch) {
        const formattedUser = { ...user, team_name: user.teams?.name || null };
        return res.json(formattedUser);
      }
    }
  }

  if (db) {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (user) {
      const isMatch = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') 
        ? await bcrypt.compare(password, user.password)
        : user.password === password;

      if (isMatch) {
        if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          const hashedPassword = await bcrypt.hash(password, 10);
          db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
        }
        return res.json(user);
      }
    }
  }
  
  res.status(401).json({ error: "Credenciais inválidas" });
}
