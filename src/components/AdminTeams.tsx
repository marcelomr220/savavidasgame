import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Star, Palette, X, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { Team, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getTeams, getUsers, createTeam, updateTeam, deleteTeam } from '../services/api';

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#ef4444',
    description: '',
    leader_id: '',
    total_points: 0,
    photo: ''
  });

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const fetchTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching teams:", err);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
    }
  };

  const handleOpenModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        color: team.color || '#ef4444',
        description: team.description || '',
        leader_id: team.leader_id?.toString() || '',
        total_points: team.total_points || 0,
        photo: team.photo || ''
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: '',
        color: '#ef4444',
        description: '',
        leader_id: '',
        total_points: 0,
        photo: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const teamData = {
        ...formData,
        leader_id: formData.leader_id ? parseInt(formData.leader_id) : null
      };

      if (editingTeam) {
        await updateTeam(editingTeam.id, teamData as any);
      } else {
        await createTeam(teamData as any);
      }

      fetchTeams();
      handleCloseModal();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar equipe');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta equipe? Os membros ficarão sem equipe.')) return;

    try {
      await deleteTeam(id);
      fetchTeams();
    } catch (err: any) {
      alert('Erro ao excluir equipe: ' + (err.message || 'Erro desconhecido'));
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Gerenciamento de Equipes</h2>
          <p className="text-stone-500">Crie e edite as equipes da comunidade.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
        >
          <Plus size={20} />
          Nova Equipe
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team) => (
          <div key={team.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-center gap-6">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0 overflow-hidden"
              style={{ backgroundColor: team.color }}
            >
              {team.photo ? (
                <img src={team.photo} alt={team.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                team.name.charAt(0)
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-stone-900 truncate">{team.name}</h3>
              <div className="flex items-center gap-4 text-sm text-stone-500">
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{team.member_count} membros</span>
                </div>
                <div className="flex items-center gap-1 text-red-600 font-bold">
                  <Star size={14} fill="currentColor" />
                  <span>{team.total_points} pts</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleOpenModal(team)}
                className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={() => handleDelete(team.id)}
                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-stone-900">
                  {editingTeam ? 'Editar Equipe' : 'Nova Equipe'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Nome da Equipe</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Cor da Equipe</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-12 rounded-lg border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Foto da Equipe</label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-20 h-20 rounded-2xl bg-stone-100 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden shrink-0"
                        style={{ backgroundColor: formData.photo ? 'transparent' : formData.color }}
                      >
                        {formData.photo ? (
                          <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-white/50" size={32} />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors">
                            <Upload size={16} />
                            Upload Foto
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                          </label>
                          {formData.photo && (
                            <button 
                              type="button"
                              onClick={() => setFormData({ ...formData, photo: '' })}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Máximo 2MB. Formatos: JPG, PNG, WEBP.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">URL da Foto (Opcional)</label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={formData.photo}
                      onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 h-24 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Líder da Equipe</label>
                    <select
                      value={formData.leader_id}
                      onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    >
                      <option value="">Sem Líder</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  {editingTeam && (
                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-1">Pontos Totais</label>
                      <input
                        type="number"
                        value={formData.total_points}
                        onChange={(e) => setFormData({ ...formData, total_points: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Salvar Equipe
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
