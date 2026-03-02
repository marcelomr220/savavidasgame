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
    <div className="space-y-8">
      {/* Welcome Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Olá, {user.name}! 👋</h2>
          <p className="text-stone-500">Que bom ter você aqui hoje.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl font-bold">
            <Flame size={18} fill="currentColor" />
            <span>{user.streak} dias</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl font-bold">
            <Star size={18} fill="currentColor" />
            <span>{user.points} pts</span>
          </div>
        </div>
      </header>

      {/* Level Progress */}
      <section className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Trophy size={120} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Nível Atual</span>
            <h3 className="text-3xl font-bold text-stone-900">Nível {user.level}</h3>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Próximo Nível</span>
            <p className="text-sm font-semibold text-stone-600">{user.points}/{nextLevelPoints} XP</p>
          </div>
        </div>
        <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]"
          />
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle2} label="Tarefas" value={stats.completedTasks} color="blue" />
        <StatCard icon={Calendar} label="Presenças" value={stats.attendanceCount} color="purple" />
        <StatCard icon={Zap} label="Semanal" value={stats.weeklyPoints} color="amber" />
        <StatCard icon={Users} label="Equipe" value={user.team_name || 'N/A'} color="rose" />
      </div>

      {/* Quick Actions */}
      <section>
        <h3 className="text-lg font-bold text-stone-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionLink 
            to="/attendance" 
            icon={QrCode} 
            title="Marcar Presença" 
            desc="Use o QR Code para registrar"
            color="red"
          />
          <ActionLink 
            to="/games" 
            icon={Gamepad2} 
            title="Jogar Agora" 
            desc="Ganhe pontos com mini-games"
            color="indigo"
          />
          <ActionLink 
            to="/tasks" 
            icon={CheckSquare} 
            title="Ver Tarefas" 
            desc="Confira suas missões ativas"
            color="orange"
          />
        </div>
      </section>

      {/* Recent Activity (Placeholder) */}
      <section className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold text-stone-900">Atividades Recentes</h3>
          <button className="text-sm text-red-600 font-semibold hover:underline">Ver tudo</button>
        </div>
        <div className="divide-y divide-stone-50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-900">Tarefa Concluída: Ler Salmo 23</p>
                <p className="text-xs text-stone-500">Há 2 horas • +10 pts</p>
              </div>
              <ChevronRight size={16} className="text-stone-300" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-stone-900 truncate">{value}</p>
    </div>
  );
}

function ActionLink({ to, icon: Icon, title, desc, color }: any) {
  const colors: any = {
    red: 'bg-red-500 shadow-red-200',
    indigo: 'bg-indigo-500 shadow-indigo-200',
    orange: 'bg-orange-500 shadow-orange-200',
  };

  return (
    <Link to={to} className="group">
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm hover:border-red-200 hover:shadow-md transition-all duration-300 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl ${colors[color]} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        <div>
          <h4 className="font-bold text-stone-900 group-hover:text-red-600 transition-colors">{title}</h4>
          <p className="text-xs text-stone-500">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
