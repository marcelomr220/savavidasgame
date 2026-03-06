import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { userId, plant, water, types } = query;

  if (method === 'GET') {
    if (types) {
      if (db) {
        const treeTypes = db.prepare("SELECT * FROM tree_types").all();
        return res.json(treeTypes);
      }
    }
    if (userId) {
      if (db) {
        const trees = db.prepare("SELECT ut.*, tt.name, tt.image_url FROM user_trees ut JOIN tree_types tt ON ut.tree_type_id = tt.id WHERE ut.user_id = ?").all(userId);
        return res.json(trees);
      }
    }
  }

  if (method === 'POST') {
    if (plant) {
      const { userId, treeTypeId } = req.body;
      if (db) {
        const result = db.prepare("INSERT INTO user_trees (user_id, tree_type_id, status, progress) VALUES (?, ?, ?, ?)").run(userId, treeTypeId, 'seedling', 0);
        return res.json({ id: result.lastInsertRowid });
      }
    }
    if (water) {
      const { treeId, userId } = req.body;
      if (db) {
        const tree = db.prepare("SELECT * FROM user_trees WHERE id = ?").get(treeId);
        if (!tree) return res.status(404).json({ error: "Árvore não encontrada" });

        const newProgress = tree.progress + 20;
        let newStatus = tree.status;
        if (newProgress >= 100) {
          if (tree.status === 'seedling') newStatus = 'growing';
          else if (tree.status === 'growing') newStatus = 'mature';
        }

        db.prepare("UPDATE user_trees SET progress = ?, status = ?, last_watered = CURRENT_TIMESTAMP WHERE id = ?").run(newProgress >= 100 ? 0 : newProgress, newStatus, treeId);
        await addPoints(userId, 2);
        return res.json({ success: true, points: 2 });
      }
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
