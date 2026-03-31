import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Lock, 
  ChevronRight, 
  Trophy, 
  Send, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Lightbulb,
  HelpCircle,
  Key,
  FileText,
  Bell,
  History,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, InvestigationCase, InvestigationClue, InvestigationHint, InvestigationNotification, InvestigationTeamLog, InvestigationTeamAttempt, Team } from '../types';
import { supabase } from '../lib/supabase';
import { purchaseInvestigationHint, addPointsToTeam, getPurchasedHints, submitInvestigationAnswer, getInvestigationRanking, getInvestigationTeamLogs, getInvestigationTeamAttempt } from '../services/api';

export default function InvestigationMode({ user }: { user: User }) {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [activeCase, setActiveCase] = useState<InvestigationCase | null>(null);
  const [clues, setClues] = useState<InvestigationClue[]>([]);
  const [hints, setHints] = useState<InvestigationHint[]>([]);
  const [purchasedHintIds, setPurchasedHintIds] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [teamLogs, setTeamLogs] = useState<InvestigationTeamLog[]>([]);
  const [teamAttempt, setTeamAttempt] = useState<InvestigationTeamAttempt | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSolved, setHasSolved] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [showHintModal, setShowHintModal] = useState<InvestigationHint | null>(null);
  const [showMemberSelection, setShowMemberSelection] = useState<InvestigationHint | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const fetchUnreadNotifications = async (caseId: string) => {
    // Get all notifications for this case
    const { data: notifications } = await supabase
      .from('investigation_notifications')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (!notifications || notifications.length === 0) return;

    // Get seen notifications for this user
    const { data: seen } = await supabase
      .from('user_investigation_notifications')
      .select('notification_id')
      .eq('user_id', user.id);

    const seenIds = new Set((seen || []).map(s => s.notification_id));
    const unread = notifications.filter(n => !seenIds.has(n.id));

    if (unread.length > 0) {
      // Show the most recent unread one
      setToast(unread[0].message);
      
      // Mark all as seen
      const toInsert = unread.map(n => ({
        user_id: user.id,
        notification_id: n.id
      }));
      await supabase.from('user_investigation_notifications').insert(toInsert);
      
      setTimeout(() => setToast(null), 5000);
    }
  };

  const fetchRanking = async (caseId: string) => {
    try {
      const data = await getInvestigationRanking(caseId);
      setRanking(data);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  };

  useEffect(() => {
    const fetchCases = async () => {
      setIsLoading(true);
      
      // Fetch all active cases
      const { data: casesRes, error } = await supabase
        .from('investigation_cases')
        .select('*')
        .eq('is_active', true);
      
      console.log("Investigation cases:", casesRes);

      if (error) {
        console.error("Error fetching investigation cases:", error);
      }

      setCases(casesRes || []);
      setIsLoading(false);
    };

    fetchCases();
  }, []);

  useEffect(() => {
    if (!activeCase) return;

    const fetchCaseDetails = async () => {
      const now = new Date().toISOString();
      
      // Fetch team info
      if (user.team_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', user.team_id)
          .single();
        setUserTeam(teamData as Team);
      }

      // Fetch all clues for the case that have been released
      const { data: cluesRes } = await supabase
        .from('investigation_clues')
        .select('*')
        .eq('case_id', activeCase.id)
        .lte('release_datetime', now)
        .order('release_datetime', { ascending: true });
      
      setClues(cluesRes || []);

      // Fetch all hints for the case that have been released
      const { data: hintsRes } = await supabase
        .from('investigation_hints')
        .select('*')
        .eq('case_id', activeCase.id)
        .lte('release_datetime', now)
        .order('release_datetime', { ascending: true });
      
      setHints(hintsRes || []);

      // Fetch purchased hints for the team
      if (user.team_id) {
        const purchased = await getPurchasedHints(user.team_id);
        setPurchasedHintIds(purchased);

        // Fetch team members
        const { data: members } = await supabase
          .from('users')
          .select('*')
          .eq('team_id', user.team_id)
          .order('points', { ascending: false });
        setTeamMembers(members || []);

        // Check if user's team already solved it and count attempts
        const { data: answers } = await supabase
          .from('team_answers')
          .select('is_correct')
          .eq('case_id', activeCase.id)
          .eq('team_id', user.team_id);
        
        const solveRes = (answers || []).find(a => a.is_correct);
        setHasSolved(!!solveRes);
        
        // Fetch team attempts
        const attemptData = await getInvestigationTeamAttempt(activeCase.id, user.team_id);
        setTeamAttempt(attemptData);
        setAttemptsCount(attemptData?.attempts_used || 0);
      }

      // Fetch logs
      const logs = await getInvestigationTeamLogs(activeCase.id);
      setTeamLogs(logs);

      // Fetch ranking
      fetchRanking(activeCase.id);

      // Check for unread notifications
      fetchUnreadNotifications(activeCase.id);
    };

    fetchCaseDetails();

    // Refresh clues and hints every 60 seconds to catch newly released ones
    const refreshInterval = setInterval(fetchCaseDetails, 60000);

    // Real-time for new clues/hints/notifications/ranking
    const updatesSub = supabase
      .channel('investigation-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'investigation_clues' }, (payload) => {
        if (payload.new.case_id === activeCase.id) {
          const now = new Date();
          const releaseDate = new Date(payload.new.release_datetime);
          
          if (releaseDate <= now) {
            setClues(prev => {
              if (prev.find(c => c.id === payload.new.id)) return prev;
              const updated = [...prev, payload.new as InvestigationClue].sort((a, b) => 
                new Date(a.release_datetime).getTime() - new Date(b.release_datetime).getTime()
              );
              return updated;
            });
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'investigation_hints' }, (payload) => {
        if (payload.new.case_id === activeCase.id) {
          const now = new Date();
          const releaseDate = new Date(payload.new.release_datetime);
          
          if (releaseDate <= now) {
            setHints(prev => {
              if (prev.find(h => h.id === payload.new.id)) return prev;
              const updated = [...prev, payload.new as InvestigationHint].sort((a, b) => 
                new Date(a.release_datetime).getTime() - new Date(b.release_datetime).getTime()
              );
              return updated;
            });
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'investigation_notifications' }, (payload) => {
        if (payload.new.case_id === activeCase.id) {
          setToast(payload.new.message);
          setTimeout(() => setToast(null), 5000);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_answers' }, (payload) => {
        if (payload.new.case_id === activeCase.id) {
          fetchRanking(activeCase.id);
          if (user.team_id === payload.new.team_id && payload.new.is_correct) {
            setHasSolved(true);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, () => {
        fetchRanking(activeCase.id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'investigation_team_logs' }, (payload) => {
        if (payload.new.case_id === activeCase.id) {
          // Fetch team name for the new log
          supabase.from('teams').select('name').eq('id', payload.new.team_id).single().then(({ data }) => {
            const newLog = { ...payload.new, team_name: data?.name } as InvestigationTeamLog;
            setTeamLogs(prev => [newLog, ...prev]);
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'investigation_team_attempts' }, (payload) => {
        if (payload.new.case_id === activeCase.id && payload.new.team_id === user.team_id) {
          setTeamAttempt(payload.new as InvestigationTeamAttempt);
          setAttemptsCount(payload.new.attempts_used);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'investigation_team_attempts' }, (payload) => {
        if (payload.new.case_id === activeCase.id && payload.new.team_id === user.team_id) {
          setTeamAttempt(payload.new as InvestigationTeamAttempt);
          setAttemptsCount(payload.new.attempts_used);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(updatesSub);
      clearInterval(refreshInterval);
    };
  }, [user.team_id, activeCase?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !user.team_id || !answer.trim() || hasSolved) return;

    // Check max attempts (client-side check)
    if (activeCase.max_attempts && attemptsCount >= activeCase.max_attempts) {
      setFeedback({ type: 'error', text: 'Limite de tentativas atingido para este caso.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await submitInvestigationAnswer(user.id, user.team_id, activeCase.id, answer);

      if (result.isCorrect) {
        setHasSolved(true);
        setFeedback({ type: 'success', text: `MISTÉRIO DESVENDADO! Sua equipe ganhou ${result.points} pontos!` });
        setAnswer('');
        fetchRanking(activeCase.id);
      } else {
        setFeedback({ type: 'error', text: 'Resposta incorreta. Continue investigando!' });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', text: error.message || 'Erro ao enviar resposta.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchaseHint = async (hint: InvestigationHint, payingUserId: number) => {
    if (!user.team_id || !activeCase) return;
    
    setIsPurchasing(true);
    try {
      await purchaseInvestigationHint(payingUserId, user.team_id, hint.id, hint.cost_points, activeCase.id);
      setPurchasedHintIds(prev => [...prev, hint.id]);
      setShowMemberSelection(null);
      setShowHintModal(hint);
      setToast(`Dica adquirida!`);
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setToast(err.message || 'Erro ao adquirir dica');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsPurchasing(false);
    }
  };

  const onHintClick = (hint: InvestigationHint) => {
    if (purchasedHintIds.includes(hint.id)) {
      setShowHintModal(hint);
    } else {
      setShowMemberSelection(hint);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Clock className="animate-spin text-stone-400" size={40} />
        <p className="text-stone-500 font-bold">Carregando Mistério...</p>
      </div>
    );
  }

  if (!activeCase) {
    if (cases.length === 0) {
      return (
        <div className="py-20 text-center">
          <p className="text-stone-500 font-bold text-lg">Nenhum jogo disponível</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <header>
          <h2 className="text-2xl font-bold text-stone-900">Investigações Disponíveis</h2>
          <p className="text-stone-500">Escolha um mistério para desvendar.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cases.map((game) => (
            <div key={game.id} className="game-card bg-white p-8 rounded-[40px] border border-stone-100 shadow-sm hover:border-red-200 hover:shadow-md transition-all flex flex-col gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-stone-900">{game.title}</h2>
                  <div className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {game.reward_points || 100} XP
                  </div>
                </div>
                {game.description && (
                  <p className="text-stone-500 leading-relaxed italic">"{game.description}"</p>
                )}
              </div>
              <button 
                onClick={() => setActiveCase(game)}
                className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
              >
                Entrar na investigação
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Back to list button */}
      <button 
        onClick={() => setActiveCase(null)}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold transition-colors"
      >
        <ChevronRight className="rotate-180" size={18} />
        Ver outras investigações
      </button>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[200] bg-stone-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-stone-700 min-w-[300px]"
          >
            <Bell className="text-red-500 animate-bounce" size={20} />
            <p className="text-sm font-bold">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Case Header */}
      <header className="bg-stone-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Search size={200} />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-600 text-[10px] font-black uppercase tracking-widest rounded-full">Caso Ativo</span>
                <span className="text-stone-500 text-xs font-bold">Expira em {new Date(activeCase.ends_at).toLocaleDateString()}</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight">{activeCase.title}</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-stone-800 px-4 py-2 rounded-2xl border border-stone-700">
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Recompensa</p>
                <p className="text-lg font-black text-amber-500 flex items-center gap-1">
                  <Trophy size={16} /> {activeCase.use_dynamic_scoring ? 'Variável' : `${activeCase.reward_points || 100} pts`}
                </p>
              </div>
              <div className="bg-stone-800 px-4 py-2 rounded-2xl border border-stone-700">
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Status</p>
                <p className="text-lg font-black text-stone-200">
                  {hasSolved ? 'Resolvido' : 'Em Aberto'}
                </p>
              </div>
            </div>
          </div>

          <p className="text-stone-400 text-lg font-medium leading-relaxed italic max-w-3xl">
            "{activeCase.description}"
          </p>

          {activeCase.use_dynamic_scoring && (
            <div className="flex items-center gap-2 text-amber-500/80 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 w-fit px-3 py-1 rounded-full border border-amber-500/20">
              <Clock size={12} /> Pontuação varia conforme o tempo
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Clues & Hints */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest px-2 flex items-center gap-2">
            <Search size={16} /> Arquivo de Pistas
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {clues.map((clue, idx) => {
              const isReleased = new Date(clue.release_datetime) <= new Date();
              
              return (
                <motion.div
                  key={clue.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-6 rounded-[32px] border flex gap-4 relative overflow-hidden transition-all ${
                    isReleased 
                      ? 'bg-white border-stone-100 shadow-sm' 
                      : 'bg-stone-50 border-dashed border-stone-200 opacity-60'
                  }`}
                >
                  {/* Status Badge */}
                  {isReleased && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Liberada</div>
                  )}
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isReleased ? 'bg-stone-100' : 'bg-stone-200'
                  }`}>
                    {isReleased ? <FileText size={24} className="text-stone-400" /> : <Lock size={24} className="text-stone-400" />}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-1">Pista #{idx + 1}</p>
                    {isReleased ? (
                      <p className="text-stone-700 font-medium leading-relaxed">{clue.clue_text}</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-stone-400 font-bold">Nova pista em breve</p>
                        <p className="text-[10px] text-stone-400 flex items-center gap-1">
                          <Clock size={10} /> Disponível em {new Date(clue.release_datetime).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {clues.length === 0 && (
              <div className="p-12 text-center bg-stone-50 rounded-[32px] border border-dashed border-stone-200">
                <p className="text-stone-400 font-bold italic">Nenhuma pista disponível ainda.</p>
              </div>
            )}
          </div>

          {/* Hints Section */}
          <div className="pt-4 space-y-4">
            <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest px-2 flex items-center gap-2">
              <Lightbulb size={16} /> Dicas Disponíveis
            </h3>
            <div className="flex flex-wrap gap-3">
              {hints.map((hint) => {
                const isReleased = new Date(hint.release_datetime) <= new Date();
                const isPurchased = purchasedHintIds.includes(hint.id);
                
                if (!isReleased) {
                  return (
                    <div 
                      key={hint.id}
                      className="px-6 py-3 bg-stone-50 border border-dashed border-stone-200 rounded-2xl flex items-center gap-2 opacity-50"
                    >
                      <Lock size={18} className="text-stone-400" />
                      <span className="text-sm font-bold text-stone-400">Dica disponível em breve</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={hint.id}
                    onClick={() => onHintClick(hint)}
                    disabled={isPurchasing}
                    className={`px-6 py-3 border rounded-2xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50 ${
                      isPurchased 
                        ? 'bg-green-50 text-green-700 border-green-100' 
                        : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                    }`}
                  >
                    <HelpCircle size={18} /> 
                    {isPurchased ? 'Ver Dica' : `Comprar Dica (-${hint.cost_points} pts)`}
                  </button>
                );
              })}
              {hints.length === 0 && (
                <p className="text-stone-400 text-xs italic px-2">Nenhuma dica disponível para este caso.</p>
              )}
            </div>
          </div>
        </div>

        {/* Answer & Ranking */}
        <div className="space-y-8">
          {/* Team Status */}
          {user.team_id && (
            <section className="bg-white p-8 rounded-[40px] border border-stone-100 shadow-sm space-y-6">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <ShieldAlert className="text-red-500" /> Status da Equipe
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Tentativas</p>
                  <p className="text-xl font-black text-stone-900">
                    {activeCase.max_attempts - (teamAttempt?.attempts_used || 0)} <span className="text-xs text-stone-400">restantes</span>
                  </p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Situação</p>
                  {teamAttempt?.is_eliminated ? (
                    <p className="text-sm font-black text-red-600 uppercase">❌ Eliminada</p>
                  ) : hasSolved ? (
                    <p className="text-sm font-black text-green-600 uppercase">✅ Resolvido</p>
                  ) : (
                    <p className="text-sm font-black text-blue-600 uppercase">🔍 Ativa</p>
                  )}
                </div>
              </div>

              {userTeam?.monitor_id === user.id ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-100">
                  <UserCheck size={14} /> Você é o monitor desta equipe
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100">
                  <Lock size={14} /> Apenas o monitor pode responder
                </div>
              )}
            </section>
          )}

          {/* Answer Form */}
          {!teamAttempt?.is_eliminated && (
            <section className={`p-8 rounded-[40px] shadow-xl space-y-6 ${hasSolved ? 'bg-green-50 border border-green-100' : 'bg-white border border-stone-100'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  {hasSolved ? <CheckCircle2 className="text-green-600" /> : <Key className="text-stone-400" />}
                  {hasSolved ? 'Resolvido!' : 'Sua Resposta'}
                </h3>
              </div>

              {hasSolved ? (
                <div className="space-y-4">
                  <p className="text-green-700 font-medium">Sua equipe já desvendou este mistério. Bom trabalho!</p>
                  <div className="p-4 bg-white/50 rounded-2xl text-center">
                    <p className="text-xs font-black text-green-600 uppercase mb-1">Resposta</p>
                    <p className="text-xl font-black text-green-800 uppercase">{activeCase.answer}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Sua Resposta</label>
                    {activeCase.max_attempts && (
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                        Tentativas: {attemptsCount}/{activeCase.max_attempts}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={userTeam?.monitor_id !== user.id ? "Apenas o monitor pode responder" : "Digite sua resposta..."}
                    disabled={isSubmitting || (activeCase.max_attempts ? attemptsCount >= activeCase.max_attempts : false) || userTeam?.monitor_id !== user.id}
                    className="w-full px-6 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-stone-900 transition-all font-bold uppercase disabled:opacity-60"
                  />
                  {userTeam?.monitor_id === user.id && (
                    <button
                      type="submit"
                      disabled={isSubmitting || !answer.trim() || (activeCase.max_attempts ? attemptsCount >= activeCase.max_attempts : false)}
                      className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all disabled:opacity-50"
                    >
                      <Send size={18} /> {isSubmitting ? 'Enviando...' : 'Enviar Resposta'}
                    </button>
                  )}
                </form>
              )}

              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
                    feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {feedback.text}
                </motion.div>
              )}
            </section>
          )}

          {teamAttempt?.is_eliminated && (
            <section className="bg-red-50 p-8 rounded-[40px] border border-red-100 shadow-xl text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
                <ShieldAlert size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-red-900">Equipe Desclassificada</h3>
                <p className="text-red-700 text-sm">Sua equipe excedeu o limite de {activeCase.max_attempts} tentativas e foi eliminada deste caso.</p>
              </div>
            </section>
          )}

          {/* Game History */}
          <section className="bg-white p-8 rounded-[40px] border border-stone-100 shadow-sm space-y-6">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <History className="text-stone-400" /> Histórico do Jogo
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {teamLogs.map((log) => (
                <div key={log.id} className="flex gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    log.action_type === 'correct_answer' ? 'bg-green-100 text-green-600' :
                    log.action_type === 'eliminated' ? 'bg-red-100 text-red-600' :
                    log.action_type === 'hint_purchase' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {log.action_type === 'correct_answer' ? <CheckCircle2 size={16} /> :
                     log.action_type === 'eliminated' ? <ShieldAlert size={16} /> :
                     log.action_type === 'hint_purchase' ? <Lightbulb size={16} /> :
                     <Send size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-stone-900 truncate">
                      {log.team_name || 'Equipe'}
                    </p>
                    <p className="text-[10px] text-stone-500 font-medium leading-tight">
                      {log.description}
                    </p>
                    <p className="text-[8px] text-stone-400 font-bold uppercase mt-1">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {teamLogs.length === 0 && (
                <p className="text-center text-stone-400 text-xs italic py-4">Nenhuma ação registrada ainda.</p>
              )}
            </div>
          </section>

          {/* Ranking */}
          <section className="bg-white p-8 rounded-[40px] border border-stone-100 shadow-sm space-y-6">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Trophy className="text-amber-500" /> Detetives de Elite
            </h3>
            <div className="space-y-4">
              {ranking.map((res, idx) => (
                <div key={res.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center font-black text-stone-400 text-xs">
                    {idx + 1}º
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-stone-900">{res.teams?.name}</p>
                    <p className="text-[10px] text-stone-400 font-bold uppercase">
                      {new Date(res.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: res.teams?.color }} />
                </div>
              ))}
              {ranking.length === 0 && (
                <p className="text-center text-stone-400 text-sm italic py-4">Nenhuma equipe resolveu ainda.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Member Selection Modal */}
      <AnimatePresence>
        {showMemberSelection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMemberSelection(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-stone-900">Quem vai pagar?</h3>
                <p className="text-stone-500 text-sm">Escolha um membro da equipe para sacrificar {showMemberSelection.cost_points} pontos pela dica.</p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    disabled={isPurchasing || member.points < showMemberSelection.cost_points}
                    onClick={() => handlePurchaseHint(showMemberSelection, member.id)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-stone-100 hover:border-amber-200 hover:bg-amber-50 transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-stone-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold">
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-stone-900">{member.name}</p>
                        <p className="text-xs text-stone-500">{member.points} pts disponíveis</p>
                      </div>
                    </div>
                    {member.points < showMemberSelection.cost_points && (
                      <span className="text-[10px] font-black text-red-500 uppercase">Pontos Insuficientes</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowMemberSelection(null)}
                className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hint Modal */}
      <AnimatePresence>
        {showHintModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHintModal(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto">
                <Lightbulb size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-stone-900">Dica de Especialista</h3>
                <p className="text-stone-500 text-sm italic">"{showHintModal.hint_text}"</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl text-center">
                <p className="text-xs font-black text-amber-600 uppercase mb-1">Custo da Dica</p>
                <p className="text-xl font-black text-amber-800">{showHintModal.cost_points} XP</p>
              </div>
              <button
                onClick={() => setShowHintModal(null)}
                className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
