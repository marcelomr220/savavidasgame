import React, { useState, useEffect } from 'react';
import { Sword, Star, Trophy, ArrowRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';
import { submitQuiz } from '../../services/api';

export default function PastorAdventure({ user }: { user: User }) {
  const navigate = useNavigate();
  const [finished, setFinished] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [almas, setAlmas] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  const startMission = () => {
    setPlaying(true);
    setAlmas(0);
    setTimeLeft(15);
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFinish = async () => {
    setPlaying(false);
    try {
      // Points based on almas collected, max 50
      const points = Math.min(almas * 5, 50);
      if (points > 0) {
        await submitQuiz(user.id, points);
      }
      setFinished(true);
    } catch (err) {
      console.error("Error submitting pastor adventure score:", err);
    }
  };

  const [pastorPos, setPastorPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (playing) {
      const interval = setInterval(() => {
        // Random position within a range
        setPastorPos({
          x: Math.random() * 200 - 100,
          y: Math.random() * 200 - 100
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [playing]);

  const collectAlma = () => {
    if (!playing) return;
    setAlmas(prev => prev + 1);
    // Move immediately on click
    setPastorPos({
      x: Math.random() * 200 - 100,
      y: Math.random() * 200 - 100
    });
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

        {!playing && !finished ? (
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
              <p className="text-stone-400 text-sm max-w-xs mx-auto">O Pastor aparecerá em lugares aleatórios. Clique nele o mais rápido possível!</p>
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
              onClick={startMission}
              className="px-12 py-4 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-700 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
            >
              Iniciar Missão
              <ArrowRight size={24} />
            </button>
          </div>
        ) : playing ? (
          <div className="relative z-10 text-center space-y-8 w-full h-full flex flex-col items-center justify-center">
            <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-8 z-20">
              <div className="bg-white/10 px-4 py-2 rounded-xl text-white font-bold backdrop-blur-md">
                Tempo: {timeLeft}s
              </div>
              <div className="bg-amber-400 px-4 py-2 rounded-xl text-stone-900 font-bold shadow-lg">
                Almas: {almas}
              </div>
            </div>

            <div className="relative w-full h-64 flex items-center justify-center">
              <motion.div 
                whileTap={{ scale: 0.8 }}
                onClick={collectAlma}
                className="text-8xl cursor-pointer select-none absolute"
                animate={{ 
                  x: pastorPos.x,
                  y: pastorPos.y
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                🧔‍♂️
              </motion.div>
            </div>

            <p className="text-stone-400 font-bold animate-pulse mt-8">CLIQUE NO PASTOR!</p>
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
            <p className="text-stone-400 mb-8">Você levou a Palavra para {almas} novas pessoas.</p>
            
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl mb-8 border border-white/10">
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Recompensa da Missão</p>
              <p className="text-5xl font-black text-white">+{Math.min(almas * 5, 50)} XP</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { setFinished(false); setPlaying(false); }}
                className="flex-1 py-4 bg-stone-800 text-white rounded-2xl font-bold hover:bg-stone-700 transition-colors"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={() => navigate('/games')}
                className="flex-1 py-4 bg-white text-stone-900 rounded-2xl font-bold hover:bg-stone-100 transition-colors"
              >
                Sair
              </button>
            </div>
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
