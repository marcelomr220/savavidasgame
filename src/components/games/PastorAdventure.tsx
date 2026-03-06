import React, { useState, useEffect } from 'react';
import { Sword, Star, Trophy, ArrowRight, Shield, Heart, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../types';

export default function PastorAdventure({ user }: { user: User }) {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'finished'>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targets, setTargets] = useState<{ id: number, x: number, y: number, emoji: string }[]>([]);

  const emojis = ['👨‍👩‍👧‍👦', '👨‍🦳', '👩‍🦰', '🧔‍♂️', '👵', '👱‍♂️', '👩‍🎓', '👨‍🌾'];

  useEffect(() => {
    let timer: any;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      handleFinish();
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    let spawner: any;
    if (gameState === 'playing') {
      spawner = setInterval(() => {
        const newTarget = {
          id: Date.now(),
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
          emoji: emojis[Math.floor(Math.random() * emojis.length)]
        };
        setTargets(prev => [...prev, newTarget]);
        
        // Remove target after 2 seconds
        setTimeout(() => {
          setTargets(prev => prev.filter(t => t.id !== newTarget.id));
        }, 2000);
      }, 800);
    }
    return () => clearInterval(spawner);
  }, [gameState]);

  const handleStart = () => {
    setScore(0);
    setTimeLeft(30);
    setGameState('playing');
    setTargets([]);
  };

  const handleFinish = async () => {
    setGameState('finished');
    const points = Math.min(score * 2, 50); // Max 50 points
    await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, score: points }),
    });
  };

  const handleTargetClick = (id: number) => {
    setScore(prev => prev + 1);
    setTargets(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <h3 className="text-2xl font-bold text-stone-900">Aventura do Pastor</h3>
        <p className="text-stone-500">Toque nas pessoas para compartilhar a Palavra!</p>
      </header>

      <div className="bg-stone-900 p-4 rounded-[40px] shadow-2xl min-h-[500px] flex flex-col relative overflow-hidden select-none">
        {/* HUD */}
        <div className="relative z-20 flex justify-between p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <Users size={18} className="text-blue-400" />
              <span className="font-bold">{score} Almas</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Star size={18} fill="currentColor" className="text-amber-400" />
              <span className="font-bold">{Math.min(score * 2, 50)} pts</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white font-mono text-xl">
            <span className={timeLeft < 10 ? 'text-red-500 animate-pulse' : ''}>{timeLeft}s</span>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 relative mt-4">
          {gameState === 'start' && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center p-8">
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-7xl mb-6"
              >
                🧔‍♂️
              </motion.div>
              <h4 className="text-white font-black text-3xl mb-2">Missão Evangelística</h4>
              <p className="text-stone-400 mb-8 max-w-xs">Muitas pessoas precisam ouvir a Palavra. Toque nelas antes que elas sigam seu caminho!</p>
              <button 
                onClick={handleStart}
                className="px-12 py-4 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-700 hover:scale-105 transition-all flex items-center gap-3"
              >
                Começar Missão
                <ArrowRight size={24} />
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <AnimatePresence>
              {targets.map(target => (
                <motion.button
                  key={target.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={() => handleTargetClick(target.id)}
                  style={{ left: `${target.x}%`, top: `${target.y}%` }}
                  className="absolute text-5xl p-2 hover:scale-125 transition-transform cursor-pointer z-20"
                >
                  {target.emoji}
                </motion.button>
              ))}
            </AnimatePresence>
          )}

          {gameState === 'finished' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-24 h-24 bg-amber-400 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-400/20">
                <Trophy size={48} fill="currentColor" />
              </div>
              <h3 className="text-3xl font-black text-white mb-2">Missão Cumprida!</h3>
              <p className="text-stone-400 mb-8">Você compartilhou a Palavra com {score} pessoas.</p>
              
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl mb-8 border border-white/10 w-full">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Recompensa</p>
                <p className="text-5xl font-black text-white">+{Math.min(score * 2, 50)} XP</p>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={handleStart}
                  className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-colors"
                >
                  Tentar Novamente
                </button>
                <button 
                  onClick={() => window.location.href = '/games'}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors"
                >
                  Finalizar
                </button>
              </div>
            </motion.div>
          )}

          {/* Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-stone-950 to-transparent opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 text-center">
          <p className="text-xs font-bold text-stone-400 uppercase mb-1">Tempo</p>
          <p className="font-bold text-stone-900">30s</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 text-center">
          <p className="text-xs font-bold text-stone-400 uppercase mb-1">Meta</p>
          <p className="font-bold text-red-600">25 Almas</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 text-center">
          <p className="text-xs font-bold text-stone-400 uppercase mb-1">Max Pontos</p>
          <p className="font-bold text-stone-900">50 pts</p>
        </div>
      </div>
    </div>
  );
}
