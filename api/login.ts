// NOVO ARQUIVO: /api/login.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Função para inicializar o cliente Supabase.
// Note que as variáveis de ambiente são lidas diretamente com process.env
// Você DEVE configurar estas variáveis no painel do seu projeto na Vercel!
// Esta é a nossa função Serverless
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Configuração do servidor incompleta (Supabase Keys)." });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Garantir que a requisição é do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // 2. Extrair email e senha do corpo da requisição
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    // 3. Lógica de login usando APENAS o Supabase (removemos o fallback para SQLite)
    const { data: user, error } = await supabase
      .from('users')
      .select('*, teams(name)') // Fazendo o join com a tabela de times
      .eq('email', email)
      .single();

    // Se o Supabase retornou um erro ou não encontrou o usuário
    if (error || !user) {
      console.error('Erro do Supabase ou usuário não encontrado:', error?.message);
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // 4. Comparar a senha usando bcrypt
    // A sua lógica original já era ótima, vamos mantê-la
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // Senha correta!
      // Formatamos o usuário para incluir o nome do time, como no seu código original
      const formattedUser = {
        ...user,
        team_name: user.teams?.name || null,
        teams: undefined, // Remove o objeto aninhado para limpar a resposta
      };
      delete (formattedUser as any).teams;

      return res.status(200).json(formattedUser);
    } else {
      // Senha incorreta
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

  } catch (err: any) {
    console.error('[API_LOGIN_ERROR]', err);
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
}