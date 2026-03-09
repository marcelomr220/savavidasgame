import React, { useState, useEffect } from 'react';
import { Star, Mail, Lock, ArrowRight, AlertCircle, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../types';
import { login, register, getAppSettings } from '../services/api';

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogo = async () => {
      const logoUrl = await getAppSettings('login_logo');
      if (logoUrl) setLogo(logoUrl);
    };
    fetchLogo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let userData;
      if (isLogin) {
        userData = await login(email, password);
      } else {
        userData = await register(name, email, password);
      }
      onLogin(userData);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          {logo ? (
            <div className="w-24 h-24 mx-auto mb-4 overflow-hidden rounded-2xl shadow-xl border-4 border-white">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-200 mx-auto mb-4">
              <Star size={32} fill="currentColor" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-stone-900">Salva Vidas</h1>
          <p className="text-stone-500">Comunidade Gamificada</p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl">
          <div className="flex gap-4 mb-8 p-1 bg-stone-100 rounded-2xl">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${isLogin ? 'bg-white text-red-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${!isLogin ? 'bg-white text-red-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-sm font-bold text-stone-700 mb-2">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    placeholder="Seu nome"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 group"
            >
              {loading ? (isLogin ? 'Entrando...' : 'Cadastrando...') : (
                <>
                  {isLogin ? 'Entrar no Reino' : 'Criar minha conta'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-100 text-center">
            {isLogin ? (
              <p className="text-sm text-stone-500">Ainda não tem conta? <span onClick={() => setIsLogin(false)} className="text-red-600 font-bold cursor-pointer">Cadastre-se agora</span></p>
            ) : (
              <p className="text-sm text-stone-500">Já tem uma conta? <span onClick={() => setIsLogin(true)} className="text-red-600 font-bold cursor-pointer">Faça login</span></p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
