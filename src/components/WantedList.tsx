import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, User as UserIcon, Clock, AlertTriangle } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface WantedUser extends User {
  daysAbsent: number;
  statusLevel: 1 | 2 | 3;
}

export default function WantedList() {
  const [wantedUsers, setWantedUsers] = useState<WantedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWantedUsers();
  }, []);

  const fetchWantedUsers = async () => {
    try {
      setLoading(true);
      
      // 1. Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'user');

      if (usersError) throw usersError;

      // 2. Get latest attendance for each user
      // In a real app, we might have a 'last_attendance_at' column in users table
      // For now, we'll fetch from attendances table
      const { data: attendances, error: attError } = await supabase
        .from('attendances')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });

      if (attError) throw attError;

      const now = new Date();
      const userLastAttendance: Record<number, Date> = {};

      attendances?.forEach(att => {
        if (!userLastAttendance[att.user_id]) {
          userLastAttendance[att.user_id] = new Date(att.created_at);
        }
      });

      const processed: WantedUser[] = (users || [])
        .map(u => {
          const lastAtt = userLastAttendance[u.id];
          if (!lastAtt) {
            // If never attended, use created_at or a very old date
            const created = new Date(u.created_at || Date.now() - 40 * 24 * 60 * 60 * 1000);
            const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            return { ...u, daysAbsent: days };
          }
          const days = Math.floor((now.getTime() - lastAtt.getTime()) / (1000 * 60 * 60 * 24));
          return { ...u, daysAbsent: days };
        })
        .filter(u => u.daysAbsent >= 7) // Only show those absent for 7+ days
        .map(u => {
          let statusLevel: 1 | 2 | 3 = 1;
          if (u.daysAbsent > 30) statusLevel = 3;
          else if (u.daysAbsent > 14) statusLevel = 2;
          return { ...u, statusLevel };
        })
        .sort((a, b) => b.daysAbsent - a.daysAbsent)
        .slice(0, 10); // Limit to top 10

      setWantedUsers(processed);
    } catch (err) {
      console.error("Error fetching wanted users:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (wantedUsers.length === 0) return null;

  const getStatusColor = (level: number) => {
    switch (level) {
      case 3: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = (level: number) => {
    switch (level) {
      case 3: return 'Crítico';
      case 2: return 'Alerta';
      default: return 'Atenção';
    }
  };

  return (
    <section className="relative p-4 sm:p-6 rounded-[2rem] sm:rounded-[32px] bg-stone-100/50 border border-stone-200/60 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 sm:w-32 sm:h-32 bg-red-500/5 rounded-full blur-2xl sm:blur-3xl" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 sm:w-32 sm:h-32 bg-orange-500/5 rounded-full blur-2xl sm:blur-3xl" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 mb-6 relative z-10 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 sm:p-2 bg-red-600 rounded-lg sm:rounded-xl shadow-lg shadow-red-600/20">
              <Search size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tighter uppercase italic">
              PROCURADOS<span className="text-red-600">(as)</span>
            </h3>
          </div>
          <p className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-widest pl-10 sm:pl-11">
            Essas pessoas não apareceram na célula 👀
          </p>
        </div>
        <div className="flex -space-x-2 sm:-space-x-3 self-end sm:self-auto">
          {wantedUsers.slice(0, 3).map(u => (
            <motion.div 
              key={u.id} 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 sm:border-4 border-white bg-stone-200 overflow-hidden shadow-md"
            >
              <img 
                src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                alt={u.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x relative z-10 -mx-1 px-1">
        {wantedUsers.map((u) => (
          <motion.div
            key={u.id}
            whileHover={{ y: -6, scale: 1.02 }}
            className="flex-shrink-0 w-[240px] sm:w-64 snap-start"
          >
            <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] shadow-sm border border-stone-200/50 relative overflow-hidden group transition-all hover:shadow-xl hover:shadow-stone-200/50">
              {/* Status Indicator Bar */}
              <div className={`absolute top-0 left-0 w-full h-1 sm:h-1.5 ${getStatusColor(u.statusLevel)}`} />
              
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[20px] bg-stone-50 overflow-hidden border-2 border-stone-100 shadow-inner">
                    <img 
                      src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                      alt={u.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white flex items-center justify-center ${getStatusColor(u.statusLevel)} shadow-lg`}>
                    <AlertTriangle size={10} className="text-white sm:w-3 sm:h-3" fill="currentColor" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-stone-900 truncate text-base sm:text-lg tracking-tight">{u.name}</h4>
                  <div className="flex items-center gap-1 text-stone-500">
                    <Clock size={10} className="text-red-500 sm:w-3 sm:h-3" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">há {u.daysAbsent} dias</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl ${getStatusColor(u.statusLevel)}/10 flex items-center gap-1 sm:gap-1.5`}>
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${getStatusColor(u.statusLevel)} animate-pulse`} />
                  <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${getStatusColor(u.statusLevel).replace('bg-', 'text-')}`}>
                    {getStatusText(u.statusLevel)}
                  </span>
                </div>
                
                <button 
                  onClick={() => window.open(`https://wa.me/?text=Oi ${u.name.split(' ')[0]}, estamos com saudade de você na célula!`, '_blank')}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-stone-900 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-stone-900/10 hover:shadow-red-600/20 active:scale-95"
                >
                  <MessageCircle size={12} className="sm:w-3.5 sm:h-3.5" />
                  Contatar
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
