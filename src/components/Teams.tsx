import React, { useState, useEffect } from 'react';
import { Users, Trophy, UserPlus, Star, X, Shield } from 'lucide-react';
import { Team, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

export default function Teams({ user }: { user: User }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        setTeams(data);
        setLoading(false);
      });
  }, []);

  const handleJoinTeam = async (e: React.MouseEvent, teamId: number) => {
    e.stopPropagation();
    const res = await fetch('/api/teams/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, teamId }),
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  const handleTeamClick = async (team: Team) => {
    setSelectedTeam(team);
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/members`);
      const data = await res.json();
      setTeamMembers(data);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const closeTeamModal = () => {
    setSelectedTeam(null);
    setTeamMembers([]);
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-stone-900">Equipes do Reino</h2>
        <p className="text-stone-500">Junte-se a uma equipe e compita por pontos coletivos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => (
          <div 
            key={team.id} 
            onClick={() => handleTeamClick(team)}
            className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden group hover:border-red-200 transition-all cursor-pointer"
          >
            <div className="h-24 relative" style={{ backgroundColor: team.color }}>
              <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl bg-white p-1 shadow-md overflow-hidden">
                {team.photo ? (
                  <img src={team.photo} alt={team.name} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full rounded-xl flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundColor: team.color }}>
                    {team.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 pt-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{team.name}</h3>
                  <p className="text-sm text-stone-500">{team.description}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-red-600 font-bold">
                    <Star size={16} fill="currentColor" />
                    <span>{team.total_points}</span>
                  </div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase">Pontos Totais</p>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-stone-400" />
                  <span className="text-sm font-semibold text-stone-700">{team.member_count} membros</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-stone-400" />
                  <span className="text-sm font-semibold text-stone-700">Ranking: #1</span>
                </div>
              </div>

              {user.team_id === team.id ? (
                <div className="w-full py-3 px-4 bg-red-50 text-red-700 rounded-xl font-bold text-center border border-red-100">
                  Sua Equipe
                </div>
              ) : (
                <button
                  onClick={(e) => handleJoinTeam(e, team.id)}
                  className="w-full py-3 px-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  Entrar na Equipe
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Team Members Modal */}
      <AnimatePresence>
        {selectedTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeTeamModal}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between" style={{ borderTop: `8px solid ${selectedTeam.color}` }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                    {selectedTeam.photo ? (
                      <img src={selectedTeam.photo} alt={selectedTeam.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: selectedTeam.color }}>
                        {selectedTeam.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">{selectedTeam.name}</h3>
                    <p className="text-sm text-stone-500">{selectedTeam.member_count} membros</p>
                  </div>
                </div>
                <button onClick={closeTeamModal} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingMembers ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Membros da Equipe</h4>
                    {teamMembers.length === 0 ? (
                      <p className="text-center py-8 text-stone-500 italic">Nenhum membro encontrado.</p>
                    ) : (
                      <div className="divide-y divide-stone-50">
                        {teamMembers.map((member) => (
                          <div key={member.id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden">
                                <img 
                                  src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
                                  alt={member.name} 
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-stone-900">{member.name}</p>
                                  {member.role === 'admin' && (
                                    <Shield size={12} className="text-red-600" />
                                  )}
                                </div>
                                <p className="text-xs text-stone-500">Nível {member.level}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-red-600 font-bold text-sm">
                                <Star size={12} fill="currentColor" />
                                <span>{member.points}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 bg-stone-50 border-t border-stone-100">
                <button
                  onClick={closeTeamModal}
                  className="w-full py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-100 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
