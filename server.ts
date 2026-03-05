import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = 3000;

async function startServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server with Auth running on http://localhost:${PORT}`);
  });

  app.use(express.json());

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (supabase) {
      const { data: user } = await supabase.from('users').select('*, teams(name)').eq('email', email).single();
      if (user) {
        const isMatch = user.password.startsWith('$2') ? await bcrypt.compare(password, user.password) : user.password === password;
        if (isMatch) return res.json({ ...user, team_name: user.teams?.name || null });
      }
    }
    res.status(401).json({ error: "Credenciais inválidas" });
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

startServer().catch(console.error);
