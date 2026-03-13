import React, { useState, useEffect } from 'react';
import { Cake, Search, Save, Upload, User as UserIcon, Calendar, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../types';
import { getUsers } from '../services/api';

export default function BirthdayAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingBirthdays = users
    .filter(u => u.birth_date)
    .sort((a, b) => {
      const dateA = new Date(a.birth_date!);
      const dateB = new Date(b.birth_date!);
      const today = new Date();
      
      const nextA = new Date(today.getFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
      if (nextA < today) nextA.setFullYear(today.getFullYear() + 1);
      
      const nextB = new Date(today.getFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
      if (nextB < today) nextB.setFullYear(today.getFullYear() + 1);
      
      return nextA.getTime() - nextB.getTime();
    });

  const filteredUsers = upcomingBirthdays.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImageUrl(base64);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/birthdays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          adminMessage,
          imageUrl
        })
      });
      if (response.ok) {
        alert('Configurações de aniversário salvas!');
      }
    } catch (error) {
      console.error("Error saving birthday settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Carregando...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-stone-900">Gerenciamento de Aniversários</h2>
        <p className="text-stone-500">Configure mensagens e imagens especiais para os aniversariantes.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Buscar aniversariante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
            <div className="divide-y divide-stone-50">
              {filteredUsers.map((u) => {
                const bDate = new Date(u.birth_date!);
                const isToday = bDate.getUTCDate() === new Date().getDate() && bDate.getUTCMonth() === new Date().getMonth();
                
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-stone-50 transition-colors text-left ${selectedUser?.id === u.id ? 'bg-red-50 border-l-4 border-red-500' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden">
                      <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-stone-900 text-sm">{u.name}</p>
                      <p className="text-xs text-stone-500">
                        {bDate.getUTCDate()}/{bDate.getUTCMonth() + 1} {isToday && '🎂 HOJE!'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[32px] border border-stone-200 shadow-sm p-8 space-y-6"
            >
              <div className="flex items-center gap-4 border-b border-stone-100 pb-6">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden">
                  <img src={selectedUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.name}`} alt={selectedUser.name} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{selectedUser.name}</h3>
                  <p className="text-stone-500">Configurando aniversário de {new Date(selectedUser.birth_date!).getUTCDate()}/{new Date(selectedUser.birth_date!).getUTCMonth() + 1}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                    <MessageSquare size={18} className="text-red-500" />
                    Mensagem Oficial do Administrador
                  </label>
                  <textarea
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    placeholder="Ex: Parabéns por mais um ano de vida! Que Deus te abençoe ricamente."
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 h-32 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                    <ImageIcon size={18} className="text-red-500" />
                    URL da Imagem Comemorativa
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                    <label className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-50 transition-all cursor-pointer shadow-sm shrink-0">
                      <Upload size={20} />
                      {isUploading ? '...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">Esta imagem será o fundo do card de aniversário no dashboard.</p>
                </div>

                {imageUrl && (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save size={20} />
                    {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50 rounded-[32px] border-2 border-dashed border-stone-200 p-12">
              <Cake size={64} className="mb-4 opacity-20" />
              <p className="font-medium">Selecione um usuário para configurar o aniversário</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
