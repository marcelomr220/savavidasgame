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
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { supabase } from '../lib/supabase';

export default function Dashboard({ user }: { user: User }) {
  const [stats, setStats] = useState({
    weeklyPoints: 0,
    completedTasks: 0,
    attendanceCount: 0,
  });
  const [activeModal, setActiveModal] = useState<'tasks' | 'attendance' | 'xp' | 'team' | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [xpHistory, setXpHistory] = useState<any[]>([]);
  const [teamInfo, setTeamInfo] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, [user.id]);

  const fetchStats = async () => {
    try {
      // In a real app, these would be separate API calls
      // For now, we'll simulate some data or use existing ones if available
      const userTasks = await supabase.from('user_tasks').select('*, tasks(*)').eq('user_id', user.id);
      const userAttendance = await supabase.from('attendances').select('*, attendance_sessions(*)').eq('user_id', user.id);
      
      if (userTasks.data) {
        setTasks(userTasks.data);
        setStats(prev => ({ ...prev, completedTasks: userTasks.data.filter(t => t.status === 'verified').length }));
      }
      
      if (userAttendance.data) {
        setAttendance(userAttendance.data);
        setStats(prev => ({ ...prev, attendanceCount: userAttendance.data.length }));
      }

      // Weekly points simulation
      setStats(prev => ({ ...prev, weeklyPoints: user.points })); // Simplified

      if (user.team_id) {
        const team = await supabase.from('teams').select('*').eq('id', user.team_id).single();
        if (team.data) setTeamInfo(team.data);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  const nextLevelPoints = user.level * 100;
  const progress = (user.points % 100);

  return (
    <div className="space-y-6 pb-4">
      {/* Welcome Header */}
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-on-surface">Olá, {user.name}! 👋</h2>
        <p className="text-on-surface-variant">Que bom ter você aqui hoje.</p>
      </header>

      {/* Level Progress Card */}
      <section className="m3-card-filled p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-on-surface-variant">
          <Trophy size={120} />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 items-center relative z-10">
          {/* Fire Mascot */}
          <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [-5, 5, -5]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10"
            >
              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative">
                <Flame size={64} className="text-red-600 drop-shadow-lg" fill="currentColor" />
                {/* Face */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                  <div className="flex gap-2">
                    <motion.div 
                      animate={{ scaleY: [1, 0.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                      className="w-1.5 h-1.5 bg-white rounded-full" 
                    />
                    <motion.div 
                      animate={{ scaleY: [1, 0.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                      className="w-1.5 h-1.5 bg-white rounded-full" 
                    />
                  </div>
                  <div className="w-3 h-1.5 border-b-2 border-white rounded-full mt-1" />
                </div>
              </div>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Flame size={32} className="text-orange-400" fill="currentColor" />
              </motion.div>
            </motion.div>
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Nível {user.level}</p>
                <h3 className="text-2xl font-bold text-on-surface">Próximo Nível</h3>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-on-surface-variant">{user.points}/{nextLevelPoints} XP</p>
              </div>
            </div>
            <div className="h-3 bg-surface rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard 
          icon={CheckCircle2} 
          label="Tarefas" 
          value={stats.completedTasks} 
          onClick={() => setActiveModal('tasks')}
        />
        <StatCard 
          icon={Calendar} 
          label="Presenças" 
          value={stats.attendanceCount} 
          onClick={() => setActiveModal('attendance')}
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
                  {activeModal === 'attendance' && 'Histórico de Presença'}
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

                {activeModal === 'attendance' && (
                  <div className="space-y-4">
                    {attendance.length > 0 ? attendance.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-4 p-3 bg-stone-50 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Calendar size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-stone-900">{a.attendance_sessions?.event_type}</p>
                          <p className="text-xs text-stone-500">{new Date(a.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">+{a.attendance_sessions?.points} pts</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-stone-500 py-8">Nenhuma presença registrada.</p>
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
                            className="w-20 h-20 rounded-[24px] flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                            style={{ backgroundColor: teamInfo.color }}
                          >
                            {teamInfo.photo ? (
                              <img src={teamInfo.photo} alt={teamInfo.name} className="w-full h-full object-cover rounded-[24px]" />
                            ) : (
                              teamInfo.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <h4 className="text-2xl font-bold text-stone-900">{teamInfo.name}</h4>
                            <p className="text-stone-500">{teamInfo.description || 'Sem descrição.'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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

      {/* Quick Actions */}
      <section>
        <h3 className="text-lg font-bold text-on-surface mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionLink to="/attendance" icon={QrCode} title="Presença" desc="Registrar com QR Code" />
          <ActionLink to="/games" icon={Gamepad2} title="Jogar" desc="Ganhe pontos extras" />
          <ActionLink to="/tasks" icon={CheckSquare} title="Missões" desc="Confira suas tarefas" />
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
