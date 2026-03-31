import React, { useState, useEffect } from 'react';
import { Cake, Search, User as UserIcon, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../types';
import { getUsers } from '../services/api';

export default function BirthdayAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingBirthdays = users
    .filter(u => u.birth_date)
    .sort((a, b) => {
      const dateA = new Date(a.birth_date!);
      const dateB = new Date(b.birth_date!);
      const today = new Date();
      
      const nextA = new Date(today.getFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
      if (nextA < today) nextA.setFullYear(today.getFullYear() + 1);
      
      const nextB = new Date(today.getFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
      if (nextB < today) nextB.setFullYear(today.getFullYear() + 1);
      
      return nextA.getTime() - nextB.getTime();
    });

  const filteredUsers = upcomingBirthdays.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-12 text-center">Carregando...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-stone-900">Aniversariantes</h2>
        <p className="text-stone-500">Visualize os próximos aniversariantes da comunidade.</p>
      </header>

      <div className="max-w-2xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Buscar aniversariante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-sm"
          />
        </div>

        <div className="bg-white rounded-[32px] border border-stone-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const bDate = new Date(u.birth_date!);
                const isToday = bDate.getUTCDate() === new Date().getDate() && bDate.getUTCMonth() === new Date().getMonth();
                
                return (
                  <div
                    key={u.id}
                    className={`p-6 flex items-center gap-4 hover:bg-stone-50 transition-colors ${isToday ? 'bg-red-50/50' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 overflow-hidden shrink-0">
                      <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-stone-900">{u.name}</p>
                        {isToday && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Cake size={10} />
                            Hoje!
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 flex items-center gap-1">
                        <Calendar size={14} className="text-stone-400" />
                        {bDate.getUTCDate()}/{bDate.getUTCMonth() + 1}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{u.team_name || 'Sem Equipe'}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-stone-400">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhum aniversariante encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
