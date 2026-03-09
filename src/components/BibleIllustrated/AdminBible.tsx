import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Book, Loader2, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getBibleBooks, getBookChapters, deleteBibleChapter } from '../../services/api';

export default function AdminBible() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);

  useEffect(() => {
    getBibleBooks()
      .then(data => {
        setBooks(data);
        if (data.length > 0) setSelectedBookId(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedBookId) {
      setLoadingChapters(true);
      getBookChapters(selectedBookId)
        .then(setChapters)
        .catch(console.error)
        .finally(() => setLoadingChapters(false));
    }
  }, [selectedBookId]);

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este capítulo?')) return;
    try {
      await deleteBibleChapter(id);
      setChapters(chapters.filter(c => c.id !== id));
    } catch (err) {
      alert('Erro ao excluir capítulo');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-600" /></div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Gerenciar Bíblia Ilustrada</h2>
          <p className="text-stone-500">Cadastre capítulos e associe imagens épicas.</p>
        </div>
        <button 
          onClick={() => navigate('/admin/bible/new')}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} />
          Novo Capítulo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Books Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest px-2">Livros</h3>
          <div className="space-y-1">
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => setSelectedBookId(book.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  selectedBookId === book.id 
                    ? 'bg-red-50 text-red-600 font-bold border border-red-100' 
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Book size={18} />
                  <span>{book.name}</span>
                </div>
                <ChevronRight size={16} className={selectedBookId === book.id ? 'opacity-100' : 'opacity-0'} />
              </button>
            ))}
          </div>
        </aside>

        {/* Chapters List */}
        <main className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-stone-900">Capítulos de {books.find(b => b.id === selectedBookId)?.name}</h3>
              <span className="text-xs font-bold text-stone-400 bg-stone-50 px-3 py-1 rounded-full">
                {chapters.length} Capítulos
              </span>
            </div>

            <div className="divide-y divide-stone-50">
              {loadingChapters ? (
                <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-stone-300" /></div>
              ) : chapters.length > 0 ? (
                chapters.map(chapter => (
                  <div key={chapter.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-stone-600 font-serif font-bold">
                        {chapter.chapter_number}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">Capítulo {chapter.chapter_number}</p>
                        <p className="text-xs text-stone-500">Clique para editar o conteúdo e imagens</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/admin/bible/edit/${chapter.id}`)}
                        className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(chapter.id)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Book className="mx-auto mb-4 text-stone-200" size={48} />
                  <p className="text-stone-400 italic">Nenhum capítulo cadastrado para este livro.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
