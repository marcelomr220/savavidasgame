import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { name, email, password } = req.body;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Configuração do servidor incompleta (Supabase Keys)." });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        { name, email, password: hashedPassword, role: 'user', points: 0, level: 1, streak: 0 }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Este email já está cadastrado.' });
      }
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json(newUser);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar conta.' });
  }
}
