import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db } from './_lib';
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, password } = req.body;
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
    res.status(400).json({ error: e.message });
  }
}
