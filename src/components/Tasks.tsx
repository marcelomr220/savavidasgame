import React, { useState, useEffect } from 'react';
import { CheckSquare, Clock, Star, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, User } from '../types';

export default function Tasks({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [completing, setCompleting] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        setTasks(data);
        setLoading(false);
      });
  }, []);

  const handleComplete = async (taskId: number) => {
    setCompleting(taskId);
    const res = await fetch('/api/tasks/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, taskId }),
    });
    if (res.ok) {
      // Show success feedback
      setTimeout(() => setCompleting(null), 1500);
    }
  };

  const categories = ['all', 'Culto', 'Célula', 'Especial', 'Desafio'];

  const filteredTasks = tasks.filter(t => {
    const isCategoryMatch = filter === 'all' || t.category === filter;
    const now = new Date();
    const isAvailable = !t.available_from || new Date(t.available_from) <= now;
    const isActive = t.is_active !== 0;
    return isCategoryMatch && isAvailable && isActive;
  });

  const isExpired = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-stone-900">Missões e Tarefas</h2>
        <p className="text-stone-500">Complete atividades para ganhar pontos e ajudar sua equipe.</p>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              filter === cat 
                ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' 
                : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {cat === 'all' ? 'Todas' : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4 group hover:border-red-200 transition-all cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                task.category === 'Desafio' ? 'bg-orange-50 text-orange-600' :
                task.category === 'Culto' ? 'bg-blue-50 text-blue-600' :
                task.category === 'Célula' ? 'bg-purple-50 text-purple-600' :
                'bg-red-50 text-red-600'
              }`}>
                <CheckSquare size={24} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">
                    {task.category}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-red-50 text-red-600 rounded-full">
                    {task.type}
                  </span>
                </div>
                <h4 className="font-bold text-stone-900">{task.title}</h4>
                <p className="text-sm text-stone-500">{task.description}</p>
                {task.deadline && (
                  <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${isExpired(task.deadline) ? 'text-red-500' : 'text-stone-400'}`}>
                    <Clock size={12} />
                    <span>Prazo: {new Date(task.deadline).toLocaleString()}</span>
                    {isExpired(task.deadline) && <span className="ml-1 uppercase">(Expirado)</span>}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-red-600 font-bold">
                    <Star size={16} fill="currentColor" />
                    <span>+{task.points}</span>
                  </div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase">Pontos</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleComplete(task.id);
                  }}
                  disabled={completing === task.id || isExpired(task.deadline)}
                  className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    completing === task.id
                      ? 'bg-red-500 text-white scale-95'
                      : isExpired(task.deadline)
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  {completing === task.id ? (
                    <>
                      <CheckCircle2 size={18} />
                      Enviado
                    </>
                  ) : isExpired(task.deadline) ? (
                    'Expirado'
                  ) : (
                    'Concluir'
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Task Detail Modal */}
        <AnimatePresence>
          {selectedTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTask(null)}
                className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedTask.category === 'Desafio' ? 'bg-orange-50 text-orange-600' :
                      selectedTask.category === 'Culto' ? 'bg-blue-50 text-blue-600' :
                      selectedTask.category === 'Célula' ? 'bg-purple-50 text-purple-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      <CheckSquare size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-stone-900">Detalhes da Missão</h3>
                  </div>
                  <button onClick={() => setSelectedTask(null)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-stone-100 text-stone-500 rounded-full">
                        {selectedTask.category}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-red-50 text-red-600 rounded-full">
                        {selectedTask.type}
                      </span>
                    </div>
                    <h4 className="text-2xl font-black text-stone-900 leading-tight mb-4">{selectedTask.title}</h4>
                    <div className="prose prose-stone max-w-none">
                      <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100">
                    <div className="bg-stone-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Recompensa</p>
                      <div className="flex items-center gap-1 text-red-600 font-bold text-lg">
                        <Star size={18} fill="currentColor" />
                        <span>{selectedTask.points} Pontos</span>
                      </div>
                    </div>
                    {selectedTask.deadline && (
                      <div className="bg-stone-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Prazo Final</p>
                        <div className={`flex items-center gap-1 font-bold text-sm ${isExpired(selectedTask.deadline) ? 'text-red-500' : 'text-stone-600'}`}>
                          <Clock size={16} />
                          <span>{new Date(selectedTask.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      handleComplete(selectedTask.id);
                      setSelectedTask(null);
                    }}
                    disabled={completing === selectedTask.id || isExpired(selectedTask.deadline)}
                    className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-lg shadow-xl ${
                      completing === selectedTask.id
                        ? 'bg-red-500 text-white'
                        : isExpired(selectedTask.deadline)
                          ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          : 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-200'
                    }`}
                  >
                    {completing === selectedTask.id ? (
                      <>
                        <CheckCircle2 size={24} />
                        Enviado com Sucesso
                      </>
                    ) : isExpired(selectedTask.deadline) ? (
                      'Missão Expirada'
                    ) : (
                      'Aceitar e Concluir Missão'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-stone-300">
            <AlertCircle className="mx-auto text-stone-300 mb-2" size={48} />
            <p className="text-stone-500 font-medium">Nenhuma tarefa encontrada nesta categoria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
