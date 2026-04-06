import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Gamepad2, 
  Brain, 
  Layout, 
  Sword, 
  TreeDeciduous,
  ChevronRight,
  Star,
  Search,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../types';
import { getAppSettings, getTeams } from '../services/api';

// Game Components
import Quiz from './games/Quiz';
import MemoryGame from './games/MemoryGame';
import PastorAdventure from './games/PastorAdventure';
import KingdomTree from './games/KingdomTree';
import InvestigationMode from './InvestigationMode';
import SocialDeductionGame from './games/SocialDeductionGame';

export default function Games({ user, onUpdateUser }: { user: User, onUpdateUser?: () => void }) {
  const location = useLocation();
  const isMain = location.pathname === '/games';
  const [gameEnabled, setGameEnabled] = React.useState(false);
  const [leadersOnly, setLeadersOnly] = React.useState(false);
  const [isLeader, setIsLeader] = React.useState(false);

  React.useEffect(() => {
    const checkGameSettings = async () => {
      const enabled = await getAppSettings('social_deduction_game_enabled');
      setGameEnabled(enabled === 'true');

      const onlyLeaders = await getAppSettings('social_deduction_game_leaders_only');
      setLeadersOnly(onlyLeaders === 'true');

      if (onlyLeaders === 'true') {
        const teams = await getTeams();
        const userIsLeader = teams.some(team => team.leader_id === user.id);
        setIsLeader(userIsLeader);
      }
    };
    checkGameSettings();
  }, [user.id]);

  const canPlaySocialDeduction = gameEnabled && (!leadersOnly || isLeader || user.role === 'admin');

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
      id: 'adventure', 
      title: 'Aventura do Pastor', 
      desc: 'Ajude o pastor em sua missão evangelística.', 
      icon: Sword, 
      color: 'bg-rose-500', 
      points: '50 pts',
      path: '/games/adventure'
    },
    { 
      id: 'investigation', 
      title: 'Modo Investigação', 
      desc: 'Desvende mistérios bíblicos semanais com pistas diárias.', 
      icon: Search, 
      color: 'bg-stone-800', 
      points: 'Até 100 pts',
      path: '/games/investigation'
    },
  ];

  if (canPlaySocialDeduction) {
    gameList.push({
      id: 'social-deduction',
      title: 'Infiltrados no Reino',
      desc: 'Descubra quem é o infiltrado antes que seja tarde demais!',
      icon: Users,
      color: 'bg-red-600',
      points: '50 pts/vitória',
      path: '/games/social-deduction'
    });
  }

  if (!isMain) {
    return (
      <div className="space-y-6">
        <Link to="/games" className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold transition-colors">
          <ChevronRight className="rotate-180" size={18} />
          Voltar para Games
        </Link>
        <Routes>
          <Route path="quiz" element={<Quiz user={user} onUpdateUser={onUpdateUser} />} />
          <Route path="tree" element={<KingdomTree user={user} onUpdateUser={onUpdateUser} />} />
          <Route path="memory" element={<MemoryGame user={user} onUpdateUser={onUpdateUser} />} />
          <Route path="adventure" element={<PastorAdventure user={user} onUpdateUser={onUpdateUser} />} />
          <Route path="investigation" element={<InvestigationMode user={user} />} />
          {canPlaySocialDeduction && (
            <Route path="social-deduction" element={<SocialDeductionGame user={user} onUpdateUser={onUpdateUser} />} />
          )}
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
