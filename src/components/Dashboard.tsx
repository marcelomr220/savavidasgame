import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Trophy, 
  CheckCircle2, 
  Calendar, 
  ChevronRight, 
  Zap,
  Star,
  Users,
  Gamepad2,
  QrCode,
  CheckSquare,
  X,
  Clock,
  Book,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User, BirthdayMessage } from '../types';
import Mascot from './Mascot';
import { getLevelData, getMascotStatus, getStageName } from '../lib/progression';
import { supabase } from '../lib/supabase';
import BirthdayCard from './BirthdayCard';
import WantedList from './WantedList';

export default function Dashboard({ user }: { user: User }) {
  const [stats, setStats] = useState({
    weeklyPoints: 0,
    completedTasks: 0,
  });
  const [activeModal, setActiveModal] = useState<'tasks' | 'xp' | 'team' | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [xpHistory, setXpHistory] = useState<any[]>([]);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchBirthdays();
    
    // Listen for new birthday messages for the current user
    const birthdayMessageSubscription = supabase
      .channel('birthday-messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'birthday_messages',
        filter: `birthday_user_id=eq.${user.id}`
      }, async (payload) => {
        // Fetch sender details
        const { data: sender } = await supabase
          .from('users')
          .select('name, avatar')
          .eq('id', payload.new.sender_user_id)
          .single();

        const newNotification = {
          id: payload.new.id,
          message: payload.new.message,
          sender_name: sender?.name || 'Alguém',
          sender_avatar: sender?.avatar,
          type: 'birthday'
        };

        setNotifications(prev => [newNotification, ...prev]);
        
        // Auto-remove notification after 8 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== payload.new.id));
        }, 8000);

        // Refresh birthdays to update the list
        fetchBirthdays();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(birthdayMessageSubscription);
    };
  }, [user.id]);

  const fetchBirthdays = async () => {
    try {
      const today = new Date();
      const day = today.getUTCDate();
      const month = today.getUTCMonth() + 1;
      const year = today.getFullYear();

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');
      
      if (usersError) throw usersError;

      const birthdayUsers = (users || []).filter(user => {
        if (!user.birth_date || user.is_disabled) return false;
        const bDate = new Date(user.birth_date);
        return bDate.getUTCDate() === day && (bDate.getUTCMonth() + 1) === month;
      });

      // Special check for current user's birthday
      const isCurrentUserBirthday = birthdayUsers.some(u => u.id === user.id);
      if (isCurrentUserBirthday) {
        const { giveBirthdayGift } = await import('../services/api');
        const given = await giveBirthdayGift(user.id, user.name);
        if (given) {
          // If gift was given, we might need to refresh to get the new event
          // but we'll continue to fetch below which will get the new event anyway
        }
      }

      const results = await Promise.all(birthdayUsers.map(async (bUser) => {
        const { data: event } = await supabase
          .from('birthday_events')
          .select('*')
          .eq('user_id', bUser.id)
          .eq('year', year)
          .maybeSingle();

        const { data: msgData } = await supabase
          .from('birthday_messages')
          .select('*, sender:users(name, avatar)')
          .eq('birthday_user_id', bUser.id)
          .order('created_at', { ascending: false });

        const messages = (msgData || []).map((m: any) => ({
          ...m,
          sender_name: m.sender?.name,
          sender_avatar: m.sender?.avatar
        }));

        const calculateAge = (birthDate: string) => {
          const today = new Date();
          const birth = new Date(birthDate);
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          return age;
        };

        return {
          ...bUser,
          age: calculateAge(bUser.birth_date),
          event,
          messages
        };
      }));

      setBirthdays(results);
    } catch (error) {
      console.error("Error fetching birthdays:", error);
    }
  };

  const handleSendBirthdayMessage = async (userId: number, message: string) => {
    try {
      // Check if already sent
      const { data: existing } = await supabase
        .from('birthday_messages')
        .select('id')
        .eq('birthday_user_id', userId)
        .eq('sender_user_id', user.id)
        .maybeSingle();

      if (existing) {
        console.warn("Message already sent to this user.");
        return;
      }

      const { error } = await supabase.from('birthday_messages').insert({
        birthday_user_id: userId,
        sender_user_id: user.id,
        message
      });

      if (error) throw error;

      // Award 3 points to sender
      const { addPoints } = await import('../services/api');
      await addPoints(user.id, 3);

      fetchBirthdays(); // Refresh messages
    } catch (error) {
      console.error("Error sending birthday message:", error);
    }
  };

  const fetchStats = async () => {
    try {
      // In a real app, these would be separate API calls
      // For now, we'll simulate some data or use existing ones if available
      const userTasks = await supabase.from('user_tasks').select('*, tasks(*)').eq('user_id', user.id);
      
      if (userTasks.data && Array.isArray(userTasks.data)) {
        setTasks(userTasks.data);
        setStats(prev => ({ ...prev, completedTasks: userTasks.data.filter((t: any) => t && t.status === 'verified').length }));
      } else {
        setTasks([]);
      }

      // Weekly points simulation
      setStats(prev => ({ ...prev, weeklyPoints: user.points })); // Simplified

      if (user.team_id) {
        const { data: team } = await supabase
          .from('teams')
          .select(`
            *,
            users(count),
            monitor:users!monitor_id(name, avatar)
          `)
          .eq('id', user.team_id)
          .single();
          
        if (team) {
          setTeamInfo({
            ...team,
            member_count: team.users?.[0]?.count || team.users?.count || 0,
            monitor_name: team.monitor?.name || null
          });
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  const levelData = getLevelData(user.points);
  const mascotStatus = getMascotStatus(user.last_activity_at);
  const [prevLevel, setPrevLevel] = useState(levelData.level);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (levelData.level > prevLevel) {
      setShowLevelUp(true);
      setPrevLevel(levelData.level);
      setTimeout(() => setShowLevelUp(false), 5000);
    }
  }, [levelData.level, prevLevel]);

  const getMascotMessage = (status: string) => {
    if (status === 'critical') return "ESTOU QUASE APAGANDO! ME AJUDE!";
    if (status === 'sad') return "Senti sua falta! Vamos voltar?";
    if (status === 'neutral') return "Que tal uma tarefa hoje?";
    return "Você está indo bem!";
  };

  const mascotMessage = getMascotMessage(mascotStatus);

  return (
    <div className="space-y-6 pb-4 relative">
      {/* Real-time Notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[calc(100%-2rem)] sm:w-80 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ x: 100, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 100, opacity: 0, scale: 0.9 }}
              className="m3-card-elevated p-4 flex items-start gap-4 pointer-events-auto shadow-2xl border-l-4 border-red-500 bg-white/95 backdrop-blur-md"
            >
              <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden shrink-0 border-2 border-white shadow-sm">
                <img 
                  src={n.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.sender_name}`} 
                  alt={n.sender_name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-black text-red-600 uppercase tracking-widest">Nova Mensagem! 🎂</p>
                  <button 
                    onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                    className="text-stone-400 hover:text-stone-600"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-sm font-bold text-stone-900 mb-1">{n.sender_name} enviou:</p>
                <p className="text-sm text-stone-600 italic leading-snug">"{n.message}"</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Welcome Header */}
      <header className="flex flex-col gap-0.5 mb-2">
        <h2 className="text-3xl font-serif italic font-bold text-primary tracking-tight">
          Olá, {user.name}! 👋
        </h2>
        <p className="text-lg font-serif italic text-on-surface-variant/70">
          Que bom ter você aqui hoje.
        </p>
      </header>

      {/* Birthday Celebration */}
      {birthdays.map((bUser: any) => (
        <div key={bUser.id}>
          <BirthdayCard 
            birthdayUser={bUser}
            currentUser={user}
            onSendMessage={handleSendBirthdayMessage}
          />
        </div>
      ))}

      {/* Level Progress Card */}
      <section className="m3-card-filled p-6 overflow-hidden relative">
        <AnimatePresence>
          {showLevelUp && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-primary/20 backdrop-blur-sm pointer-events-none"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-6xl mb-4"
              >
                🔥
              </motion.div>
              <h2 className="text-4xl font-black text-on-surface text-center drop-shadow-lg">
                LEVEL UP!
              </h2>
              <p className="text-xl font-bold text-primary">Nível {levelData.level}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-on-surface-variant">
          <Trophy size={120} />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 items-center relative z-10">
          <div className="hidden sm:block">
            <Mascot 
              size="md" 
              message={mascotMessage} 
              level={levelData.level} 
              progress={levelData.progress}
              status={mascotStatus} 
            />
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">Nível {levelData.level}</p>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">
                    {getStageName(levelData.stage)}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-on-surface">
                  {levelData.isMaxLevel ? "Nível Máximo Alcançado!" : "Próximo Nível"}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-on-surface-variant">
                  {Math.floor(levelData.currentXPInLevel)}/{levelData.nextLevelXP} XP
                </p>
                {user.streak > 0 && (
                  <p className="text-[10px] font-bold text-orange-500 uppercase">
                    🔥 Streak: {user.streak} dias (+{Math.min(25, user.streak * 5)}% XP)
                  </p>
                )}
              </div>
            </div>
            <div className="h-3 bg-surface rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${levelData.progress}%` }}
                className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard 
          icon={CheckCircle2} 
          label="Tarefas" 
          value={stats.completedTasks} 
          onClick={() => setActiveModal('tasks')}
        />
        <StatCard 
          icon={Zap} 
          label="XP Total" 
          value={user.points} 
          onClick={() => setActiveModal('xp')}
        />
        <StatCard 
          icon={Users} 
          label="Equipe" 
          value={user.team_name || 'N/A'} 
          onClick={() => setActiveModal('team')}
        />
      </div>

      {/* Detail Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-stone-900">
                  {activeModal === 'tasks' && 'Minhas Tarefas'}
                  {activeModal === 'xp' && 'Histórico de XP'}
                  {activeModal === 'team' && 'Minha Equipe'}
                </h3>
                <button onClick={() => setActiveModal(null)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {activeModal === 'tasks' && (
                  <div className="space-y-4">
                    {tasks.length > 0 ? tasks.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-4 p-3 bg-stone-50 rounded-2xl">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          t.status === 'verified' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {t.status === 'verified' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-stone-900">{t.tasks?.title}</p>
                          <p className="text-xs text-stone-500">{t.status === 'verified' ? 'Concluída' : 'Pendente'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">+{t.tasks?.points} pts</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-stone-500 py-8">Nenhuma tarefa registrada.</p>
                    )}
                  </div>
                )}

                {activeModal === 'xp' && (
                  <div className="space-y-4">
                    <div className="bg-red-50 p-6 rounded-[24px] text-center mb-6">
                      <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Total Acumulado</p>
                      <p className="text-4xl font-black text-red-700">{user.points} XP</p>
                    </div>
                    <p className="text-sm text-stone-500 text-center italic">O histórico detalhado de pontos será implementado em breve.</p>
                  </div>
                )}

                {activeModal === 'team' && (
                  <div className="space-y-6">
                    {teamInfo ? (
                      <>
                        <div className="flex items-center gap-6">
                          <div 
                            className="w-24 h-24 rounded-[32px] flex items-center justify-center text-white text-4xl font-bold shadow-xl"
                            style={{ backgroundColor: teamInfo.color }}
                          >
                            {teamInfo.photo ? (
                              <img src={teamInfo.photo} alt={teamInfo.name} className="w-full h-full object-cover rounded-[32px]" />
                            ) : (
                              teamInfo.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <h4 className="text-3xl font-black text-stone-900 tracking-tight">{teamInfo.name}</h4>
                            <p className="text-stone-500">{teamInfo.description || 'Sem descrição.'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-stone-50 p-4 rounded-2xl text-center">
                            <p className="text-xs font-bold text-stone-400 uppercase mb-1">Membros</p>
                            <p className="text-xl font-bold text-stone-900">{teamInfo.member_count || 0}</p>
                          </div>
                          <div className="bg-stone-50 p-4 rounded-2xl text-center">
                            <p className="text-xs font-bold text-stone-400 uppercase mb-1">Monitor</p>
                            <p className="text-sm font-bold text-red-600 truncate">{teamInfo.monitor_name || 'Não definido'}</p>
                          </div>
                          <div className="bg-stone-50 p-4 rounded-2xl text-center">
                            <p className="text-xs font-bold text-stone-400 uppercase mb-1">Pontos Totais</p>
                            <p className="text-xl font-bold text-red-600">{teamInfo.total_points} pts</p>
                          </div>
                          <div className="bg-stone-50 p-4 rounded-2xl text-center">
                            <p className="text-xs font-bold text-stone-400 uppercase mb-1">Sua Contribuição</p>
                            <p className="text-xl font-bold text-stone-900">{user.points} pts</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Users size={48} className="mx-auto text-stone-300 mb-4" />
                        <p className="text-stone-500">Você ainda não faz parte de uma equipe.</p>
                        <Link 
                          to="/teams" 
                          onClick={() => setActiveModal(null)}
                          className="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded-full font-bold text-sm"
                        >
                          Escolher Equipe
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wanted List */}
      <WantedList />

      {/* Quick Actions */}
      <section>
        <h3 className="text-lg font-bold text-on-surface mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionLink to="/tasks" icon={CheckSquare} title="Tarefas" desc="Ver missões disponíveis" />
          <ActionLink to="/games/investigation" icon={Search} title="Mistério" desc="Modo Investigação" />
          <ActionLink to="/games" icon={Gamepad2} title="Jogar" desc="Ganhe pontos extras" />
        </div>
      </section>

      {/* Recent Activity */}
      <section className="m3-card overflow-hidden">
        <div className="p-4 border-b border-surface-variant/30 flex items-center justify-between">
          <h3 className="font-bold text-on-surface">Atividades Recentes</h3>
          <button className="text-sm text-primary font-bold hover:bg-primary-container/20 px-3 py-1 rounded-full transition-colors">Ver tudo</button>
        </div>
        <div className="divide-y divide-surface-variant/20">
          {tasks.slice(0, 3).map((t: any) => (
            <div key={t.id} className="p-4 flex items-center gap-4 active:bg-surface-variant/30 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-on-surface">Tarefa: {t.tasks?.title}</p>
                <p className="text-xs text-on-surface-variant">{t.status === 'verified' ? 'Verificada' : 'Pendente'} • +{t.tasks?.points} pts</p>
              </div>
              <ChevronRight size={18} className="text-outline" />
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="p-8 text-center text-stone-400 text-sm italic">Nenhuma atividade recente.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="m3-card p-4 flex flex-col gap-2 text-left hover:border-red-200 hover:bg-red-50/30 transition-all active:scale-95"
    >
      <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
        <p className="text-base font-bold text-on-surface truncate">{value}</p>
      </div>
    </button>
  );
}

function ActionLink({ to, icon: Icon, title, desc }: any) {
  return (
    <Link to={to} className="group">
      <div className="m3-card p-4 flex items-center gap-4 active:scale-95 transition-transform">
        <div className="w-12 h-12 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shadow-sm">
          <Icon size={24} />
        </div>
        <div>
          <h4 className="font-bold text-on-surface">{title}</h4>
          <p className="text-xs text-on-surface-variant">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
