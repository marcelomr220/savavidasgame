import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints, calculateAge } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const { 
    books, chapters, read, chapterId, bookId,
    userId: birthdayUserId, messages: isBirthdayMessages
  } = query;

  if (method === 'GET') {
    // BIBLE BOOKS
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

    // BIBLE CHAPTERS
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

    // BIBLE CHAPTER CONTENT
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

    // BIRTHDAYS LIST
    if (req.url?.includes('/birthdays') && !isBirthdayMessages) {
      try {
        const today = new Date();
        const monthDay = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        const year = today.getFullYear();

        if (supabase) {
          const { data: users, error } = await supabase.from('users').select('*').filter('birth_date', 'like', `%-${monthDay}`);
          if (error) throw error;

          const results = await Promise.all((users || []).map(async (user: any) => {
            const { data: event } = await supabase.from('birthday_events').select('*').eq('user_id', user.id).eq('year', year).maybeSingle();
            const { data: msgData } = await supabase.from('birthday_messages').select('*, sender:users(name, avatar)').eq('birthday_user_id', user.id).order('created_at', { ascending: false });
            const formattedMessages = (msgData || []).map((m: any) => ({ ...m, sender_name: m.sender?.name, sender_avatar: m.sender?.avatar }));
            return { ...user, age: calculateAge(user.birth_date), event, messages: formattedMessages };
          }));
          return res.json(results);
        }
        
        if (db) {
          const users = db.prepare("SELECT * FROM users WHERE birth_date LIKE ?").all(`%-${monthDay}`);
          const results = users.map((user: any) => {
            const event = db.prepare("SELECT * FROM birthday_events WHERE user_id = ? AND year = ?").get(user.id, year);
            const messages = db.prepare("SELECT m.*, u.name as sender_name, u.avatar as sender_avatar FROM birthday_messages m JOIN users u ON m.sender_user_id = u.id WHERE m.birthday_user_id = ? ORDER BY m.created_at DESC").all(user.id);
            return { ...user, age: calculateAge(user.birth_date), event, messages };
          });
          return res.json(results);
        }
      } catch (error) {
        return res.status(500).json({ error: "Failed to fetch birthdays" });
      }
    }
  }

  if (method === 'POST') {
    // BIBLE READ
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
      if (alreadyReadToday) return res.status(400).json({ error: "Você já leu um capítulo hoje. Volte amanhã para ganhar mais pontos!" });

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

      if (db) db.prepare("INSERT INTO user_bible_readings (user_id, chapter_id, read_at, points_awarded) VALUES (?, ?, ?, ?)").run(userId, chapterId, today, pointsAwarded);
      if (supabase) await supabase.from('user_bible_readings').insert([{ user_id: userId, chapter_id: chapterId, read_at: today, points_awarded: pointsAwarded }]);
      return res.json({ success: true, pointsAwarded });
    }

    // BIRTHDAY MESSAGE
    if (isBirthdayMessages && birthdayUserId) {
      const { senderId, message } = body;
      if (supabase) {
        await supabase.from('birthday_messages').insert({ birthday_user_id: birthdayUserId, sender_user_id: senderId, message });
        await addPoints(senderId, 3);
      }
      if (db) {
        db.prepare("INSERT INTO birthday_messages (birthday_user_id, sender_user_id, message) VALUES (?, ?, ?)").run(birthdayUserId, senderId, message);
        await addPoints(senderId, 3);
      }
      return res.json({ success: true });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
