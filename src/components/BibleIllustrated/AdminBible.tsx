import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Book, Loader2, ChevronRight, Image as ImageIcon, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getBooks, getBookChapters, deleteBibleChapter, toggleVisibility, toggleRelease, updateBookCover, uploadBookCover } from '../../services/api';

export default function AdminBible() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);

  const loadBooks = async () => {
    try {
      const data = await getBooks(false); // Admin sees all
      setBooks(data);
      if (data.length > 0 && !selectedBookId) setSelectedBookId(data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
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

  const handleToggleVisibility = async (bookId: number, currentVisible: boolean) => {
    try {
      await toggleVisibility(bookId, currentVisible);
      await loadBooks();
    } catch (err) {
      alert('Erro ao atualizar visibilidade do livro');
    }
  };

  const handleToggleRelease = async (bookId: number, currentReleased: boolean) => {
    try {
      await toggleRelease(bookId, currentReleased);
      await loadBooks();
    } catch (err) {
      alert('Erro ao atualizar status de liberação do livro');
    }
  };

  const handleEditCover = (book: any) => {
    setEditingBook(book);
    setIsCoverModalOpen(true);
  };

  const handleCoverUpdate = async (imageUrl: string) => {
    if (!editingBook) return;
    try {
      await updateBookCover(editingBook.id, imageUrl);
      await loadBooks();
      setIsCoverModalOpen(false);
    } catch (err) {
      alert('Erro ao atualizar capa do livro');
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
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="w-8 h-10 bg-stone-100 rounded-md overflow-hidden flex-shrink-0 border border-stone-200">
                      {book.image_url ? (
                        <img src={book.image_url} alt={book.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <Book size={16} />
                        </div>
                      )}
                    </div>
                    <span className="truncate">{book.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCover(book);
                      }}
                      className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Editar Capa"
                    >
                      <ImageIcon size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVisibility(book.id, book.visible);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        book.visible 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-stone-400 hover:bg-stone-100'
                      }`}
                      title={book.visible ? 'Visível no sistema' : 'Oculto no sistema'}
                    >
                      {book.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRelease(book.id, book.released);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        book.released 
                          ? 'text-blue-600 hover:bg-blue-50' 
                          : 'text-stone-400 hover:bg-stone-100'
                      }`}
                      title={book.released ? 'Liberado para usuários' : 'Bloqueado para usuários'}
                    >
                      {book.released ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </button>
                  </div>
                  <ChevronRight size={16} className={selectedBookId === book.id ? 'opacity-100' : 'opacity-0 flex-shrink-0'} />
                </div>
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

      <BookCoverModal 
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        book={editingBook}
        onUpdate={handleCoverUpdate}
      />
    </div>
  );
}

function BookCoverModal({ isOpen, onClose, book, onUpdate }: any) {
  const [url, setUrl] = useState(book?.image_url || '');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(book?.image_url || '');

  useEffect(() => {
    setUrl(book?.image_url || '');
    setPreview(book?.image_url || '');
  }, [book, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Limite de 5MB.');
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadBookCover(book.id, file);
      setUrl(publicUrl);
      setPreview(publicUrl);
    } catch (err) {
      alert('Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
      >
        <h3 className="text-xl font-bold text-stone-900 mb-6">Capa de {book?.name}</h3>
        
        <div className="space-y-6">
          <div className="aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden border-2 border-dashed border-stone-200 flex items-center justify-center relative">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-stone-300" size={48} />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="animate-spin text-red-600" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Upload de Imagem</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-bold text-stone-700 mb-2">Ou URL da Imagem</label>
              <input 
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setPreview(e.target.value);
                }}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 text-stone-600 font-bold hover:bg-stone-50 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => onUpdate(url)}
              disabled={uploading}
              className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-100"
            >
              Salvar Capa
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
