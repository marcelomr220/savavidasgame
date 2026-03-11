import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const { books, chapters, read, chapterId, bookId } = query;

  if (method === 'GET') {
    if (books) {
      const { isAdmin } = query;
      if (supabase) {
        let q = supabase.from('bible_books').select('*').order('order_index');
        if (isAdmin !== 'true') q = q.eq('is_released', 1);
        const { data, error } = await q;
        if (!error) return res.json(data);
      }
      if (db) {
        const q = isAdmin === 'true' 
          ? "SELECT * FROM bible_books ORDER BY order_index" 
          : "SELECT * FROM bible_books WHERE is_released = 1 ORDER BY order_index";
        return res.json(db.prepare(q).all());
      }
      return res.json([]);
    }

    if (chapters && bookId) {
      if (supabase) {
        const { data, error } = await supabase.from('bible_chapters').select('id, chapter_number, title').eq('book_id', bookId).order('chapter_number');
        if (!error) return res.json(data);
      }
      if (db) {
        return res.json(db.prepare("SELECT id, chapter_number, title FROM bible_chapters WHERE book_id = ? ORDER BY chapter_number").all(bookId));
      }
      return res.json([]);
    }

    if (chapterId && !read) {
      if (supabase) {
        const { data, error } = await supabase.from('bible_chapters').select('*, bible_books(name)').eq('id', chapterId).single();
        if (!error) return res.json(data);
      }
      if (db) {
        return res.json(db.prepare("SELECT bc.*, bb.name as book_name FROM bible_chapters bc JOIN bible_books bb ON bc.book_id = bb.id WHERE bc.id = ?").get(chapterId));
      }
      return res.json(null);
    }
  }

  if (method === 'POST') {
    if (read && chapterId) {
      const { userId } = body;
      const today = new Date().toISOString().split('T')[0];

      let alreadyReadToday = false;
      if (supabase) {
        const { data } = await supabase.from('user_bible_readings').select('id').eq('user_id', userId).eq('read_at', today).single();
        if (data) alreadyReadToday = true;
      } else if (db) {
        const result = db.prepare("SELECT id FROM user_bible_readings WHERE user_id = ? AND read_at = ?").get(userId, today);
        if (result) alreadyReadToday = true;
      }

      if (alreadyReadToday) {
        return res.status(400).json({ error: "Você já leu um capítulo hoje. Volte amanhã para ganhar mais pontos!" });
      }

      let chapterAlreadyRead = false;
      if (supabase) {
        const { data } = await supabase.from('user_bible_readings').select('id').eq('user_id', userId).eq('chapter_id', chapterId).single();
        if (data) chapterAlreadyRead = true;
      } else if (db) {
        const result = db.prepare("SELECT id FROM user_bible_readings WHERE user_id = ? AND chapter_id = ?").get(userId, chapterId);
        if (result) chapterAlreadyRead = true;
      }
      
      let pointsAwarded = 0;
      if (!chapterAlreadyRead) {
        pointsAwarded = 50;
        await addPoints(userId, pointsAwarded);
      }

      if (db) {
        db.prepare("INSERT INTO user_bible_readings (user_id, chapter_id, read_at, points_awarded) VALUES (?, ?, ?, ?)").run(userId, chapterId, today, pointsAwarded);
      }
      if (supabase) {
        await supabase.from('user_bible_readings').insert([{ user_id: userId, chapter_id: chapterId, read_at: today, points_awarded: pointsAwarded }]);
      }

      return res.json({ success: true, pointsAwarded });
    }
    
    // Admin routes
    const { name, image_url, order_index, book_id, chapter_number, title, content, isReleased } = body;
    const { release, id } = query;

    if (release && id) {
      if (db) db.prepare("UPDATE bible_books SET is_released = ? WHERE id = ?").run(isReleased ? 1 : 0, id);
      if (supabase) await supabase.from('bible_books').update({ is_released: isReleased ? 1 : 0 }).eq('id', id);
      return res.json({ success: true });
    }

    if (name) { // Create book
      let lastId = Date.now();
      if (db) lastId = db.prepare("INSERT INTO bible_books (name, image_url, order_index) VALUES (?, ?, ?)").run(name, image_url, order_index || 0).lastInsertRowid;
      if (supabase) await supabase.from('bible_books').insert([{ id: lastId, name, image_url, order_index: order_index || 0 }]);
      return res.json({ id: lastId });
    }

    if (book_id) { // Create chapter
      let lastId = Date.now();
      if (db) lastId = db.prepare("INSERT INTO bible_chapters (book_id, chapter_number, title, content) VALUES (?, ?, ?, ?)").run(book_id, chapter_number, title, JSON.stringify(content)).lastInsertRowid;
      if (supabase) await supabase.from('bible_chapters').insert([{ id: lastId, book_id, chapter_number, title, content: JSON.stringify(content) }]);
      return res.json({ id: lastId });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
