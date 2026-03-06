import React, { useState } from 'react';
import { Sword, Star, Trophy, ArrowRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../../types';
import { submitQuiz } from '../../services/api';

export default function PastorAdventure({ user }: { user: User }) {
  const [finished, setFinished] = useState(false);

  const handleFinish = async () => {
    try {
      await submitQuiz(user.id, 50);
      setFinished(true);
    } catch (err) {
      console.error("Error submitting pastor adventure score:", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <h3 className="text-2xl font-bold text-stone-900">Aventura do Pastor</h3>
        <p className="text-stone-500">Ajude o pastor a levar a Palavra para todas as nações.</p>
      </header>

      <div className="bg-stone-900 p-8 rounded-[40px] shadow-2xl min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Game Background Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-stone-800" />
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

        {!finished ? (
          <div className="relative z-10 text-center space-y-8">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-6xl"
            >
              🧔‍♂️
            </motion.div>
            <div className="space-y-4">
              <h4 className="text-white font-bold text-xl">Missão: Aldeia da Paz</h4>
              <div className="flex justify-center gap-4">
                <div className="flex items-center gap-2 text-stone-400 text-sm">
                  <Shield size={16} />
                  <span>Fé: 100%</span>
                </div>
                <div className="flex items-center gap-2 text-stone-400 text-sm">
                  <Star size={16} fill="currentColor" className="text-amber-400" />
                  <span>Almas: 0/10</span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleFinish}
              className="px-12 py-4 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-700 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
            >
              Iniciar Missão
              <ArrowRight size={24} />
            </button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 text-center"
          >
            <div className="w-24 h-24 bg-amber-400 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-400/20">
              <Trophy size={48} fill="currentColor" />
            </div>
            <h3 className="text-3xl font-black text-white mb-2">Missão Cumprida!</h3>
            <p className="text-stone-400 mb-8">Você levou a Palavra para 10 novas pessoas.</p>
            
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl mb-8 border border-white/10">
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Recompensa da Missão</p>
              <p className="text-5xl font-black text-white">+50 XP</p>
            </div>

            <button 
              onClick={() => window.location.href = '/games'}
              className="w-full py-4 bg-white text-stone-900 rounded-2xl font-bold hover:bg-stone-100 transition-colors"
            >
              Voltar para o Mapa
            </button>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 text-center">
          <p className="text-xs font-bold text-stone-400 uppercase mb-1">Fases</p>
          <p className="font-bold text-stone-900">1 / 12</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 text-center">
          <p className="text-xs font-bold text-stone-400 uppercase mb-1">Dificuldade</p>
          <p className="font-bold text-red-600">Fácil</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 text-center">
          <p className="text-xs font-bold text-stone-400 uppercase mb-1">Recorde</p>
          <p className="font-bold text-stone-900">350 pts</p>
        </div>
      </div>
    </div>
  );
}
