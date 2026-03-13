import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Settings, 
  Trophy, 
  Flame, 
  Star, 
  Camera, 
  ChevronRight,
  Shield,
  Mail,
  Users,
  Loader2,
  RefreshCw,
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';
import { updateUser } from '../services/api';
import AvatarCreator from './AvatarCreator';

export default function Profile({ user, onUpdateUser }: { user: User, onUpdateUser: (user: User) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 24,
    totalAttendance: 12,
    badges: [
      { id: 1, name: 'Fiel', icon: '🙏', color: 'bg-blue-100' },
      { id: 2, name: 'Dizimista', icon: '💰', color: 'bg-red-100' },
      { id: 3, name: 'Evangelista', icon: '📢', color: 'bg-orange-100' },
      { id: 4, name: 'Guerreiro', icon: '⚔️', color: 'bg-red-100' },
    ]
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        await updateUser(user.id, { avatar: base64 });
        onUpdateUser({ ...user, avatar: base64 });
      } catch (err) {
        console.error('Error uploading avatar:', err);
        alert('Erro ao carregar imagem');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-red-600 relative" />
        <div className="px-6 pb-6">
          <div className="relative -mt-12 mb-4 flex items-end justify-between">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl">
                <div className="w-full h-full rounded-2xl bg-stone-100 overflow-hidden relative">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-700 text-3xl font-bold">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  
                  {/* Avatar Upload Overlay */}
                  <label className="absolute inset-0 bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity duration-200">
                    {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                  </label>

                  {isUploading && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Loader2 size={24} className="text-white animate-spin" />
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowAvatarCreator(true)}
                  className="absolute -bottom-2 -right-2 p-2 bg-red-600 text-white rounded-full border-2 border-white shadow-lg hover:bg-red-700 transition-all z-10"
                  title="Criar Avatar"
                >
                  <Smile size={16} />
                </button>
              </div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-red-600 border-4 border-white flex items-center justify-center text-white text-xs font-bold">
                {user.level}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2.5 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors">
                <Settings size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-stone-900">{user.name}</h2>
            <div className="flex items-center gap-3 text-sm text-stone-500">
              <div className="flex items-center gap-1">
                <Mail size={14} />
                <span>{user.email}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{user.team_name || 'Sem Equipe'}</span>
              </div>
              {user.role === 'admin' && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-red-600 font-bold">
                    <Shield size={14} />
                    <span>Administrador</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center">
          <p className="text-2xl font-bold text-stone-900">{user.points}</p>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Pontos Totais</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center">
          <p className="text-2xl font-bold text-stone-900">{user.streak}</p>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Dias Seguidos</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center">
          <p className="text-2xl font-bold text-stone-900">{stats.totalTasks}</p>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tarefas</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center">
          <p className="text-2xl font-bold text-stone-900">{stats.totalAttendance}</p>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Presenças</p>
        </div>
      </div>

      {/* Badges & Achievements */}
      <section className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
          <Trophy size={20} className="text-amber-500" />
          Conquistas e Badges
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.badges.map((badge) => (
            <div key={badge.id} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-stone-100 hover:border-red-200 transition-colors group">
              <div className={`w-16 h-16 rounded-2xl ${badge.color} flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform`}>
                {badge.icon}
              </div>
              <span className="text-sm font-bold text-stone-700">{badge.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-bold text-stone-900">Atividades Recentes</h3>
        </div>
        <div className="divide-y divide-stone-50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Flame size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-900">Login Diário: Sequência Mantida!</p>
                <p className="text-xs text-stone-500">Ontem às 19:30 • +5 pts</p>
              </div>
              <ChevronRight size={16} className="text-stone-300" />
            </div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {showAvatarCreator && (
          <AvatarCreator 
            initialAvatar={user.avatar}
            onCancel={() => setShowAvatarCreator(false)}
            onSave={async (url) => {
              try {
                await updateUser(user.id, { avatar: url });
                onUpdateUser({ ...user, avatar: url });
                setShowAvatarCreator(false);
              } catch (err) {
                console.error("Error saving avatar:", err);
                alert("Erro ao salvar avatar.");
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
