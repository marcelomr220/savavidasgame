import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getChapter, markChapterAsRead, getChapterContent } from '../../services/api';
import { User } from '../../types';

export default function ReadingView({ user, onUpdateUser }: { user: User, onUpdateUser?: () => void }) {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingComplete, setReadingComplete] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [markingRead, setMarkingRead] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    
    const loadData = async () => {
      try {
        const chapterData = await getChapter(Number(chapterId));
        setChapter(chapterData);
        
        const content = await getChapterContent(Number(chapterId));
        setBlocks(content);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar capítulo");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [chapterId]);

  const handleFinishReading = async () => {
    if (!chapterId || markingRead || readingComplete) return;
    
    setMarkingRead(true);
    try {
      const result = await markChapterAsRead(Number(chapterId), user.id);
      setReadingComplete(true);
      setPointsAwarded(result.pointsAwarded);
      if (onUpdateUser) onUpdateUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMarkingRead(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-[#D4AF37] z-50">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-serif text-xl tracking-widest uppercase">Preparando Experiência...</p>
      </div>
    );
  }

  if (!chapter) return null;

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-[#D4AF37] selection:text-black">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#D4AF37] origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 p-4 flex items-center justify-between bg-black/90 backdrop-blur-md border-b border-white/5 z-[100]">
        <button 
          onClick={() => navigate(`/bible/book/${chapter.book_id}`)}
          className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest">Voltar</span>
        </button>
        <div className="text-center">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37] leading-none mb-1">{chapter.bible_books?.name}</h2>
          <p className="font-serif text-sm italic text-stone-300 leading-none">Capítulo {chapter.chapter_number}</p>
        </div>
        <div className="w-10 sm:w-20" /> {/* Spacer */}
      </nav>

      {/* Hero Section with Black Background */}
      <div className="relative h-[50vh] flex flex-col items-center justify-center bg-black border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black" />
        <div className="relative z-10 text-center p-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2 }}
          >
            <h2 className="text-xs font-bold uppercase tracking-[0.6em] text-[#D4AF37] mb-4 opacity-80">
              {chapter.bible_books?.name}
            </h2>
            <h1 className="text-6xl md:text-8xl font-serif font-bold text-white tracking-tight">
              Capítulo {chapter.chapter_number}
            </h1>
            {chapter.title && (
              <p className="text-xl md:text-3xl text-stone-400 italic font-serif mt-6 max-w-2xl mx-auto leading-relaxed">
                {chapter.title}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto pt-20 pb-40 px-6 space-y-24">

        {blocks.map((block: any, index: number) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            {block.block_type === 'verse' && (
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <span className="text-[#D4AF37] font-serif text-2xl font-bold opacity-50 mt-1">
                    {block.bible_verses?.verse_number}
                  </span>
                  <p className="text-xl md:text-2xl leading-relaxed text-stone-200 font-light">
                    {block.bible_verses?.verse_text}
                  </p>
                </div>
                {block.bible_verses?.image_url && (
                  <div className="relative aspect-video rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.1)] border border-white/10">
                    <img 
                      src={block.bible_verses.image_url} 
                      alt={`Ilustração Versículo ${block.bible_verses.verse_number}`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
              </div>
            )}

            {block.block_type === 'text' && (
              <div className="text-center py-8">
                <div className="w-12 h-[1px] bg-[#D4AF37]/40 mx-auto mb-8" />
                <p className="text-lg md:text-xl leading-relaxed text-stone-400 italic font-serif">
                  {block.content_text}
                </p>
                <div className="w-12 h-[1px] bg-[#D4AF37]/40 mx-auto mt-8" />
              </div>
            )}

            {block.block_type === 'image' && (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.1)] border border-white/10">
                  <img 
                    src={block.image_url} 
                    alt="Ilustração Bíblica" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                {block.content_text && (
                  <p className="text-center text-xs uppercase tracking-widest text-stone-500 font-bold">
                    {block.content_text}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        ))}

        {/* Finish Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="pt-20 text-center space-y-8"
        >
          {!readingComplete ? (
            <button
              onClick={handleFinishReading}
              disabled={markingRead}
              className="px-12 py-5 bg-[#D4AF37] text-black rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(212,175,55,0.3)] disabled:opacity-50"
            >
              {markingRead ? <Loader2 className="animate-spin mx-auto" /> : "Concluir Leitura Sagrada"}
            </button>
          ) : (
            <div className="bg-stone-900/50 border border-[#D4AF37]/30 p-8 rounded-3xl space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 bg-[#D4AF37] rounded-full flex items-center justify-center text-black mx-auto shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#D4AF37]">Leitura Concluída!</h3>
              {pointsAwarded > 0 ? (
                <p className="text-stone-300">Parabéns! Você ganhou <span className="text-white font-bold">{pointsAwarded} pontos</span> por sua dedicação hoje.</p>
              ) : (
                <p className="text-stone-400 text-sm italic">Você já recebeu pontos por este capítulo anteriormente.</p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 text-red-400 text-sm bg-red-400/10 p-4 rounded-2xl border border-red-400/20 max-w-md mx-auto">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex items-center justify-center gap-6 pt-12">
            <button className="flex items-center gap-2 text-stone-500 hover:text-white transition-colors">
              <ChevronLeft size={20} />
              <span className="text-xs font-bold uppercase tracking-widest">Capítulo Anterior</span>
            </button>
            <div className="w-px h-4 bg-stone-800" />
            <button className="flex items-center gap-2 text-stone-500 hover:text-white transition-colors">
              <span className="text-xs font-bold uppercase tracking-widest">Próximo Capítulo</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
