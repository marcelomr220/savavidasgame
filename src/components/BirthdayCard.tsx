import React, { useState } from 'react';
import { Cake, Send, MessageCircle, User as UserIcon, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, BirthdayMessage } from '../types';

interface BirthdayCardProps {
  birthdayUser: User & { age: number; event?: any; messages: BirthdayMessage[] };
  currentUser: User;
  onSendMessage: (userId: number, message: string) => Promise<void>;
}

export default function BirthdayCard({ birthdayUser, currentUser, onSendMessage }: BirthdayCardProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(birthdayUser.id, message);
      setMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] border border-stone-200 shadow-xl overflow-hidden mb-8"
    >
      <div className="relative h-48 bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)]" />
        </div>
        
        {birthdayUser.event?.image_url ? (
          <img 
            src={birthdayUser.event.image_url} 
            alt="Birthday" 
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Cake size={80} className="text-white/30" />
        )}
        
        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden shadow-lg bg-white">
              <img 
                src={birthdayUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${birthdayUser.name}`} 
                alt={birthdayUser.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mb-1">
              <h3 className="text-2xl font-bold text-white">{birthdayUser.name}</h3>
              <p className="text-white/80 font-medium">🎂 {birthdayUser.age} anos hoje!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {birthdayUser.event?.admin_message && (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 italic text-red-800 text-center">
            "{birthdayUser.event.admin_message}"
          </div>
        )}

        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowMessages(!showMessages)}
            className="flex items-center gap-2 text-stone-600 hover:text-red-600 font-bold transition-colors"
          >
            <MessageCircle size={20} />
            {birthdayUser.messages.length} Mensagens
          </button>
          <div className="flex items-center gap-1 text-red-600 font-bold">
            <Star size={16} fill="currentColor" />
            <span>+100 pontos de presente!</span>
          </div>
        </div>

        <AnimatePresence>
          {showMessages && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {birthdayUser.messages.map((msg) => (
                <div key={msg.id} className="flex gap-3 p-3 bg-stone-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden shrink-0">
                    <img 
                      src={msg.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_name}`} 
                      alt={msg.sender_name} 
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">{msg.sender_name}</p>
                    <p className="text-sm text-stone-600">{msg.message}</p>
                  </div>
                </div>
              ))}
              {birthdayUser.messages.length === 0 && (
                <p className="text-center text-stone-400 text-sm py-4">Seja o primeiro a parabenizar!</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {currentUser.id !== birthdayUser.id && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              type="text"
              placeholder="Deixe uma mensagem de parabéns..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
            <button 
              type="submit"
              disabled={!message.trim() || isSending}
              className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              <Send size={20} />
            </button>
          </form>
        )}
        
        {currentUser.id !== birthdayUser.id && (
          <p className="text-[10px] text-stone-400 text-center">
            Ganhe <span className="text-red-600 font-bold">3 pontos</span> ao enviar uma mensagem!
          </p>
        )}
      </div>
    </motion.div>
  );
}
