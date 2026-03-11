import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { userId, plant, water, types } = query;

  if (method === 'GET') {
    if (types) {
      if (supabase) {
        const { data, error } = await supabase.from('tree_types').select('*');
        if (!error) return res.json(data);
      }
      if (db) {
        const treeTypes = db.prepare("SELECT * FROM tree_types").all();
        return res.json(treeTypes);
      }
    }
    if (userId) {
      if (supabase) {
        const { data, error } = await supabase.from('user_trees').select('*, tree_types(*)').eq('user_id', userId);
        if (!error) return res.json(data.map(ut => ({ ...ut, name: ut.tree_types?.name, image_url: ut.tree_types?.image_url })));
      }
      if (db) {
        const trees = db.prepare("SELECT ut.*, tt.name, tt.image_url FROM user_trees ut JOIN tree_types tt ON ut.tree_type_id = tt.id WHERE ut.user_id = ?").all(userId);
        return res.json(trees);
      }
    }
  }

  if (method === 'POST') {
    if (plant) {
      const { userId, treeTypeId } = req.body;
      if (supabase) {
        const { data, error } = await supabase.from('user_trees').insert([{ user_id: userId, tree_type_id: treeTypeId, status: 'seedling', progress: 0 }]).select().single();
        if (!error) return res.json(data);
      }
      if (db) {
        const result = db.prepare("INSERT INTO user_trees (user_id, tree_type_id, status, progress) VALUES (?, ?, ?, ?)").run(userId, treeTypeId, 'seedling', 0);
        return res.json({ id: result.lastInsertRowid });
      }
    }
    if (water) {
      const { treeId, userId } = req.body;
      let tree;
      if (supabase) {
        const { data, error } = await supabase.from('user_trees').select('*').eq('id', treeId).single();
        if (!error) tree = data;
      }
      if (!tree && db) {
        tree = db.prepare("SELECT * FROM user_trees WHERE id = ?").get(treeId);
      }
      
      if (!tree) return res.status(404).json({ error: "Árvore não encontrada" });

      const newProgress = tree.progress + 20;
      let newStatus = tree.status;
      if (newProgress >= 100) {
        if (tree.status === 'seedling') newStatus = 'growing';
        else if (tree.status === 'growing') newStatus = 'mature';
      }

      const finalProgress = newProgress >= 100 ? 0 : newProgress;
      if (supabase) {
        await supabase.from('user_trees').update({ progress: finalProgress, status: newStatus, last_watered: new Date().toISOString() }).eq('id', treeId);
      }
      if (db) {
        db.prepare("UPDATE user_trees SET progress = ?, status = ?, last_watered = CURRENT_TIMESTAMP WHERE id = ?").run(finalProgress, newStatus, treeId);
      }
      await addPoints(userId, 2);
      return res.json({ success: true, points: 2 });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
