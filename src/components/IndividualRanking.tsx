import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Search } from 'lucide-react';
import { User } from '../types';
import { getUsers } from '../services/api';

export default function IndividualRanking({ user }: { user: User }) {
  const [rankings, setRankings] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getUsers()
      .then(data => {
        setRankings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching rankings:", err);
        setLoading(false);
      });
  }, []);

  const filteredRankings = rankings.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const top3 = filteredRankings.slice(0, 3);
  const others = filteredRankings.slice(3);

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Ranking Geral</h2>
          <p className="text-stone-500">Os membros mais engajados da nossa comunidade.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Buscar membro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all w-full md:w-64"
          />
        </div>
      </header>

      {/* Top 3 Podium */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 pt-8 px-4">
        {/* 2nd Place */}
        {top3[1] && (
          <div className="flex flex-col items-center order-2 md:order-1">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full border-4 border-stone-300 overflow-hidden bg-white shadow-lg">
                <img src={top3[1].avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[1].name}`} alt={top3[1].name} />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-stone-300 flex items-center justify-center text-white font-bold shadow-md">2</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-stone-800">{top3[1].name}</p>
              <p className="text-xs font-bold text-red-600">{top3[1].points} pts</p>
            </div>
            <div className="h-24 w-24 bg-stone-100 rounded-t-2xl mt-4 flex items-center justify-center">
              <Medal className="text-stone-400" size={32} />
            </div>
          </div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <div className="flex flex-col items-center order-1 md:order-2 scale-110">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full border-4 border-amber-400 overflow-hidden bg-white shadow-xl">
                <img src={top3[0].avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[0].name}`} alt={top3[0].name} />
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400">
                <Trophy size={32} fill="currentColor" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold shadow-md">1</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-stone-900 text-lg">{top3[0].name}</p>
              <p className="text-sm font-bold text-red-600">{top3[0].points} pts</p>
            </div>
            <div className="h-32 w-28 bg-amber-50 rounded-t-2xl mt-4 flex items-center justify-center border-x border-t border-amber-100">
              <Star className="text-amber-400" size={40} fill="currentColor" />
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <div className="flex flex-col items-center order-3">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full border-4 border-orange-400/50 overflow-hidden bg-white shadow-lg">
                <img src={top3[2].avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[2].name}`} alt={top3[2].name} />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold shadow-md">3</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-stone-800">{top3[2].name}</p>
              <p className="text-xs font-bold text-red-600">{top3[2].points} pts</p>
            </div>
            <div className="h-20 w-24 bg-orange-50 rounded-t-2xl mt-4 flex items-center justify-center">
              <Medal className="text-orange-400" size={32} />
            </div>
          </div>
        )}
      </div>

      {/* List View */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-stone-100">
          {others.map((u, index) => (
            <div 
              key={u.id} 
              className={`p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors ${u.id === user.id ? 'bg-red-50/50' : ''}`}
            >
              <div className="w-8 text-center font-bold text-stone-400">
                {index + 4}
              </div>
              <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden">
                <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-stone-900">{u.name}</p>
                  {u.id === user.id && (
                    <span className="px-2 py-0.5 bg-red-600 text-[10px] text-white font-bold rounded-full uppercase">Você</span>
                  )}
                </div>
                <p className="text-xs text-stone-500">{u.team_name || 'Sem Equipe'} • Nível {u.level}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-stone-900">{u.points}</p>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Pontos</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
