import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, db, addPoints, calculateAge } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const { userId, messages } = query;

  if (method === 'GET') {
    try {
      if (supabase) {
        const today = new Date();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const monthDay = `${month}-${day}`;

        // In Supabase, we might need a more complex query or use a generated column
        // For now, we'll fetch all users with birth_date and filter in JS if needed,
        // or use a raw query if possible.
        // Actually, we can use: .filter('birth_date', 'like', `%-${monthDay}`)
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .filter('birth_date', 'like', `%-${monthDay}`);

        if (error) throw error;

        const year = today.getFullYear();
        const results = await Promise.all((users || []).map(async (user: any) => {
          // Fetch event and messages
          const { data: event } = await supabase
            .from('birthday_events')
            .select('*')
            .eq('user_id', user.id)
            .eq('year', year)
            .maybeSingle();

          const { data: msgData } = await supabase
            .from('birthday_messages')
            .select('*, sender:users(name, avatar)')
            .eq('birthday_user_id', user.id)
            .order('created_at', { ascending: false });

          const formattedMessages = (msgData || []).map((m: any) => ({
            ...m,
            sender_name: m.sender?.name,
            sender_avatar: m.sender?.avatar
          }));

          return {
            ...user,
            age: calculateAge(user.birth_date),
            event,
            messages: formattedMessages
          };
        }));

        return res.json(results);
      }
      
      if (db) {
        const today = new Date();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const monthDay = `${month}-${day}`;

        const users = db.prepare("SELECT * FROM users WHERE birth_date LIKE ?").all(`%-${monthDay}`);
        const year = today.getFullYear();

        const results = users.map((user: any) => {
          const event = db.prepare("SELECT * FROM birthday_events WHERE user_id = ? AND year = ?").get(user.id, year);
          const messages = db.prepare(`
            SELECT m.*, u.name as sender_name, u.avatar as sender_avatar 
            FROM birthday_messages m 
            JOIN users u ON m.sender_user_id = u.id 
            WHERE m.birthday_user_id = ? 
            ORDER BY m.created_at DESC
          `).all(user.id);

          return {
            ...user,
            age: calculateAge(user.birth_date),
            event,
            messages
          };
        });

        return res.json(results);
      }
    } catch (error) {
      console.error("Error fetching birthdays:", error);
      return res.status(500).json({ error: "Failed to fetch birthdays" });
    }
  }

  if (method === 'POST') {
    // Handle sending message
    if (messages && userId) {
      const { senderId, message } = req.body;
      try {
        if (supabase) {
          await supabase.from('birthday_messages').insert({
            birthday_user_id: userId,
            sender_user_id: senderId,
            message
          });
          await addPoints(senderId, 3);
        }
        if (db) {
          db.prepare("INSERT INTO birthday_messages (birthday_user_id, sender_user_id, message) VALUES (?, ?, ?)").run(
            userId,
            senderId,
            message
          );
          await addPoints(senderId, 3);
        }
        return res.json({ success: true });
      } catch (error) {
        console.error("Error sending birthday message:", error);
        return res.status(500).json({ error: "Failed to send message" });
      }
    }

    // Handle the user's specific request for POST /api/birthdays
    // "inserir os dados na tabela 'birthdays' do Supabase"
    // I'll assume they might be sending a generic birthday record.
    try {
      if (supabase) {
        const { data, error } = await supabase.from('birthdays').insert([req.body]).select();
        if (error) throw error;
        return res.json({ success: true, data });
      }
      return res.status(400).json({ error: "Supabase not configured" });
    } catch (error) {
      console.error("Error saving to birthdays table:", error);
      return res.status(500).json({ error: "Failed to save birthday" });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
