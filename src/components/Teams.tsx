import React, { useState, useEffect } from 'react';
import { Users, Trophy, UserPlus, Star, X, Shield } from 'lucide-react';
import { Team, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getTeams, getTeamMembers, joinTeam } from '../services/api';

export default function Teams({ user, onUpdateUser }: { user: User, onUpdateUser?: () => void }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    getTeams()
      .then(data => {
        setTeams(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching teams:", err);
        setTeams([]);
        setLoading(false);
      });
  }, []);

  const handleJoinTeam = async (e: React.MouseEvent, teamId: number) => {
    e.stopPropagation();
    try {
      await joinTeam(user.id, teamId);
      if (onUpdateUser) onUpdateUser();
    } catch (err) {
      console.error("Error joining team:", err);
    }
  };

  const handleTeamClick = async (team: Team) => {
    setSelectedTeam(team);
    setLoadingMembers(true);
    try {
      const data = await getTeamMembers(team.id);
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
              <div className="absolute -bottom-10 left-6 w-24 h-24 rounded-3xl bg-white p-1.5 shadow-xl overflow-hidden">
                {team.photo ? (
                  <img src={team.photo} alt={team.name} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full rounded-2xl flex items-center justify-center text-white font-bold text-4xl" style={{ backgroundColor: team.color }}>
                    {team.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 pt-16">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-black text-stone-900 tracking-tight truncate">{team.name}</h3>
                  <p className="text-sm text-stone-500 line-clamp-2 mt-1">{team.description}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="flex items-center justify-end gap-1 text-red-600 font-bold">
                    <Star size={16} fill="currentColor" />
                    <span>{team.total_points}</span>
                  </div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Pontos Totais</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-stone-400" />
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Membros</p>
                  </div>
                  <p className="text-sm font-bold text-stone-900">{team.member_count || 0} integrantes</p>
                </div>

                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus size={14} className="text-stone-400" />
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Monitor</p>
                  </div>
                  <p className="text-sm font-bold text-red-600 truncate">
                    {team.monitor_name || 'Não definido'}
                  </p>
                </div>
              </div>

              {user.team_id === team.id ? (
                <div className="w-full py-3 px-4 bg-red-50 text-red-700 rounded-xl font-bold text-center border border-red-100">
                  Sua Equipe
                </div>
              ) : (
                <button
                  onClick={(e) => handleJoinTeam(e, team.id)}
                  disabled={user.team_id !== null && user.team_id !== undefined}
                  className="w-full py-3 px-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="w-24 h-24 rounded-3xl bg-stone-100 overflow-hidden flex-shrink-0 shadow-xl">
                    {selectedTeam.photo ? (
                      <img src={selectedTeam.photo} alt={selectedTeam.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-4xl" style={{ backgroundColor: selectedTeam.color }}>
                        {selectedTeam.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-stone-900 tracking-tight">{selectedTeam.name}</h3>
                    <p className="text-sm text-stone-500">{selectedTeam.member_count} membros</p>
                    <div className="flex flex-col gap-1 mt-1">
                      {selectedTeam.monitor_name && (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-red-100">
                            <img 
                              src={selectedTeam.monitor_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedTeam.monitor_name}`} 
                              alt={selectedTeam.monitor_name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                            Monitor: {selectedTeam.monitor_name}
                          </p>
                        </div>
                      )}
                      {selectedTeam.leader_name && (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-amber-100">
                            <img 
                              src={selectedTeam.leader_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedTeam.leader_name}`} 
                              alt={selectedTeam.leader_name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                            Líder: {selectedTeam.leader_name}
                          </p>
                        </div>
                      )}
                    </div>
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
