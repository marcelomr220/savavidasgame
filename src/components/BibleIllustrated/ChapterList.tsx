import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, BookOpen } from 'lucide-react';
import { getBookChapters, getBooks } from '../../services/api';

export default function ChapterList() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<any[]>([]);
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) return;

    const fetchData = async () => {
      try {
        const [chaptersData, booksData] = await Promise.all([
          getBookChapters(Number(bookId)),
          getBooks(true)
        ]);
        setChapters(chaptersData);
        setBook(booksData.find((b: any) => b.id === Number(bookId)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-stone-400">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Carregando capítulos...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500">Livro não encontrado.</p>
        <button onClick={() => navigate('/bible')} className="mt-4 text-[#D4AF37] font-bold">Voltar ao Índice</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="relative h-64 md:h-80 rounded-3xl overflow-hidden mb-8 shadow-xl">
        <img 
          src={book.image_url || `https://picsum.photos/seed/${book.name}/1200/400`} 
          alt={book.name}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 flex items-end gap-6 w-full">
          <button 
            onClick={() => navigate('/bible')}
            className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all shadow-lg"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white drop-shadow-lg">{book.name}</h1>
            <p className="text-stone-300 font-medium">Selecione um capítulo para iniciar a leitura ilustrada.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {chapters.map((chapter) => (
          <Link key={chapter.id} to={`/bible/read/${chapter.id}`}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="aspect-square bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 group hover:border-[#D4AF37] hover:bg-stone-900 transition-all duration-300"
            >
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest group-hover:text-[#D4AF37]/60">Capítulo</span>
              <span className="text-3xl font-serif font-bold text-stone-900 group-hover:text-white">{chapter.chapter_number}</span>
              <BookOpen size={16} className="text-stone-300 group-hover:text-[#D4AF37]" />
            </motion.div>
          </Link>
        ))}
      </div>

      {chapters.length === 0 && (
        <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
          <p className="text-stone-500 font-medium">Nenhum capítulo disponível para este livro.</p>
          <p className="text-stone-400 text-sm">O administrador está trabalhando nisso!</p>
        </div>
      )}
    </div>
  );
}
