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
  CheckSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User } from '../types';

export default function Dashboard({ user }: { user: User }) {
  const [stats, setStats] = useState({
    weeklyPoints: 120,
    completedTasks: 5,
    attendanceCount: 3,
  });

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
        <StatCard icon={CheckCircle2} label="Tarefas" value={stats.completedTasks} />
        <StatCard icon={Calendar} label="Presenças" value={stats.attendanceCount} />
        <StatCard icon={Zap} label="XP Semanal" value={stats.weeklyPoints} />
        <StatCard icon={Users} label="Equipe" value={user.team_name || 'N/A'} />
      </div>

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
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4 active:bg-surface-variant/30 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-on-surface">Tarefa Concluída: Ler Salmo 23</p>
                <p className="text-xs text-on-surface-variant">Há 2 horas • +10 pts</p>
              </div>
              <ChevronRight size={18} className="text-outline" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <div className="m3-card p-4 flex flex-col gap-2">
      <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
        <p className="text-base font-bold text-on-surface truncate">{value}</p>
      </div>
    </div>
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
