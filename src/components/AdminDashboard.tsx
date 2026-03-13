import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckSquare, 
  QrCode, 
  TrendingUp, 
  AlertCircle, 
  ChevronRight,
  Activity,
  UserCheck,
  Database,
  Settings,
  Book,
  Cake,
  Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAdminStats, getRecentActivities } from '../services/api';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTeams: 0,
    pendingTasks: 0,
    monthlyAttendance: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<{configured: boolean, url: string | null}>({ configured: true, url: 'Supabase' });

  useEffect(() => {
    getAdminStats()
      .then(data => setStats(data || { totalUsers: 0, activeTeams: 0, pendingTasks: 0, monthlyAttendance: 0 }))
      .catch(err => console.error("Error fetching stats:", err));

    getRecentActivities()
      .then(data => setActivities(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching activities:", err));
  }, []);

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `Há ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Há ${diffInHours} h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Painel Administrativo</h2>
          <p className="text-stone-500">Gerencie sua comunidade e acompanhe o engajamento.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
          supabaseStatus.configured ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-stone-100 text-stone-500 border border-stone-200'
        }`}>
          <Database size={12} />
          {supabaseStatus.configured ? 'Supabase Conectado' : 'Supabase Offline'}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Users} label="Usuários" value={stats.totalUsers} color="blue" />
        <AdminStatCard icon={TrendingUp} label="Equipes" value={stats.activeTeams} color="red" />
        <AdminStatCard icon={AlertCircle} label="Pendências" value={stats.pendingTasks} color="orange" />
        <AdminStatCard icon={Activity} label="Presenças/Mês" value={stats.monthlyAttendance} color="purple" />
      </div>

      {/* Admin Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-4">Gerenciamento</h3>
          <div className="grid grid-cols-1 gap-3">
            <AdminLink to="/admin/tasks" icon={CheckSquare} title="Validar Tarefas" desc="Aprovar envios dos usuários" />
            <AdminLink to="/admin/attendance" icon={QrCode} title="Sessões de Presença" desc="Gerar novos códigos QR" />
            <AdminLink to="/admin/teams" icon={Users} title="Equipes" desc="Gerenciar times e líderes" />
            <AdminLink to="/admin/users" icon={UserCheck} title="Usuários" desc="Controle de acesso e pontos" />
            <AdminLink to="/admin/birthdays" icon={Cake} title="Aniversários" desc="Configurar mensagens e imagens" />
            <AdminLink to="/admin/mascot" icon={Flame} title="Mascote" desc="Upload de GIFs por nível" />
            <AdminLink to="/admin/bible" icon={Book} title="Bíblia Ilustrada" desc="Cadastrar capítulos e imagens" />
            <AdminLink to="/admin/settings" icon={Settings} title="Configurações" desc="Personalizar logo e aparência" />
          </div>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <h3 className="font-bold text-stone-900 mb-4">Atividades Recentes</h3>
          <div className="divide-y divide-stone-50">
            {activities.map((activity, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    activity.type === 'user_registered' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {activity.type === 'user_registered' ? <UserCheck size={14} /> : <CheckSquare size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{activity.title}</p>
                    <p className="text-xs text-stone-500">{formatRelativeTime(activity.date)}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-stone-300" />
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-sm text-stone-400 italic py-4">Nenhuma atividade recente encontrada.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminStatCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon size={20} />
      </div>
      <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-stone-900">{value}</p>
    </div>
  );
}

function AdminLink({ to, icon: Icon, title, desc }: any) {
  return (
    <Link to={to} className="group">
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 hover:border-red-200 hover:bg-red-50/30 transition-all">
        <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-stone-900">{title}</h4>
          <p className="text-xs text-stone-500">{desc}</p>
        </div>
        <ChevronRight size={16} className="text-stone-300 group-hover:text-red-500 transition-colors" />
      </div>
    </Link>
  );
}
