import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Trophy, User, CheckSquare, Gamepad2 } from 'lucide-react';

export default function BottomNavigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Início' },
    { path: '/tasks', icon: CheckSquare, label: 'Tarefas' },
    { path: '/teams', icon: Users, label: 'Equipes' },
    { path: '/ranking', icon: Trophy, label: 'Ranking' },
    { path: '/games', icon: Gamepad2, label: 'Games' },
    { path: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 px-2 py-1 safe-area-bottom z-50 flex justify-around items-center h-16 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] rounded-t-[24px]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2 transition-all duration-200 ${
              isActive ? 'text-red-600' : 'text-stone-400'
            }`}
          >
            <div className={`p-1.5 rounded-full transition-colors ${isActive ? 'bg-red-50' : ''}`}>
              <item.icon size={22} />
            </div>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
