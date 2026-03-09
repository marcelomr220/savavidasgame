import React, { useState, useEffect } from 'react';
import { Layout, RefreshCw, Star, Trophy, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../types';

const CHARACTERS = [
  { id: 1, name: 'Noé', icon: '🚢' },
  { id: 2, name: 'Moisés', icon: '📜' },
  { id: 3, name: 'Davi', icon: '🎸' },
  { id: 4, name: 'Sansão', icon: '💪' },
  { id: 5, name: 'Daniel', icon: '🦁' },
  { id: 6, name: 'Jonas', icon: '🐳' },
  { id: 7, name: 'Ester', icon: '👑' },
  { id: 8, name: 'Paulo', icon: '✉️' },
];

import { useNavigate } from 'react-router-dom';
import { submitQuiz } from '../../services/api';

export default function MemoryGame({ user }: { user: User }) {
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    initializeGame();
  }, []);

  useEffect(() => {
    let timer: any;
    if (!finished && cards.length > 0) {
      timer = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [finished, cards]);

  const initializeGame = () => {
    const duplicated = [...CHARACTERS, ...CHARACTERS]
      .sort(() => Math.random() - 0.5)
      .map((char, index) => ({ ...char, uniqueId: index }));
    setCards(duplicated);
    setFlipped([]);
    setSolved([]);
    setMoves(0);
    setFinished(false);
    setTime(0);
  };

  const handleCardClick = (uniqueId: number) => {
    if (flipped.length === 2 || flipped.includes(uniqueId) || solved.includes(uniqueId)) return;

    const newFlipped = [...flipped, uniqueId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].id === cards[second].id) {
        setSolved([...solved, first, second]);
        setFlipped([]);
        if (solved.length + 2 === cards.length) {
          setFinished(true);
          submitScore();
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  const submitScore = async () => {
    // Memory game gives 20 points
    try {
      await submitQuiz(user.id, 20);
    } catch (err) {
      console.error("Error submitting memory game score:", err);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-stone-600 font-bold">
            <Clock size={18} />
            <span>{formatTime(time)}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-600 font-bold">
            <RefreshCw size={18} />
            <span>{moves} movimentos</span>
          </div>
        </div>
        <button 
          onClick={initializeGame}
          className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {cards.map((card) => (
          <motion.div
            key={card.uniqueId}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleCardClick(card.uniqueId)}
            className={`aspect-square rounded-2xl cursor-pointer transition-all duration-500 preserve-3d relative ${
              flipped.includes(card.uniqueId) || solved.includes(card.uniqueId) ? 'rotate-y-180' : ''
            }`}
          >
            {/* Front */}
            <div className={`absolute inset-0 bg-stone-900 rounded-2xl flex items-center justify-center text-white backface-hidden ${
              flipped.includes(card.uniqueId) || solved.includes(card.uniqueId) ? 'opacity-0' : 'opacity-100'
            }`}>
              <Star size={32} fill="currentColor" className="opacity-20" />
            </div>
            
            {/* Back */}
            <div className={`absolute inset-0 bg-white border-2 border-red-500 rounded-2xl flex flex-col items-center justify-center backface-hidden ${
              flipped.includes(card.uniqueId) || solved.includes(card.uniqueId) ? 'opacity-100' : 'opacity-0'
            }`}>
              <span className="text-4xl mb-1">{card.icon}</span>
              <span className="text-[10px] font-bold text-stone-400 uppercase">{card.name}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-600 p-8 rounded-3xl text-white text-center shadow-xl shadow-red-200"
          >
            <Trophy size={48} className="mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Excelente Memória!</h3>
            <p className="mb-6 opacity-90">Você completou o desafio em {moves} movimentos e {formatTime(time)}.</p>
            <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl mb-6 inline-block">
              <p className="text-sm font-bold uppercase tracking-widest">Pontos Ganhos</p>
              <p className="text-3xl font-black">+20 XP</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={initializeGame}
                className="flex-1 py-3 bg-white text-red-600 rounded-xl font-bold hover:bg-stone-50 transition-colors"
              >
                Jogar Novamente
              </button>
              <button 
                onClick={() => navigate('/games')}
                className="flex-1 py-3 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800 transition-colors"
              >
                Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
