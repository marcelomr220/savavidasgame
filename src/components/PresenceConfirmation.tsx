import React, { useState, useEffect } from 'react';
import { Users, Calendar as CalendarIcon, CheckCircle2, Search, ChevronRight, ChevronDown, UserCheck, Star, Loader2 } from 'lucide-react';
import { User, Team } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getUsers, getTeams } from '../services/api';
import { supabase } from '../lib/supabase';

export default function PresenceConfirmation() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [pointsToAward, setPointsToAward] = useState(10);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [expandedTeams, setExpandedTeams] = useState<Record<number, boolean>>({});
  const [presences, setPresences] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      fetchPresences();
    }
  }, [eventDate, users]);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("PresenceConfirmation: Starting fetchData...");
      
      // Fetch teams
      try {
        const teamsData = await getTeams();
        console.log("PresenceConfirmation: Teams fetched:", teamsData?.length);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        
        // Expand all teams by default
        const expanded: Record<number, boolean> = {};
        (teamsData || []).forEach(t => { expanded[t.id] = true; });
        setExpandedTeams(expanded);
      } catch (teamErr) {
        console.error("PresenceConfirmation: Error fetching teams:", teamErr);
      }

      // Fetch users
      try {
        const usersData = await getUsers();
        console.log("PresenceConfirmation: Users fetched:", usersData?.length);
        const activeUsers = (Array.isArray(usersData) ? usersData : []).filter(u => !u.is_disabled);
        setUsers(activeUsers);
      } catch (userErr) {
        console.error("PresenceConfirmation: Error fetching users:", userErr);
      }
      
    } catch (err) {
      console.error("PresenceConfirmation: Global error in fetchData:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresences = async () => {
    try {
      const { data, error } = await supabase
        .from('event_presences')
        .select('user_id, points_awarded')
        .eq('event_date', eventDate);
      
      if (error) throw error;
      
      const presenceMap: Record<number, number> = {};
      data?.forEach(p => {
        presenceMap[p.user_id] = p.points_awarded || 0;
      });
      setPresences(presenceMap);
    } catch (err) {
      console.error("Error fetching presences:", err);
    }
  };

  const togglePresence = async (userId: number) => {
    console.log(`PresenceConfirmation: togglePresence called for userId: ${userId}`);
    setSaving(userId);
    const pointsAwarded = presences[userId];
    const isPresent = pointsAwarded !== undefined;
    
    try {
      if (isPresent) {
        console.log(`PresenceConfirmation: Removing presence for userId: ${userId}, points: ${pointsAwarded}`);
        // Remove presence and subtract points
        const { error: deleteError } = await supabase
          .from('event_presences')
          .delete()
          .eq('user_id', userId)
          .eq('event_date', eventDate);
        
        if (deleteError) {
          console.error("PresenceConfirmation: Error deleting from event_presences:", deleteError);
          throw deleteError;
        }

        // Update user points
        const userToUpdate = users.find(u => u.id === userId);
        if (userToUpdate) {
          console.log(`PresenceConfirmation: Updating user points for ${userToUpdate.name}. Current: ${userToUpdate.points}, Subtracting: ${pointsAwarded}`);
          const { error: userError } = await supabase
            .from('users')
            .update({ points: (userToUpdate.points || 0) - pointsAwarded })
            .eq('id', userId);
          if (userError) {
            console.error("PresenceConfirmation: Error updating user points:", userError);
            throw userError;
          }

          // Update team points if user belongs to a team
          if (userToUpdate.team_id) {
            console.log(`PresenceConfirmation: Updating team points for teamId: ${userToUpdate.team_id}. Subtracting: ${pointsAwarded}`);
            const { error: teamError } = await supabase.rpc('increment_team_points', { 
              row_id: userToUpdate.team_id, 
              amount: -pointsAwarded 
            });
            if (teamError) {
              console.error("PresenceConfirmation: Error updating team points via RPC:", teamError);
              // Fallback to manual update if RPC fails
              const { data: teamData } = await supabase.from('teams').select('total_points').eq('id', userToUpdate.team_id).single();
              if (teamData) {
                await supabase.from('teams').update({ total_points: (teamData.total_points || 0) - pointsAwarded }).eq('id', userToUpdate.team_id);
              }
            }
          }
          
          // Update local state
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, points: (u.points || 0) - pointsAwarded } : u));
        }
        
        setPresences(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      } else {
        console.log(`PresenceConfirmation: Adding presence for userId: ${userId}, points: ${pointsToAward}`);
        // Add presence and add points
        const { error: insertError } = await supabase
          .from('event_presences')
          .insert([{ user_id: userId, event_date: eventDate, points_awarded: pointsToAward }]);
        
        if (insertError) {
          console.error("PresenceConfirmation: Error inserting into event_presences:", insertError);
          throw insertError;
        }

        // Update user points
        const userToUpdate = users.find(u => u.id === userId);
        if (userToUpdate) {
          console.log(`PresenceConfirmation: Updating user points for ${userToUpdate.name}. Current: ${userToUpdate.points}, Adding: ${pointsToAward}`);
          const { error: userError } = await supabase
            .from('users')
            .update({ points: (userToUpdate.points || 0) + pointsToAward })
            .eq('id', userId);
          if (userError) {
            console.error("PresenceConfirmation: Error updating user points:", userError);
            throw userError;
          }

          // Update team points if user belongs to a team
          if (userToUpdate.team_id) {
            console.log(`PresenceConfirmation: Updating team points for teamId: ${userToUpdate.team_id}. Adding: ${pointsToAward}`);
            const { error: teamError } = await supabase.rpc('increment_team_points', { 
              row_id: userToUpdate.team_id, 
              amount: pointsToAward 
            });
            if (teamError) {
              console.error("PresenceConfirmation: Error updating team points via RPC:", teamError);
              // Fallback to manual update if RPC fails
              const { data: teamData } = await supabase.from('teams').select('total_points').eq('id', userToUpdate.team_id).single();
              if (teamData) {
                await supabase.from('teams').update({ total_points: (teamData.total_points || 0) + pointsToAward }).eq('id', userToUpdate.team_id);
              }
            }
          }

          // Update local state
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, points: (u.points || 0) + pointsToAward } : u));
        }
        
        setPresences(prev => ({ ...prev, [userId]: pointsToAward }));
      }
    } catch (err: any) {
      console.error("PresenceConfirmation: Error toggling presence:", err);
      alert(`Erro ao processar presença: ${err.message || 'Verifique sua conexão.'}`);
    } finally {
      setSaving(null);
    }
  };

  const toggleTeam = (teamId: number) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  const filteredTeams = selectedTeamId === 'all' 
    ? teams 
    : teams.filter(t => t.id.toString() === selectedTeamId);

  const usersByTeam = filteredTeams.map(team => ({
    ...team,
    members: users.filter(u => u.team_id === team.id)
  })).filter(t => t.members.length > 0);

  const unassignedUsers = (selectedTeamId === 'all' || selectedTeamId === 'none') 
    ? users.filter(u => !u.team_id)
    : [];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Confirmação de Presença</h2>
            <p className="text-stone-500">Marque os usuários presentes e atribua pontos.</p>
          </div>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-3 bg-white border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            title="Recarregar dados"
          >
            <Loader2 size={20} className={loading ? "animate-spin" : ""} />
            <span className="text-sm font-bold sm:hidden">Recarregar</span>
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-stone-200 shadow-sm">
            <CalendarIcon size={18} className="text-stone-400" />
            <input 
              type="date" 
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-bold text-stone-900 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-stone-200 shadow-sm">
            <Star size={18} className="text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Pontos</span>
              <input 
                type="number" 
                value={pointsToAward}
                onChange={(e) => setPointsToAward(parseInt(e.target.value) || 0)}
                className="bg-transparent border-none focus:ring-0 font-bold text-stone-900 text-sm w-16 p-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-stone-200 shadow-sm">
            <Users size={18} className="text-stone-400" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Filtrar Equipe</span>
              <select 
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="bg-transparent border-none focus:ring-0 font-bold text-stone-900 text-sm p-0 pr-8"
              >
                <option value="all">Todas as Equipes</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id.toString()}>{t.name}</option>
                ))}
                <option value="none">Sem Equipe</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {usersByTeam.map(team => (
          <div key={team.id} className="bg-white rounded-[32px] border border-stone-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => toggleTeam(team.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden flex items-center justify-center">
                  {team.photo ? (
                    <img src={team.photo} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users size={20} className="text-stone-400" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-stone-900">{team.name}</h3>
                  <p className="text-xs text-stone-500">{team.members.length} membros</p>
                </div>
              </div>
              {expandedTeams[team.id] ? <ChevronDown size={20} className="text-stone-400" /> : <ChevronRight size={20} className="text-stone-400" />}
            </button>

            <AnimatePresence>
              {expandedTeams[team.id] && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {team.members.map(member => (
                      <PresenceButton 
                        key={member.id}
                        user={member}
                        isPresent={presences[member.id] !== undefined}
                        points={presences[member.id]}
                        isSaving={saving === member.id}
                        onClick={() => togglePresence(member.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {unassignedUsers.length > 0 && (
          <div className="bg-white rounded-[32px] border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="font-bold text-stone-900">Sem Equipe</h3>
              <p className="text-xs text-stone-500">{unassignedUsers.length} usuários</p>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassignedUsers.map(member => (
                <PresenceButton 
                  key={member.id}
                  user={member}
                  isPresent={presences[member.id] !== undefined}
                  points={presences[member.id]}
                  isSaving={saving === member.id}
                  onClick={() => togglePresence(member.id)}
                />
              ))}
            </div>
          </div>
        )}

        {usersByTeam.length === 0 && unassignedUsers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-stone-200">
            <Users size={48} className="mx-auto text-stone-200 mb-4" />
            <p className="text-stone-500">Nenhum usuário encontrado para este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PresenceButton({ user, isPresent, points, isSaving, onClick }: { user: User, isPresent: boolean, points?: number, isSaving: boolean, onClick: () => void | Promise<void>, key?: any }) {
  return (
    <button
      onClick={onClick}
      disabled={isSaving}
      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
        isPresent 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
          : 'bg-stone-50 border-stone-100 text-stone-600 hover:border-stone-200'
      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-200">
          <img 
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
            alt={user.name} 
            className="w-full h-full object-cover"
          />
        </div>
        {isPresent && (
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
            <CheckCircle2 size={12} />
          </div>
        )}
      </div>
      <div className="flex-1 text-left overflow-hidden">
        <p className="font-bold text-sm truncate">{user.name}</p>
        <div className="flex items-center gap-1">
          <p className="text-[10px] opacity-60 uppercase tracking-wider font-bold">
            {isPresent ? 'Presente' : 'Ausente'}
          </p>
          {isPresent && points !== undefined && (
            <span className="text-[10px] font-black text-emerald-600">+{points} pts</span>
          )}
        </div>
      </div>
      {isSaving && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      )}
    </button>
  );
}
