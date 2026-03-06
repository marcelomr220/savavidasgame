import React, { useState } from 'react';
import { Puzzle, Star, CheckCircle2, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../../types';
import { submitQuiz } from '../../services/api';

export default function PuzzleGame({ user }: { user: User }) {
  const [finished, setFinished] = useState(false);

  // Simplified puzzle simulation for now
  const handleFinish = async () => {
    try {
      await submitQuiz(user.id, 25);
      setFinished(true);
    } catch (err) {
      console.error("Error submitting puzzle game score:", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <h3 className="text-2xl font-bold text-stone-900">Quebra-Cabeça Bíblico</h3>
        <p className="text-stone-500">Monte a cena e descubra o versículo.</p>
      </header>

      <div className="bg-white p-8 rounded-[40px] border border-stone-200 shadow-sm flex flex-col items-center">
        {!finished ? (
          <div className="space-y-8 w-full">
            <div className="aspect-video bg-stone-100 rounded-3xl border-2 border-dashed border-stone-300 flex items-center justify-center relative overflow-hidden">
              <img 
                src="https://picsum.photos/seed/bible/800/450" 
                alt="Bible Scene" 
                className="w-full h-full object-cover opacity-30 grayscale"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2 p-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/50 flex items-center justify-center">
                    <Puzzle className="text-stone-400" size={24} />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={handleFinish}
                  className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-xl hover:bg-red-700 transition-all"
                >
                  Simular Montagem
                </button>
              </div>
            </div>
            
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
              <p className="text-stone-400 italic text-center">"O Senhor é o meu pastor, nada me faltará." - Salmos 23:1</p>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">Cena Completa!</h3>
            <p className="text-stone-500 mb-8">Você montou a Arca de Noé com sucesso.</p>
            
            <div className="aspect-video bg-stone-100 rounded-3xl overflow-hidden mb-8 shadow-xl">
              <img 
                src="https://picsum.photos/seed/bible/800/450" 
                alt="Bible Scene" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="bg-red-50 p-6 rounded-2xl mb-8">
              <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Pontos Ganhos</p>
              <p className="text-4xl font-black text-red-700">+25 XP</p>
            </div>

            <button 
              onClick={() => window.location.href = '/games'}
              className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors"
            >
              Voltar para Games
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
