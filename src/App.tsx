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
  X
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
import Login from './components/Login';

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
    { path: '/profile', icon: UserIcon, label: 'Perfil' },
  ];

  const adminItems = [
    { path: '/admin', icon: Settings, label: 'Admin Panel' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-stone-50">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white">
            <Star size={20} fill="currentColor" />
          </div>
          <span className="font-bold text-stone-800">SalvaVidas</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-stone-600">
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isMenuOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-stone-200 z-40 flex flex-col transition-all duration-300 ${isMenuOpen ? 'block' : 'hidden md:flex'}`}
          >
            <div className="p-6 hidden md:flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200">
                <Star size={24} fill="currentColor" />
              </div>
              <div>
                <h1 className="font-bold text-stone-900 leading-tight">SalvaVidas</h1>
                <p className="text-xs text-stone-500">Church Community</p>
              </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-3 mb-2">Menu Principal</div>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'bg-red-50 text-red-700 font-medium'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                  {location.pathname === item.path && (
                    <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-red-600" />
                  )}
                </Link>
              ))}

              {isAdmin && (
                <>
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-3 mt-6 mb-2">Administração</div>
                  {adminItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        location.pathname.startsWith(item.path)
                          ? 'bg-stone-900 text-white font-medium'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </>
              )}
            </nav>

            <div className="p-4 border-t border-stone-100">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 mb-3">
                <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-700 font-bold">
                      {user?.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{user?.name}</p>
                  <p className="text-xs text-stone-500 truncate">Nível {user?.level}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut size={20} />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard user={user!} />} />
            <Route path="/teams" element={<Teams user={user!} />} />
            <Route path="/ranking" element={<IndividualRanking user={user!} />} />
            <Route path="/tasks" element={<Tasks user={user!} />} />
            <Route path="/attendance" element={<Attendance user={user!} />} />
            <Route path="/games/*" element={<Games user={user!} />} />
            <Route path="/profile" element={<Profile user={user!} onUpdateUser={handleUpdateUser} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            
            {/* Admin Routes */}
            {isAdmin && (
              <>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/tasks" element={<AdminTasks />} />
                <Route path="/admin/attendance" element={<AdminAttendance />} />
                <Route path="/admin/teams" element={<AdminTeams />} />
                <Route path="/admin/users" element={<AdminUsers />} />
              </>
            )}
          </Routes>
        </div>
      </main>
    </div>
  );
}
