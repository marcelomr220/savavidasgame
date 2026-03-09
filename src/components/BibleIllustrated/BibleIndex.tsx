import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getBibleBooks } from '../../services/api';

export default function BibleIndex() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBibleBooks()
      .then(setBooks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-stone-400">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Carregando Biblioteca Sagrada...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-serif font-bold text-stone-900">A Bíblia Ilustrada</h1>
        <p className="text-stone-500 max-w-md mx-auto">
          Explore as Escrituras Sagradas através de uma experiência visual épica e imersiva.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <Link key={book.id} to={`/bible/book/${book.id}`}>
            <motion.div
              whileHover={{ y: -5 }}
              className="group relative h-64 rounded-3xl overflow-hidden shadow-lg cursor-pointer"
            >
              <img
                src={book.image_url || `https://picsum.photos/seed/${book.name}/600/800`}
                alt={book.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-white">{book.name}</h3>
                    <p className="text-stone-300 text-sm">Toque para ver os capítulos</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-[#D4AF37] group-hover:text-black transition-colors">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {books.length === 0 && (
        <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
          <Book className="mx-auto mb-4 text-stone-300" size={48} />
          <p className="text-stone-500 font-medium">Nenhum livro cadastrado ainda.</p>
          <p className="text-stone-400 text-sm">Aguarde as próximas atualizações!</p>
        </div>
      )}
    </div>
  );
}
