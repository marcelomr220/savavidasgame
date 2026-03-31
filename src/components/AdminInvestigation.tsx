import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  Clock, 
  Search, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  FileText,
  Key,
  Lightbulb,
  Power,
  Bell,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { InvestigationCase, InvestigationClue, InvestigationHint } from '../types';
import { syncInvestigationNotifications } from '../services/api';

interface InvestigationItemCardProps {
  id: string;
  type: 'clue' | 'hint';
  text: string;
  releaseDatetime: string;
  costPoints?: number;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}

const InvestigationItemCard: React.FC<InvestigationItemCardProps> = ({ id, type, text, releaseDatetime, costPoints, onUpdate, onDelete }) => {
  return (
    <div className="group relative w-full p-6 bg-white rounded-[32px] border border-stone-100 shadow-sm hover:shadow-md hover:border-stone-200 transition-all flex flex-col gap-3 box-border overflow-hidden min-w-0">
      <button 
        onClick={onDelete}
        className="absolute top-4 right-4 p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all z-10"
        title="Excluir"
      >
        <Trash2 size={18} />
      </button>

      <div className="w-full space-y-2 min-w-0">
        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1 flex items-center gap-1">
          {type === 'clue' ? <Search size={10} /> : <Lightbulb size={10} />}
          {type === 'clue' ? 'Texto do Enigma' : 'Texto da Dica'}
        </label>
        <textarea
          defaultValue={text}
          onBlur={e => onUpdate({ [type === 'clue' ? 'clue_text' : 'hint_text']: e.target.value })}
          placeholder={type === 'clue' ? "Descreva a pista aqui..." : "Dê uma dica útil..."}
          className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent focus:border-stone-900 focus:bg-white rounded-2xl transition-all text-sm font-medium resize-none box-border"
          rows={2}
        />
      </div>

      <div className="w-full flex flex-wrap gap-3 min-w-0">
        {type === 'hint' && (
          <div className="flex-1 min-w-[120px] space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1 flex items-center gap-1">
              <Trophy size={10} className="text-amber-500" /> Custo (Pontos)
            </label>
            <input 
              type="number"
              defaultValue={costPoints}
              onBlur={e => onUpdate({ cost_points: parseInt(e.target.value) || 0 })}
              className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent focus:border-stone-900 focus:bg-white rounded-2xl transition-all text-sm font-bold box-border"
              placeholder="0"
            />
          </div>
        )}
        
        <div className="flex-[2] min-w-[120px] space-y-1.5">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1 flex items-center gap-1">
            <Clock size={10} /> Data de Liberação
          </label>
          <input 
            type="datetime-local"
            defaultValue={new Date(releaseDatetime).toISOString().slice(0, 16)}
            onBlur={e => onUpdate({ release_datetime: new Date(e.target.value).toISOString() })}
            className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent focus:border-stone-900 focus:bg-white rounded-2xl transition-all text-sm font-bold box-border"
          />
        </div>
      </div>
    </div>
  );
};

export default function AdminInvestigation() {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [clues, setClues] = useState<InvestigationClue[]>([]);
  const [hints, setHints] = useState<InvestigationHint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form states for new/edit case
  const [caseForm, setCaseForm] = useState({
    title: '',
    description: '',
    answer: '',
    starts_at: '',
    ends_at: '',
    is_active: true,
    reward_points: 100,
    use_dynamic_scoring: false,
    max_attempts: '' as string | number
  });

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('investigation_cases')
      .select('*')
      .order('starts_at', { ascending: false });
    
    if (error) console.error(error);
    else setCases(data || []);
    setIsLoading(false);
  };

  const fetchDetails = async (caseId: string) => {
    const [cluesRes, hintsRes] = await Promise.all([
      supabase.from('investigation_clues').select('*').eq('case_id', caseId).order('release_datetime', { ascending: true }),
      supabase.from('investigation_hints').select('*').eq('case_id', caseId).order('release_datetime', { ascending: true })
    ]);
    
    setClues(cluesRes.data || []);
    setHints(hintsRes.data || []);
  };

  const handleSelectCase = (c: InvestigationCase) => {
    setSelectedCase(c);
    setCaseForm({
      title: c.title,
      description: c.description,
      answer: c.answer,
      starts_at: new Date(c.starts_at).toISOString().slice(0, 16),
      ends_at: new Date(c.ends_at).toISOString().slice(0, 16),
      is_active: c.is_active,
      reward_points: c.reward_points || 100,
      use_dynamic_scoring: c.use_dynamic_scoring || false,
      max_attempts: c.max_attempts || ''
    });
    fetchDetails(c.id);
  };

  const handleCreateCase = () => {
    setSelectedCase(null);
    setCaseForm({
      title: '',
      description: '',
      answer: '',
      starts_at: '',
      ends_at: '',
      is_active: true,
      reward_points: 100,
      use_dynamic_scoring: false,
      max_attempts: ''
    });
    setClues([]);
    setHints([]);
  };

  const saveCase = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const dataToSave = {
        ...caseForm,
        starts_at: new Date(caseForm.starts_at).toISOString(),
        ends_at: new Date(caseForm.ends_at).toISOString(),
        max_attempts: caseForm.max_attempts === '' ? null : parseInt(caseForm.max_attempts.toString())
      };

      if (selectedCase) {
        const { error } = await supabase
          .from('investigation_cases')
          .update(dataToSave)
          .eq('id', selectedCase.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('investigation_cases')
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;
        setSelectedCase(data);
      }

      setMessage({ type: 'success', text: 'Caso salvo com sucesso!' });
      fetchCases();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCase = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este caso?')) return;
    const { error } = await supabase.from('investigation_cases').delete().eq('id', id);
    if (!error) {
      setMessage({ type: 'success', text: 'Caso excluído.' });
      setSelectedCase(null);
      fetchCases();
    }
  };

  // Clues
  const addClue = async () => {
    if (!selectedCase) return;
    setMessage(null);
    const { error } = await supabase.from('investigation_clues').insert([{
      case_id: selectedCase.id,
      clue_text: 'Nova pista...',
      release_datetime: new Date().toISOString()
    }]);
    
    if (error) {
      console.error('Error adding clue:', error);
      setMessage({ type: 'error', text: 'Erro ao adicionar pista: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Pista adicionada!' });
      fetchDetails(selectedCase.id);
    }
  };

  const updateClue = async (id: string, updates: any) => {
    const { error } = await supabase.from('investigation_clues').update(updates).eq('id', id);
    if (!error && selectedCase) fetchDetails(selectedCase.id);
  };

  const deleteClue = async (id: string) => {
    const { error } = await supabase.from('investigation_clues').delete().eq('id', id);
    if (!error && selectedCase) fetchDetails(selectedCase.id);
  };

  // Hints
  const addHint = async () => {
    if (!selectedCase) return;
    setMessage(null);
    const { error } = await supabase.from('investigation_hints').insert([{
      case_id: selectedCase.id,
      hint_text: 'Nova dica...',
      cost_points: 10,
      release_datetime: new Date().toISOString()
    }]);
    
    if (error) {
      console.error('Error adding hint:', error);
      setMessage({ type: 'error', text: 'Erro ao adicionar dica: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Dica adicionada!' });
      fetchDetails(selectedCase.id);
    }
  };

  const updateHint = async (id: string, updates: any) => {
    const { error } = await supabase.from('investigation_hints').update(updates).eq('id', id);
    if (!error && selectedCase) fetchDetails(selectedCase.id);
  };

  const deleteHint = async (id: string) => {
    const { error } = await supabase.from('investigation_hints').delete().eq('id', id);
    if (!error && selectedCase) fetchDetails(selectedCase.id);
  };

  // Manual Trigger for Notification Sync (Simulating Cron)
  const handleSyncNotifications = async () => {
    if (!selectedCase) return;
    setIsSaving(true);
    try {
      await syncInvestigationNotifications(selectedCase.id);
      setMessage({ type: 'success', text: 'Notificações sincronizadas com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Gerenciar Investigação</h2>
          <p className="text-stone-500">Controle total sobre casos, pistas e dicas.</p>
        </div>
        <button 
          onClick={handleCreateCase}
          className="flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-stone-800 transition-all"
        >
          <Plus size={20} /> Novo Caso
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest px-2">Casos</h3>
          <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center animate-pulse text-stone-400">Carregando...</div>
            ) : cases.length > 0 ? (
              cases.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCase(c)}
                  className={`w-full p-5 text-left flex items-center justify-between transition-all border-b border-stone-50 last:border-0 ${
                    selectedCase?.id === c.id ? 'bg-stone-50 border-l-4 border-l-stone-900' : 'hover:bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-stone-300'}`} />
                    <div>
                      <p className="font-bold text-stone-900">{c.title}</p>
                      <p className="text-[10px] text-stone-400 uppercase font-black tracking-tighter">
                        {new Date(c.starts_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className={selectedCase?.id === c.id ? 'text-stone-900' : 'text-stone-300'} />
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-stone-400 italic">Nenhum caso.</div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCase?.id || 'new'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 rounded-[40px] border border-stone-100 shadow-xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText size={24} className="text-stone-400" />
                  {selectedCase ? 'Editar Caso' : 'Novo Mistério'}
                </h3>
                <div className="flex items-center gap-2">
                  {selectedCase && (
                    <button 
                      onClick={handleSyncNotifications}
                      title="Sincronizar Notificações"
                      className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"
                    >
                      <Bell size={20} />
                    </button>
                  )}
                  <button 
                    onClick={() => setCaseForm({...caseForm, is_active: !caseForm.is_active})}
                    className={`p-2 rounded-xl transition-all ${caseForm.is_active ? 'text-green-500 bg-green-50' : 'text-stone-400 bg-stone-50'}`}
                  >
                    <Power size={20} />
                  </button>
                  {selectedCase && (
                    <button onClick={() => deleteCase(selectedCase.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-1">Título</label>
                  <input
                    type="text"
                    value={caseForm.title}
                    onChange={e => setCaseForm({...caseForm, title: e.target.value})}
                    className="w-full px-6 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-stone-900 transition-all font-bold"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-1">Enigma</label>
                  <textarea
                    value={caseForm.description}
                    onChange={e => setCaseForm({...caseForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-6 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-stone-900 transition-all font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-1">Resposta</label>
                  <input
                    type="text"
                    value={caseForm.answer}
                    onChange={e => setCaseForm({...caseForm, answer: e.target.value})}
                    className="w-full px-6 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-stone-900 transition-all font-bold uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-1">Início</label>
                    <input
                      type="datetime-local"
                      value={caseForm.starts_at}
                      onChange={e => setCaseForm({...caseForm, starts_at: e.target.value})}
                      className="w-full px-4 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-stone-900 transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-1">Fim</label>
                    <input
                      type="datetime-local"
                      value={caseForm.ends_at}
                      onChange={e => setCaseForm({...caseForm, ends_at: e.target.value})}
                      className="w-full px-4 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-stone-900 transition-all font-bold text-sm"
                    />
                  </div>
                </div>

                {/* New Scoring Fields */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-stone-50">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-1 flex items-center gap-1">
                      <Trophy size={14} className="text-amber-500" /> Pontos ao Acertar
                    </label>
                    <input
                      type="number"
                      value={caseForm.reward_points}
                      onChange={e => setCaseForm({...caseForm, reward_points: parseInt(e.target.value) || 0})}
                      className="w-full px-6 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-stone-900 transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-1">Tentativas Máx. (Opcional)</label>
                    <input
                      type="number"
                      value={caseForm.max_attempts}
                      onChange={e => setCaseForm({...caseForm, max_attempts: e.target.value})}
                      placeholder="Ilimitado"
                      className="w-full px-6 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-stone-900 transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-1">Tipo de Pontuação</label>
                    <select
                      value={caseForm.use_dynamic_scoring ? 'dynamic' : 'fixed'}
                      onChange={e => setCaseForm({...caseForm, use_dynamic_scoring: e.target.value === 'dynamic'})}
                      className="w-full px-6 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-stone-900 transition-all font-bold"
                    >
                      <option value="fixed">Pontuação Fixa</option>
                      <option value="dynamic">Pontuação Dinâmica (Por tempo)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={saveCase}
                disabled={isSaving}
                className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all disabled:opacity-50"
              >
                <Save size={20} /> {isSaving ? 'Salvando...' : 'Salvar Caso'}
              </button>

              {selectedCase && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-stone-100 w-full items-start">
                  {/* Clues (Enigmas) */}
                  <div className="w-full flex flex-col gap-6 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold flex items-center gap-2 text-stone-900"><Search size={18} className="text-stone-400" /> Enigmas (Pistas)</h4>
                      <button onClick={addClue} className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-900 hover:text-white transition-all text-xs font-bold">
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                    <div className="w-full flex flex-col gap-4 min-w-0">
                      {clues.map((clue) => (
                        <InvestigationItemCard
                          key={clue.id}
                          id={clue.id}
                          type="clue"
                          text={clue.clue_text}
                          releaseDatetime={clue.release_datetime}
                          onUpdate={(updates) => updateClue(clue.id, updates)}
                          onDelete={() => deleteClue(clue.id)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hints (Dicas) */}
                  <div className="w-full flex flex-col gap-6 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold flex items-center gap-2 text-stone-900"><Lightbulb size={18} className="text-stone-400" /> Dicas Compráveis</h4>
                      <button onClick={addHint} className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-900 hover:text-white transition-all text-xs font-bold">
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                    <div className="w-full flex flex-col gap-4 min-w-0">
                      {hints.map((hint) => (
                        <InvestigationItemCard
                          key={hint.id}
                          id={hint.id}
                          type="hint"
                          text={hint.hint_text}
                          releaseDatetime={hint.release_datetime}
                          costPoints={hint.cost_points}
                          onUpdate={(updates) => updateHint(hint.id, updates)}
                          onDelete={() => deleteHint(hint.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
