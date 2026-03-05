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
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTeams: 0,
    pendingTasks: 0,
    monthlyAttendance: 0,
  });
  const [supabaseStatus, setSupabaseStatus] = useState<{configured: boolean, url: string | null}>({ configured: false, url: null });

  useEffect(() => {
    fetch('/api/supabase/status')
      .then(res => res.json())
      .then(data => setSupabaseStatus(data));
    
    // Fetch real stats
    fetch('/api/admin/users').then(res => res.json()).then(data => setStats(prev => ({ ...prev, totalUsers: data.length })));
    fetch('/api/admin/teams').then(res => res.json()).then(data => setStats(prev => ({ ...prev, activeTeams: data.length })));
  }, []);

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
          </div>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <h3 className="font-bold text-stone-900 mb-4">Atividades Recentes</h3>
          <div className="divide-y divide-stone-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-100 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="User" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Novo usuário registrado</p>
                    <p className="text-xs text-stone-500">Há {i * 10} minutos</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-stone-300" />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Database Tools */}
      <section className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Database size={20} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900">Ferramentas de Banco de Dados</h3>
            <p className="text-xs text-stone-500">Sincronize dados entre SQLite local e Supabase remoto.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-stone-100 bg-stone-50/50">
            <h4 className="text-sm font-bold text-stone-900 mb-1">Restaurar do Supabase</h4>
            <p className="text-xs text-stone-500 mb-4">Puxa todos os dados do Supabase e substitui o banco local (SQLite). Use isso se o banco local estiver vazio ou desatualizado.</p>
            <button 
              onClick={async () => {
                if (!confirm('Isso irá APAGAR todos os dados locais e substituir pelos dados do Supabase. Continuar?')) return;
                const res = await fetch('/api/admin/sync/pull', { method: 'POST' });
                if (res.ok) alert('Restauração concluída com sucesso!');
                else alert('Erro ao restaurar dados.');
              }}
              className="w-full py-2 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-bold hover:bg-stone-100 transition-all flex items-center justify-center gap-2"
            >
              <TrendingUp className="rotate-180" size={16} />
              Puxar Dados (Restore)
            </button>
          </div>

          <div className="p-4 rounded-2xl border border-stone-100 bg-stone-50/50">
            <h4 className="text-sm font-bold text-stone-900 mb-1">Migrar para Supabase</h4>
            <p className="text-xs text-stone-500 mb-4">Envia todos os dados locais para o Supabase. Use isso para fazer backup ou migrar para a nuvem pela primeira vez.</p>
            <button 
              onClick={async () => {
                if (!confirm('Deseja enviar todos os dados locais para o Supabase?')) return;
                const res = await fetch('/api/admin/sync/push', { method: 'POST' });
                if (res.ok) alert('Migração concluída com sucesso!');
                else alert('Erro ao migrar dados.');
              }}
              className="w-full py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100"
            >
              <TrendingUp size={16} />
              Empurrar Dados (Migrate)
            </button>
          </div>
        </div>
      </section>
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
