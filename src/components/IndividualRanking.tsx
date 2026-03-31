import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Search, X, Flame, Zap, Shield, Users } from 'lucide-react';
import { User, Team } from '../types';
import { getUsers, getTeams } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from './Mascot';
import { getLevelData, getMascotStatus, getStageName } from '../lib/progression';

export default function IndividualRanking({ user }: { user: User }) {
  const [rankings, setRankings] = useState<User[]>([]);
  const [teamRankings, setTeamRankings] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'teams'>('individual');

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'individual') {
      getUsers()
        .then(data => {
          setRankings(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching rankings:", err);
          setRankings([]);
          setLoading(false);
        });
    } else {
      getTeams()
        .then(data => {
          setTeamRankings(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching team rankings:", err);
          setTeamRankings([]);
          setLoading(false);
        });
    }
  }, [activeTab]);

  const filteredRankings = Array.isArray(rankings) ? rankings.filter(u => 
    u && u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredTeamRankings = Array.isArray(teamRankings) ? teamRankings.filter(t => 
    t && t.name && t.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const top3 = activeTab === 'individual' ? filteredRankings.slice(0, 3) : filteredTeamRankings.slice(0, 3);
  const others = activeTab === 'individual' ? filteredRankings.slice(3) : filteredTeamRankings.slice(3);

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Ranking Geral</h2>
          <p className="text-stone-500">Os membros e equipes mais engajados da nossa comunidade.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'individual' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Individual
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'teams' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Equipes
            </button>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'individual' ? "Buscar membro..." : "Buscar equipe..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all w-full md:w-64"
            />
          </div>
        </div>
      </header>

      {/* Top 3 Podium */}
      <div className="flex flex-row items-end justify-center gap-1 sm:gap-8 pt-12 px-1 sm:px-4">
        {/* 2nd Place */}
        {top3[1] && (
          <motion.div 
            whileTap={{ scale: 0.95 }}
            onClick={() => activeTab === 'individual' ? setSelectedUser(top3[1] as User) : null}
            className={`flex flex-col items-center flex-1 max-w-[110px] sm:max-w-none ${activeTab === 'individual' ? 'cursor-pointer' : ''}`}
          >
            <div className="relative mb-4">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-4 border-stone-300 overflow-hidden bg-white shadow-lg flex items-center justify-center">
                {activeTab === 'individual' ? (
                  <img src={(top3[1] as User).avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[1].name}`} alt={top3[1].name} referrerPolicy="no-referrer" />
                ) : (
                  (top3[1] as Team).photo ? (
                    <img src={(top3[1] as Team).photo} alt={top3[1].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundColor: (top3[1] as Team).color }}>
                      {top3[1].name.charAt(0)}
                    </div>
                  )
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-stone-300 flex items-center justify-center text-white text-xs sm:text-base font-bold shadow-md">2</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-stone-800 text-[10px] sm:text-sm truncate w-20 sm:w-auto">{top3[1].name}</p>
              <p className="text-[10px] sm:text-xs font-bold text-red-600">{activeTab === 'individual' ? (top3[1] as User).points : (top3[1] as Team).total_points} pts</p>
            </div>
            <div className="h-16 sm:h-24 w-full sm:w-24 bg-stone-100 rounded-t-2xl mt-4 flex items-center justify-center">
              <Medal className="text-stone-400" size={24} />
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <motion.div 
            whileTap={{ scale: 0.95 }}
            onClick={() => activeTab === 'individual' ? setSelectedUser(top3[0] as User) : null}
            className={`flex flex-col items-center flex-1 max-w-[130px] sm:max-w-none scale-110 z-10 ${activeTab === 'individual' ? 'cursor-pointer' : ''}`}
          >
            <div className="relative mb-4">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-4 border-amber-400 overflow-hidden bg-white shadow-xl flex items-center justify-center">
                {activeTab === 'individual' ? (
                  <img src={(top3[0] as User).avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[0].name}`} alt={top3[0].name} referrerPolicy="no-referrer" />
                ) : (
                  (top3[0] as Team).photo ? (
                    <img src={(top3[0] as Team).photo} alt={top3[0].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl" style={{ backgroundColor: (top3[0] as Team).color }}>
                      {top3[0].name.charAt(0)}
                    </div>
                  )
                )}
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs sm:text-base font-bold shadow-md">1</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-stone-900 text-xs sm:text-lg truncate w-24 sm:w-auto">{top3[0].name}</p>
              <p className="text-[10px] sm:text-sm font-bold text-red-600">{activeTab === 'individual' ? (top3[0] as User).points : (top3[0] as Team).total_points} pts</p>
            </div>
            <div className="h-24 sm:h-32 w-full sm:w-28 bg-amber-50 rounded-t-2xl mt-4 flex items-center justify-center border-x border-t border-amber-100">
              <Star className="text-amber-400 w-7 h-7 sm:w-10 sm:h-10" fill="currentColor" />
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <motion.div 
            whileTap={{ scale: 0.95 }}
            onClick={() => activeTab === 'individual' ? setSelectedUser(top3[2] as User) : null}
            className={`flex flex-col items-center flex-1 max-w-[110px] sm:max-w-none ${activeTab === 'individual' ? 'cursor-pointer' : ''}`}
          >
            <div className="relative mb-4">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-4 border-orange-400/50 overflow-hidden bg-white shadow-lg flex items-center justify-center">
                {activeTab === 'individual' ? (
                  <img src={(top3[2] as User).avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[2].name}`} alt={top3[2].name} referrerPolicy="no-referrer" />
                ) : (
                  (top3[2] as Team).photo ? (
                    <img src={(top3[2] as Team).photo} alt={top3[2].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundColor: (top3[2] as Team).color }}>
                      {top3[2].name.charAt(0)}
                    </div>
                  )
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs sm:text-base font-bold shadow-md">3</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-stone-800 text-[10px] sm:text-sm truncate w-20 sm:w-auto">{top3[2].name}</p>
              <p className="text-[10px] sm:text-xs font-bold text-red-600">{activeTab === 'individual' ? (top3[2] as User).points : (top3[2] as Team).total_points} pts</p>
            </div>
            <div className="h-12 sm:h-20 w-full sm:w-24 bg-orange-50 rounded-t-2xl mt-4 flex items-center justify-center">
              <Medal className="text-orange-400" size={24} />
            </div>
          </motion.div>
        )}
      </div>

      {/* List View */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-stone-100">
          {activeTab === 'individual' ? (
            (others as User[]).map((u, index) => (
              <div 
                key={u.id} 
                onClick={() => setSelectedUser(u)}
                className={`p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors cursor-pointer ${u.id === user.id ? 'bg-red-50/50' : ''}`}
              >
                <div className="w-8 text-center font-bold text-stone-400">
                  {index + 4}
                </div>
                <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden">
                  <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-stone-900">{u.name}</p>
                    {u.id === user.id && (
                      <span className="px-2 py-0.5 bg-red-600 text-[10px] text-white font-bold rounded-full uppercase">Você</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">{u.team_name || 'Sem Equipe'} • Nível {getLevelData(u.points).level}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-stone-900">{u.points}</p>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Pontos</p>
                </div>
              </div>
            ))
          ) : (
            (others as Team[]).map((t, index) => (
              <div 
                key={t.id} 
                className={`p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors ${t.id === user.team_id ? 'bg-red-50/50' : ''}`}
              >
                <div className="w-8 text-center font-bold text-stone-400">
                  {index + 4}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-stone-200 overflow-hidden flex items-center justify-center shadow-sm">
                  {t.photo ? (
                    <img src={t.photo} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: t.color }}>
                      {t.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-stone-900 tracking-tight">{t.name}</p>
                    {t.id === user.team_id && (
                      <span className="px-2 py-0.5 bg-red-600 text-[10px] text-white font-bold rounded-full uppercase">Sua Equipe</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{t.member_count} membros</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {t.monitor_name && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-red-100">
                            <img 
                              src={t.monitor_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.monitor_name}`} 
                              alt={t.monitor_name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Monitor: {t.monitor_name}</span>
                        </div>
                      )}
                      {t.leader_name && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-amber-100">
                            <img 
                              src={t.leader_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.leader_name}`} 
                              alt={t.leader_name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Líder: {t.leader_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-stone-900">{t.total_points}</p>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Pontos</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="relative h-32 bg-red-600">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="px-8 pb-8">
                <div className="relative -mt-16 mb-6 flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="w-32 h-32 rounded-[40px] border-8 border-white overflow-hidden bg-white shadow-xl mx-auto">
                      <img 
                        src={selectedUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.name}`} 
                        alt={selectedUser.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  
                  {/* Mascot and Stage */}
                  <div className="flex flex-col items-center gap-2">
                    <Mascot 
                      size="md" 
                      level={getLevelData(selectedUser.points).level} 
                      progress={getLevelData(selectedUser.points).progress}
                      status={getMascotStatus(selectedUser.last_activity_at)} 
                    />
                    <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest border border-primary/20">
                      {getStageName(getLevelData(selectedUser.points).stage)}
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-2 mb-8">
                  <h3 className="text-2xl font-bold text-stone-900">{selectedUser.name}</h3>
                  <p className="text-stone-500 font-medium">{selectedUser.team_name || 'Sem Equipe'}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-stone-50 p-4 rounded-3xl text-center">
                    <div className="w-8 h-8 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Zap size={18} fill="currentColor" />
                    </div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">XP</p>
                    <p className="text-lg font-bold text-stone-900">{selectedUser.points}</p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-3xl text-center">
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Trophy size={18} fill="currentColor" />
                    </div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Nível</p>
                    <p className="text-lg font-bold text-stone-900">{getLevelData(selectedUser.points).level}</p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-3xl text-center">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Shield size={18} fill="currentColor" />
                    </div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Rank</p>
                    <p className="text-lg font-bold text-stone-900">#{rankings.findIndex(u => u.id === selectedUser.id) + 1}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
