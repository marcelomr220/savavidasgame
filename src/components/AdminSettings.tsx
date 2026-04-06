import React, { useState, useEffect } from 'react';
import { Settings, Image, Save, Loader2, AlertCircle, CheckCircle2, Flame, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAppSettings, updateAppSettings } from '../services/api';

export default function AdminSettings() {
  const [logoUrl, setLogoUrl] = useState('');
  const [splashUrl, setSplashUrl] = useState('');
  const [gameEnabled, setGameEnabled] = useState(false);
  const [gameLeadersOnly, setGameLeadersOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const logo = await getAppSettings('login_logo');
        if (logo) setLogoUrl(logo);
        
        const splash = await getAppSettings('splash_logo');
        if (splash) setSplashUrl(splash);

        const game = await getAppSettings('social_deduction_game_enabled');
        setGameEnabled(game === 'true');

        const leadersOnly = await getAppSettings('social_deduction_game_leaders_only');
        setGameLeadersOnly(leadersOnly === 'true');
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await updateAppSettings('login_logo', logoUrl);
      await updateAppSettings('splash_logo', splashUrl);
      await updateAppSettings('social_deduction_game_enabled', gameEnabled.toString());
      await updateAppSettings('social_deduction_game_leaders_only', gameLeadersOnly.toString());
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'splash') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'logo') setLogoUrl(reader.result as string);
      else setSplashUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-600" /></div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-stone-900">Configurações do App</h2>
        <p className="text-stone-500">Personalize a aparência do seu aplicativo.</p>
      </header>

      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
          {/* Logo Section */}
          <section className="space-y-6">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Image size={20} className="text-red-600" />
              Logo do Login
            </h3>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-32 h-32 rounded-2xl bg-stone-50 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden relative group">
                {logoUrl ? (
                  <img src={logoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Image size={32} className="text-stone-300" />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                  <span className="text-xs font-bold text-center px-2">Alterar Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')} />
                </label>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">URL da Logo</label>
                  <input 
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <p className="text-xs text-stone-400">Esta logo será exibida na tela de Login.</p>
              </div>
            </div>
          </section>

          <hr className="border-stone-100" />

          {/* Splash Screen Section */}
          <section className="space-y-6">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Flame size={20} className="text-orange-500" />
              Splash Screen (Abertura)
            </h3>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-32 h-32 rounded-2xl bg-stone-50 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden relative group">
                {splashUrl ? (
                  <img src={splashUrl} alt="Preview Splash" className="w-full h-full object-cover" />
                ) : (
                  <Image size={32} className="text-stone-300" />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                  <span className="text-xs font-bold text-center px-2">Alterar Splash</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'splash')} />
                </label>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">URL da Animação (GIF ou Imagem)</label>
                  <input 
                    type="text"
                    value={splashUrl}
                    onChange={(e) => setSplashUrl(e.target.value)}
                    placeholder="https://exemplo.com/splash.gif"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <p className="text-xs text-stone-400">Esta imagem ou GIF será exibido quando o app for aberto.</p>
                <p className="text-xs text-stone-400 font-medium text-orange-600">Dica: Use um GIF animado para uma abertura mais dinâmica!</p>
              </div>
            </div>
          </section>

          <hr className="border-stone-100" />

          {/* Games Section */}
          <section className="space-y-6">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Gamepad2 size={20} className="text-red-600" />
              Configurações de Games
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div>
                <p className="font-bold text-stone-900">Infiltrados no Reino (Among Us)</p>
                <p className="text-xs text-stone-500">Habilitar ou desabilitar o jogo de dedução social.</p>
              </div>
              <button
                type="button"
                onClick={() => setGameEnabled(!gameEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${gameEnabled ? 'bg-red-600' : 'bg-stone-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gameEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div>
                <p className="font-bold text-stone-900">Apenas Líderes de Equipe</p>
                <p className="text-xs text-stone-500">Restringir o jogo Infiltrados no Reino apenas para líderes.</p>
              </div>
              <button
                type="button"
                onClick={() => setGameLeadersOnly(!gameLeadersOnly)}
                className={`w-12 h-6 rounded-full transition-colors relative ${gameLeadersOnly ? 'bg-red-600' : 'bg-stone-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gameLeadersOnly ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </section>

          {message && (
            <div className={`flex items-center gap-2 p-4 rounded-2xl text-sm font-medium ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Salvar Configurações
          </button>
        </form>
      </div>
    </div>
  );
}
