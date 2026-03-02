import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Gamepad2, 
  Brain, 
  Layout, 
  Puzzle, 
  Sword, 
  TreeDeciduous,
  ChevronRight,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../types';

// Game Components
import Quiz from './games/Quiz';
import MemoryGame from './games/MemoryGame';
import PuzzleGame from './games/PuzzleGame';
import PastorAdventure from './games/PastorAdventure';
import KingdomTree from './games/KingdomTree';

export default function Games({ user }: { user: User }) {
  const location = useLocation();
  const isMain = location.pathname === '/games';

  const gameList = [
    { 
      id: 'quiz', 
      title: 'Quiz Bíblico', 
      desc: '3 perguntas diárias para testar seu conhecimento.', 
      icon: Brain, 
      color: 'bg-blue-500', 
      points: 'Até 60 pts',
      path: '/games/quiz'
    },
    { 
      id: 'tree', 
      title: 'Árvore do Reino', 
      desc: 'Plante e cultive sua árvore virtual com água viva.', 
      icon: TreeDeciduous, 
      color: 'bg-red-500', 
      points: '30 pts/árvore',
      path: '/games/tree'
    },
    { 
      id: 'memory', 
      title: 'Jogo da Memória', 
      desc: 'Encontre os pares de personagens bíblicos.', 
      icon: Layout, 
      color: 'bg-purple-500', 
      points: '20 pts',
      path: '/games/memory'
    },
    { 
      id: 'puzzle', 
      title: 'Quebra-Cabeça', 
      desc: 'Monte cenas bíblicas e aprenda versículos.', 
      icon: Puzzle, 
      color: 'bg-orange-500', 
      points: '25 pts',
      path: '/games/puzzle'
    },
    { 
      id: 'adventure', 
      title: 'Aventura do Pastor', 
      desc: 'Ajude o pastor em sua missão evangelística.', 
      icon: Sword, 
      color: 'bg-rose-500', 
      points: '50 pts',
      path: '/games/adventure'
    },
  ];

  if (!isMain) {
    return (
      <div className="space-y-6">
        <Link to="/games" className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold transition-colors">
          <ChevronRight className="rotate-180" size={18} />
          Voltar para Games
        </Link>
        <Routes>
          <Route path="quiz" element={<Quiz user={user} />} />
          <Route path="tree" element={<KingdomTree user={user} />} />
          <Route path="memory" element={<MemoryGame user={user} />} />
          <Route path="puzzle" element={<PuzzleGame user={user} />} />
          <Route path="adventure" element={<PastorAdventure user={user} />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-stone-900">Games Bíblicos</h2>
        <p className="text-stone-500">Divirta-se e aprenda mais sobre a Palavra de Deus enquanto ganha pontos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gameList.map((game) => (
          <Link key={game.id} to={game.path} className="group">
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:border-red-200 hover:shadow-md transition-all flex items-center gap-6"
            >
              <div className={`w-16 h-16 rounded-2xl ${game.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <game.icon size={32} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-stone-900 group-hover:text-red-600 transition-colors">{game.title}</h3>
                  <div className="flex items-center gap-1 text-red-600 font-bold text-sm">
                    <Star size={14} fill="currentColor" />
                    <span>{game.points}</span>
                  </div>
                </div>
                <p className="text-sm text-stone-500 leading-relaxed">{game.desc}</p>
              </div>
              <ChevronRight className="text-stone-300 group-hover:text-red-500 transition-colors" size={24} />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
