import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  CheckSquare, 
  QrCode, 
  Gamepad2, 
  User as UserIcon, 
  LayoutDashboard,
  Settings,
  LogOut,
  Flame,
  ChevronRight,
  Star,
  TreeDeciduous,
  Menu,
  X,
  Book
} from 'lucide-react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from './types';

// Components
import Dashboard from './components/Dashboard';
import Teams from './components/Teams';
import IndividualRanking from './components/IndividualRanking';
import Tasks from './components/Tasks';
import Attendance from './components/Attendance';
import Games from './components/Games';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import AdminTasks from './components/AdminTasks';
import AdminAttendance from './components/AdminAttendance';
import AdminTeams from './components/AdminTeams';
import AdminUsers from './components/AdminUsers';
import AdminSettings from './components/AdminSettings';
import BibleIndex from './components/BibleIllustrated/BibleIndex';
import ChapterList from './components/BibleIllustrated/ChapterList';
import ReadingView from './components/BibleIllustrated/ReadingView';
import AdminBible from './components/BibleIllustrated/AdminBible';
import ChapterEditor from './components/BibleIllustrated/ChapterEditor';
import Login from './components/Login';

import BottomNavigation from './components/BottomNavigation';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/');
  };

  const handleUpdateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user && location.pathname !== '/login') {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = user?.role === 'admin';

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/teams', icon: Users, label: 'Equipes' },
    { path: '/ranking', icon: Trophy, label: 'Ranking' },
    { path: '/tasks', icon: CheckSquare, label: 'Tarefas' },
    { path: '/attendance', icon: QrCode, label: 'Presença' },
    { path: '/games', icon: Gamepad2, label: 'Games' },
    { path: '/bible', icon: Book, label: 'Bíblia' },
    { path: '/profile', icon: UserIcon, label: 'Perfil' },
  ];

  const adminItems = [
    { path: '/admin', icon: Settings, label: 'Admin Panel' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface sticky top-0 z-50 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-sm">
            <Star size={24} fill="currentColor" />
          </div>
          <span className="font-bold text-on-surface text-lg">Salva Vidas</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
              <Settings size={22} />
            </Link>
          )}
          <button onClick={handleLogout} className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
            <LogOut size={22} />
          </button>
        </div>
      </div>

      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex w-72 bg-surface border-r border-surface-variant flex-col p-4">
        <div className="p-6 flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-on-primary shadow-lg">
            <Star size={28} fill="currentColor" />
          </div>
          <div>
            <h1 className="font-bold text-on-surface text-xl leading-tight">Salva Vidas</h1>
            <p className="text-xs text-on-surface-variant">Church Community</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </Link>
          ))}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-surface-variant">
              <p className="px-4 mb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Administração</p>
              {adminItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all duration-200 ${
                    location.pathname.startsWith(item.path)
                      ? 'bg-primary text-on-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  <item.icon size={22} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-surface-variant">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-variant/50 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-container overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-primary-container font-bold">
                  {user?.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">{user?.name}</p>
              <p className="text-xs text-on-surface-variant truncate">Nível {user?.level}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
          >
            <LogOut size={22} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-8 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard user={user!} />} />
                <Route path="/teams" element={<Teams user={user!} />} />
                <Route path="/ranking" element={<IndividualRanking user={user!} />} />
                <Route path="/tasks" element={<Tasks user={user!} />} />
                <Route path="/attendance" element={<Attendance user={user!} />} />
                <Route path="/games/*" element={<Games user={user!} />} />
                <Route path="/bible" element={<BibleIndex />} />
                <Route path="/bible/book/:bookId" element={<ChapterList />} />
                <Route path="/bible/read/:chapterId" element={<ReadingView user={user!} />} />
                <Route path="/profile" element={<Profile user={user!} onUpdateUser={handleUpdateUser} />} />
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                
                {isAdmin && (
                  <>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/tasks" element={<AdminTasks />} />
                    <Route path="/admin/attendance" element={<AdminAttendance />} />
                    <Route path="/admin/teams" element={<AdminTeams />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/bible" element={<AdminBible />} />
                    <Route path="/admin/bible/new" element={<ChapterEditor />} />
                    <Route path="/admin/bible/edit/:id" element={<ChapterEditor />} />
                  </>
                )}
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <BottomNavigation />
    </div>
  );
}
