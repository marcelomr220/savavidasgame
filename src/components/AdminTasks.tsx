import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Star, 
  User, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  Tag, 
  Users, 
  Save, 
  X,
  LayoutList,
  CheckSquare,
  Upload,
  FileText
} from 'lucide-react';
import { UserTask, Task } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getPendingTasks, getTasks, verifyTask, createTask, updateTask, deleteTask } from '../services/api';
import { supabase } from '../lib/supabase';

export default function AdminTasks() {
  const [activeTab, setActiveTab] = useState<'validation' | 'manage'>('validation');
  const [pending, setPending] = useState<UserTask[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points: 0,
    category: 'Culto',
    type: 'Individual',
    available_from: '',
    deadline: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'validation') {
        const data = await getPendingTasks();
        setPending(data);
      } else {
        const data = await getTasks();
        setTasks(data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userTaskId: number, status: 'verified' | 'rejected') => {
    try {
      const taskToVerify = pending.find(p => p.id === userTaskId);
      if (!taskToVerify) return;
      
      await verifyTask(userTaskId, status, taskToVerify.user_id, taskToVerify.points);
      fetchData();
    } catch (err) {
      console.error("Error verifying task:", err);
    }
  };

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return 'Sem data';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleDateString();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        points: task.points,
        category: task.category || 'Culto',
        type: task.type || 'Individual',
        available_from: formatDate(task.available_from),
        deadline: formatDate(task.deadline),
        is_active: Boolean(task.is_active)
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        points: 0,
        category: 'Culto',
        type: 'Individual',
        available_from: new Date().toISOString().slice(0, 16),
        deadline: '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taskData = {
        ...formData,
        is_active: formData.is_active ? 1 : 0
      };

      if (editingTask) {
        await updateTask(editingTask.id, taskData as any);
      } else {
        await createTask(taskData as any);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert('Erro ao salvar tarefa: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await deleteTask(id);
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir tarefa: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const tasksToUpload = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim());
        const task: any = {};
        headers.forEach((header, index) => {
          if (header === 'points') {
            task[header] = parseInt(values[index]) || 0;
          } else {
            task[header] = values[index];
          }
        });
        return task;
      });

      if (tasksToUpload.length === 0) {
        alert('Nenhuma tarefa encontrada no arquivo.');
        setIsBulkUploading(false);
        return;
      }

      try {
        const { error } = await supabase.from('tasks').insert(tasksToUpload);

        if (!error) {
          alert(`${tasksToUpload.length} tarefas cadastradas com sucesso!`);
          fetchData();
        } else {
          alert('Erro no upload: ' + error.message);
        }
      } catch (err) {
        alert('Erro ao processar arquivo.');
      } finally {
        setIsBulkUploading(false);
        e.target.value = ''; // Reset input
      }
    };
    reader.readAsText(file);
  };

  if (loading && !isModalOpen) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Gestão de Tarefas</h2>
          <p className="text-stone-500">Crie, edite e valide as tarefas da comunidade.</p>
        </div>
        
        <div className="flex bg-stone-100 p-1 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab('validation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'validation' 
                ? 'bg-white text-red-700 shadow-sm' 
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <CheckSquare size={18} />
            Validação
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'manage' 
                ? 'bg-white text-red-700 shadow-sm' 
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <LayoutList size={18} />
            Gerenciar
          </button>
        </div>
      </header>

      {activeTab === 'validation' ? (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Tarefa</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Pontos</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {pending.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                          <User size={16} />
                        </div>
                        <span className="font-semibold text-stone-900">{item.user_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-stone-600">{item.task_title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-red-600 font-bold">
                        <Star size={14} fill="currentColor" />
                        <span>{item.points}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerify(item.id, 'rejected')}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Rejeitar"
                        >
                          <XCircle size={20} />
                        </button>
                        <button
                          onClick={() => handleVerify(item.id, 'verified')}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Aprovar"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pending.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic">
                      Nenhuma tarefa pendente de validação.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-end gap-3">
            <label className="flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-all cursor-pointer shadow-sm">
              <Upload size={20} />
              {isBulkUploading ? 'Enviando...' : 'Upload CSV'}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleBulkUpload}
                disabled={isBulkUploading}
              />
            </label>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              <Plus size={20} />
              Nova Tarefa
            </button>
          </div>

          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="text-red-600 shrink-0" size={20} />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">Dica para Upload Massivo:</p>
                <p>O arquivo CSV deve conter os seguintes cabeçalhos na primeira linha:</p>
                <code className="bg-white/50 px-2 py-1 rounded mt-1 inline-block">title, description, points, category, type, available_from, deadline</code>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:border-red-200 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      task.category === 'Culto' ? 'bg-blue-100 text-blue-700' :
                      task.category === 'Célula' ? 'bg-red-100 text-red-700' :
                      task.category === 'Especial' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {task.category}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider">
                      {task.type}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(task)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-stone-900 mb-2">{task.title}</h4>
                <p className="text-sm text-stone-500 mb-6 line-clamp-2">{task.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-red-600 font-bold">
                      <Star size={16} fill="currentColor" />
                      <span>{task.points} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-stone-400 text-xs font-medium">
                    <Clock size={14} />
                    <span>Prazo: {task.deadline ? safeFormatDate(task.deadline) : 'Sem prazo'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                      <Plus size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-stone-900">
                        {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                      </h3>
                      <p className="text-sm text-stone-500">Preencha os detalhes da tarefa abaixo.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-2">Nome da Tarefa</label>
                      <input
                        required
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        placeholder="Ex: Leitura Bíblica Diária"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-2">Descrição</label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all h-24 resize-none"
                        placeholder="Descreva o que deve ser feito..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Pontos</label>
                      <div className="relative">
                        <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                          required
                          type="number"
                          value={formData.points}
                          onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                          className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Categoria</label>
                      <div className="relative">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none"
                        >
                          <option value="Culto">Culto</option>
                          <option value="Célula">Célula</option>
                          <option value="Especial">Especial</option>
                          <option value="Desafio">Desafio</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Tipo</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none"
                        >
                          <option value="Individual">Individual</option>
                          <option value="Equipe">Por Equipe</option>
                          <option value="Ambos">Ambos</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Disponível a partir de</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                          type="datetime-local"
                          value={formData.available_from}
                          onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-2">Prazo de Execução</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                          type="datetime-local"
                          value={formData.deadline}
                          onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-3 cursor-pointer p-4 bg-stone-50 rounded-2xl border border-stone-200">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-5 h-5 rounded border-stone-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm font-bold text-stone-700">Tarefa Ativa (visível para usuários)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                    >
                      <Save size={20} />
                      Salvar Tarefa
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
