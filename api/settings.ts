import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const { key } = query;

  if (method === 'GET') {
    if (!key) return res.status(400).json({ error: 'Key is required' });
    
    if (supabase) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();
      if (!error && data) return res.json({ value: data.value });
    }
    
    if (db) {
      const setting = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
      return res.json({ value: setting?.value || null });
    }
    
    return res.json({ value: null });
  }

  if (method === 'POST') {
    const { key, value } = body;
    if (!key) return res.status(400).json({ error: 'Key and value are required' });

    if (supabase) {
      await supabase.from('app_settings').upsert({ key, value });
    }
    
    if (db) {
      db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, value);
    }
    
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
