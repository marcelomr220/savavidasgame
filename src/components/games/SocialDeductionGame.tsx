import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Play, 
  Skull, 
  Megaphone, 
  CheckCircle2, 
  AlertTriangle, 
  Timer, 
  User as UserIcon,
  Shield,
  Ghost,
  Trophy,
  LogOut,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { 
  User, 
  GameMatch, 
  GamePlayer, 
  GameTask, 
  GamePlayerTask, 
  GameEvent, 
  GameVote 
} from '../../types';
import { 
  getGameMatches, 
  createGameMatch, 
  joinGameMatch, 
  getGamePlayers, 
  startGameMatch,
  getPlayerTasks,
  completeGameTask,
  killPlayer,
  reportBody,
  votePlayer,
  getGameVotes,
  endGameMatch
} from '../../services/api';

interface SocialDeductionGameProps {
  user: User;
  onUpdateUser?: () => void;
}

export default function SocialDeductionGame({ user, onUpdateUser }: SocialDeductionGameProps) {
  const [matches, setMatches] = useState<GameMatch[]>([]);
  const [currentMatch, setCurrentMatch] = useState<GameMatch | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [me, setMe] = useState<GamePlayer | null>(null);
  const [tasks, setTasks] = useState<(GamePlayerTask & { task: GameTask })[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMatchName, setNewMatchName] = useState('');
  const [meetingEvent, setMeetingEvent] = useState<GameEvent | null>(null);
  const [votes, setVotes] = useState<GameVote[]>([]);
  const [voteTimer, setVoteTimer] = useState(0);
  const [killCooldown, setKillCooldown] = useState(0);

  const fetchMatches = useCallback(async () => {
    try {
      const data = await getGameMatches();
      setMatches(data);
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Real-time subscription for matches
  useEffect(() => {
    const channel = supabase
      .channel('game_matches_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMatches]);

  // Real-time subscription for current match
  useEffect(() => {
    if (!currentMatch) return;

    const channel = supabase
      .channel(`match_${currentMatch.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'game_players',
        filter: `match_id=eq.${currentMatch.id}`
      }, async () => {
        const updatedPlayers = await getGamePlayers(currentMatch.id);
        setPlayers(updatedPlayers);
        const myPlayer = updatedPlayers.find(p => p.user_id === user.id);
        if (myPlayer) setMe(myPlayer);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_events',
        filter: `match_id=eq.${currentMatch.id}`
      }, (payload) => {
        const newEvent = payload.new as GameEvent;
        setEvents(prev => [newEvent, ...prev]);
        if (newEvent.type === 'report' || newEvent.type === 'meeting') {
          setMeetingEvent(newEvent);
          setVoteTimer(30);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_votes',
        filter: `match_id=eq.${currentMatch.id}`
      }, async () => {
        if (meetingEvent) {
          const updatedVotes = await getGameVotes(meetingEvent.id);
          setVotes(updatedVotes);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_matches',
        filter: `id=eq.${currentMatch.id}`
      }, (payload) => {
        setCurrentMatch(payload.new as GameMatch);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMatch, user.id, meetingEvent]);

  // Fetch match details when joining
  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!currentMatch) return;
      const matchPlayers = await getGamePlayers(currentMatch.id);
      setPlayers(matchPlayers);
      const myPlayer = matchPlayers.find(p => p.user_id === user.id);
      if (myPlayer) {
        setMe(myPlayer);
        if (myPlayer.role === 'crewmate') {
          const myTasks = await getPlayerTasks(myPlayer.id);
          setTasks(myTasks);
        }
      }
    };
    fetchMatchDetails();
  }, [currentMatch, user.id]);

  // Vote timer logic
  useEffect(() => {
    if (voteTimer > 0) {
      const timer = setInterval(() => setVoteTimer(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (voteTimer === 0 && meetingEvent) {
      handleMeetingEnd();
    }
  }, [voteTimer, meetingEvent]);

  // Kill cooldown logic
  useEffect(() => {
    if (killCooldown > 0) {
      const timer = setInterval(() => setKillCooldown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [killCooldown]);

  const handleCreateMatch = async () => {
    console.log("handleCreateMatch called with name:", newMatchName);
    if (!newMatchName.trim()) {
      console.warn("Match name is empty");
      return;
    }
    try {
      console.log("Creating match...");
      const match = await createGameMatch(newMatchName);
      console.log("Match created:", match);
      console.log("Joining match...");
      const player = await joinGameMatch(match.id, user.id, user.name, user.avatar);
      console.log("Joined match as player:", player);
      setCurrentMatch(match);
      setMe(player);
      setShowCreateModal(false);
      setNewMatchName('');
    } catch (err) {
      console.error("Error creating match:", err);
    }
  };

  const handleJoinMatch = async (match: GameMatch) => {
    try {
      const player = await joinGameMatch(match.id, user.id, user.name, user.avatar);
      setCurrentMatch(match);
      setMe(player);
    } catch (err) {
      console.error("Error joining match:", err);
    }
  };

  const handleStartGame = async () => {
    if (!currentMatch) return;
    try {
      await startGameMatch(currentMatch.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteTask = async (task: GamePlayerTask & { task: GameTask }) => {
    if (!me || !currentMatch) return;
    try {
      await completeGameTask(task.id, me.id, currentMatch.id);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
    } catch (err) {
      console.error("Error completing task:", err);
    }
  };

  const handleKill = async (targetId: string) => {
    if (!me || !currentMatch || killCooldown > 0) return;
    try {
      await killPlayer(targetId, me.id, currentMatch.id);
      setKillCooldown(30);
    } catch (err) {
      console.error("Error killing player:", err);
    }
  };

  const handleReport = async () => {
    if (!me || !currentMatch) return;
    try {
      await reportBody(me.id, currentMatch.id);
    } catch (err) {
      console.error("Error reporting body:", err);
    }
  };

  const handleVote = async (votedPlayerId: string | null) => {
    if (!me || !currentMatch || !meetingEvent) return;
    // Check if already voted
    if (votes.some(v => v.voter_id === me.id)) return;
    
    try {
      await votePlayer(me.id, votedPlayerId, currentMatch.id, meetingEvent.id);
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  const handleMeetingEnd = async () => {
    if (!currentMatch || !meetingEvent) return;
    
    // Process votes
    const voteCounts: Record<string, number> = {};
    votes.forEach(v => {
      if (v.voted_player_id) {
        voteCounts[v.voted_player_id] = (voteCounts[v.voted_player_id] || 0) + 1;
      }
    });

    let maxVotes = 0;
    let votedOutId: string | null = null;
    let tie = false;

    Object.entries(voteCounts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        votedOutId = id;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    });

    if (votedOutId && !tie) {
      await killPlayer(votedOutId, 'system', currentMatch.id);
    }

    setMeetingEvent(null);
    setVotes([]);
    setVoteTimer(0);
  };

  const handleLeaveMatch = () => {
    setCurrentMatch(null);
    setMe(null);
    setPlayers([]);
    setTasks([]);
    setEvents([]);
    setMeetingEvent(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Timer className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  // LOBBY LIST
  if (!currentMatch) {
    return (
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Infiltrados no Reino</h2>
            <p className="text-stone-500">Dedução social e mistério na comunidade.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-200"
          >
            <Plus size={20} />
            Nova Partida
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.filter(m => m.status !== 'finished').map((match) => (
            <div key={match.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:border-red-200 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-stone-900">{match.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  match.status === 'waiting' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {match.status === 'waiting' ? 'Aguardando' : 'Em Progresso'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-500">
                  <Users size={18} />
                  <span className="text-sm font-medium">Partida Pública</span>
                </div>
                <button 
                  onClick={() => handleJoinMatch(match)}
                  className="bg-stone-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-stone-800 transition-all"
                >
                  Entrar
                </button>
              </div>
            </div>
          ))}
          {matches.filter(m => m.status !== 'finished').length === 0 && (
            <div className="col-span-full py-12 text-center bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
              <Ghost className="mx-auto text-stone-300 mb-4" size={48} />
              <p className="text-stone-500 font-medium">Nenhuma partida ativa no momento.</p>
            </div>
          )}
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
              >
                <h3 className="text-2xl font-bold text-stone-900 mb-6">Criar Partida</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Nome da Partida</label>
                    <input 
                      type="text"
                      value={newMatchName}
                      onChange={(e) => setNewMatchName(e.target.value)}
                      placeholder="Ex: Templo Sagrado"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-3 text-stone-500 font-bold hover:bg-stone-50 rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleCreateMatch}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                    >
                      Criar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // MATCH LOBBY
  if (currentMatch.status === 'waiting') {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <button onClick={handleLeaveMatch} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <LogOut size={24} className="text-stone-500" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-stone-900">{currentMatch.name}</h2>
            <p className="text-stone-500">Lobby da Partida</p>
          </div>
          <div className="w-10" />
        </header>

        <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-xl space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {players.map((player) => (
              <div key={player.id} className="flex flex-col items-center gap-2 p-4 bg-stone-50 rounded-3xl border border-stone-100">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="text-red-600" size={32} />
                  )}
                </div>
                <span className="text-sm font-bold text-stone-900 truncate w-full text-center">{player.name}</span>
                {player.user_id === user.id && (
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Você</span>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 bg-stone-50/50 rounded-3xl border border-dashed border-stone-200 opacity-50">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center">
                  <Users className="text-stone-300" size={24} />
                </div>
                <span className="text-xs font-medium text-stone-400">Aguardando...</span>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <button 
              onClick={handleStartGame}
              disabled={players.length < 3}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
            >
              <Play size={20} fill="currentColor" />
              Iniciar Partida ({players.length}/10)
            </button>
            {players.length < 3 && (
              <p className="text-center text-xs text-stone-400 mt-4">Mínimo de 3 jogadores necessários.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MEETING SCREEN
  if (meetingEvent) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full font-bold text-sm">
            <Megaphone size={18} />
            REUNIÃO DE EMERGÊNCIA
          </div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">QUEM É O INFILTRADO?</h2>
          <div className="flex items-center justify-center gap-2 text-stone-500 font-bold">
            <Timer size={18} className="text-red-600" />
            <span>Votação encerra em {voteTimer}s</span>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {players.map((player) => (
            <button
              key={player.id}
              disabled={!me?.is_alive || !player.is_alive || votes.some(v => v.voter_id === me.id)}
              onClick={() => handleVote(player.id)}
              className={`p-4 rounded-3xl border-2 transition-all flex items-center gap-4 relative overflow-hidden ${
                !player.is_alive 
                  ? 'bg-stone-100 border-stone-200 grayscale opacity-50 cursor-not-allowed'
                  : votes.some(v => v.voter_id === me?.id && v.voted_player_id === player.id)
                  ? 'bg-red-50 border-red-500 shadow-md'
                  : 'bg-white border-stone-100 hover:border-red-200 shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden">
                {player.avatar ? (
                  <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="text-stone-400" size={24} />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-stone-900">{player.name}</p>
                <p className="text-xs text-stone-500">{player.is_alive ? 'Vivo' : 'Eliminado'}</p>
              </div>
              
              {/* Vote indicators */}
              <div className="flex -space-x-2">
                {votes.filter(v => v.voted_player_id === player.id).map((v, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                    ✓
                  </div>
                ))}
              </div>
            </button>
          ))}
          
          <button
            disabled={!me?.is_alive || votes.some(v => v.voter_id === me.id)}
            onClick={() => handleVote(null)}
            className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-center gap-4 col-span-full ${
              votes.some(v => v.voter_id === me?.id && v.voted_player_id === null)
              ? 'bg-stone-200 border-stone-400'
              : 'bg-stone-100 border-stone-200 hover:bg-stone-200'
            }`}
          >
            <span className="font-bold text-stone-600">Pular Votação</span>
            <div className="flex -space-x-2">
              {votes.filter(v => v.voted_player_id === null).map((v, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-stone-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                  ✓
                </div>
              ))}
            </div>
          </button>
        </div>
      </div>
    );
  }

  // GAME RESULTS
  if (currentMatch.status === 'finished') {
    const isWinner = me?.role === currentMatch.winner_role;
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-12">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6"
        >
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-2xl ${
            isWinner ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {isWinner ? <Trophy size={48} /> : <Skull size={48} />}
          </div>
          
          <div>
            <h2 className={`text-5xl font-black tracking-tighter mb-2 ${
              currentMatch.winner_role === 'crewmate' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {currentMatch.winner_role === 'crewmate' ? 'VITÓRIA DOS TRIPULANTES' : 'VITÓRIA DOS IMPOSTORES'}
            </h2>
            <p className="text-xl font-bold text-stone-500">
              {isWinner ? 'Parabéns! Você venceu a partida.' : 'Não foi desta vez. Tente novamente!'}
            </p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-xl space-y-6">
            <h3 className="font-bold text-stone-900 border-b border-stone-100 pb-4">Revelação dos Papéis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {players.map((player) => (
                <div key={player.id} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <div className="w-10 h-10 rounded-lg bg-stone-200 overflow-hidden">
                    {player.avatar && <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-stone-900 text-sm">{player.name}</p>
                    <p className={`text-xs font-bold uppercase tracking-widest ${
                      player.role === 'impostor' ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {player.role === 'impostor' ? 'Infiltrado' : 'Tripulante'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleLeaveMatch}
            className="px-12 py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl"
          >
            Voltar ao Lobby
          </button>
        </motion.div>
      </div>
    );
  }

  // ACTIVE GAME SCREEN
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Game Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900 p-6 rounded-[2.5rem] text-white shadow-2xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
            me?.role === 'impostor' ? 'bg-red-600' : 'bg-emerald-600'
          }`}>
            {me?.role === 'impostor' ? <Skull size={32} /> : <Shield size={32} />}
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">
              {me?.role === 'impostor' ? 'Você é o Infiltrado' : 'Você é um Tripulante'}
            </h2>
            <p className="text-stone-400 text-sm font-medium">
              {me?.role === 'impostor' ? 'Elimine os tripulantes sem ser descoberto.' : 'Complete suas tarefas e descubra o infiltrado.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
          <div className="text-center">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Status</p>
            <p className={`text-sm font-black ${me?.is_alive ? 'text-emerald-400' : 'text-red-400'}`}>
              {me?.is_alive ? 'VIVO' : 'ELIMINADO'}
            </p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Progresso</p>
            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${(tasks.filter(t => t.completed).length / Math.max(1, tasks.length)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks / Actions Column */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-xl">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-red-600" />
              {me?.role === 'impostor' ? 'Ações de Infiltrado' : 'Suas Tarefas'}
            </h3>
            
            <div className="space-y-4">
              {me?.role === 'crewmate' ? (
                tasks.map((task) => (
                  <button
                    key={task.id}
                    disabled={task.completed || !me.is_alive}
                    onClick={() => handleCompleteTask(task)}
                    className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${
                      task.completed 
                        ? 'bg-emerald-50 border-emerald-100 opacity-75' 
                        : 'bg-stone-50 border-stone-100 hover:border-red-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        task.completed ? 'bg-emerald-500 text-white' : 'bg-white text-stone-400 group-hover:text-red-600'
                      }`}>
                        {task.completed ? <CheckCircle2 size={24} /> : <Timer size={24} />}
                      </div>
                      <div className="text-left">
                        <p className={`font-bold ${task.completed ? 'text-emerald-700 line-through' : 'text-stone-900'}`}>
                          {task.task.title}
                        </p>
                        <p className="text-xs text-stone-500">{task.task.description}</p>
                      </div>
                    </div>
                    {!task.completed && (
                      <div className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        +{task.task.points} pts
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="space-y-4">
                  <div className="p-6 bg-red-50 border border-red-100 rounded-3xl space-y-4">
                    <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                      <AlertTriangle size={18} />
                      Ações Mortais
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {players.filter(p => p.is_alive && p.role === 'crewmate').map(p => (
                        <button
                          key={p.id}
                          disabled={!me?.is_alive || killCooldown > 0}
                          onClick={() => handleKill(p.id)}
                          className="flex items-center gap-3 p-3 bg-white border border-red-200 rounded-2xl hover:bg-red-600 hover:text-white transition-all group disabled:opacity-50 disabled:grayscale"
                        >
                          <Skull size={18} className="text-red-600 group-hover:text-white" />
                          <span className="font-bold text-sm truncate">Eliminar {p.name}</span>
                        </button>
                      ))}
                    </div>
                    {killCooldown > 0 && (
                      <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-sm pt-2">
                        <Timer size={16} className="animate-pulse" />
                        Recarga: {killCooldown}s
                      </div>
                    )}
                  </div>
                  
                  <button
                    disabled={!me?.is_alive}
                    className="w-full p-6 bg-stone-900 text-white rounded-3xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-3 shadow-xl"
                  >
                    <Megaphone size={24} />
                    Acionar Sabotagem (Em breve)
                  </button>
                </div>
              )}
            </div>
          </section>

          <button
            disabled={!me?.is_alive}
            onClick={handleReport}
            className="w-full p-8 bg-amber-500 text-white rounded-[2.5rem] font-black text-2xl hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale"
          >
            <Megaphone size={32} fill="currentColor" />
            DENUNCIAR CORPO
          </button>
        </div>

        {/* Players List Column */}
        <div className="space-y-6">
          <section className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-xl">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Users className="text-red-600" />
              Jogadores ({players.filter(p => p.is_alive).length} Vivos)
            </h3>
            
            <div className="space-y-3">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    !player.is_alive 
                      ? 'bg-stone-100 border-stone-200 opacity-50 grayscale' 
                      : 'bg-stone-50 border-stone-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-200 overflow-hidden relative">
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <UserIcon size={20} />
                      </div>
                    )}
                    {!player.is_alive && (
                      <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                        <Skull size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${!player.is_alive ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                      {player.name}
                    </p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      {player.is_alive ? 'Ativo' : 'Eliminado'}
                    </p>
                  </div>
                  {player.user_id === user.id && (
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="bg-stone-900 p-8 rounded-[2.5rem] text-white space-y-4">
            <h4 className="font-bold text-stone-400 text-xs uppercase tracking-widest">Histórico de Eventos</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {events.map((event) => (
                <div key={event.id} className="text-xs py-2 border-b border-white/5 last:border-0">
                  <span className="text-stone-500 mr-2">{new Date(event.created_at).toLocaleTimeString()}</span>
                  <span className="font-medium">
                    {event.type === 'kill' && '⚠️ Alguém foi eliminado!'}
                    {event.type === 'report' && '🚨 Um corpo foi encontrado!'}
                    {event.type === 'meeting' && '📢 Reunião iniciada!'}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-stone-600 text-xs italic">Nenhum evento registrado ainda.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
