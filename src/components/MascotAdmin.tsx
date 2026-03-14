import React, { useState, useEffect } from 'react';
import { Upload, Flame, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { uploadMascotGif, getMascotLevel } from '../services/api';

export default function MascotAdmin() {
  const [level, setLevel] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [currentGif, setCurrentGif] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchCurrentGif();
  }, [level]);

  const fetchCurrentGif = async () => {
    setFetching(true);
    try {
      const data = await getMascotLevel(level);
      setCurrentGif(data.gif_url);
    } catch (err) {
      console.error("Error fetching mascot level:", err);
    } finally {
      setFetching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'image/gif') {
        setMessage({ type: 'error', text: 'Apenas arquivos GIF são permitidos' });
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'O arquivo deve ter no máximo 5MB' });
        return;
      }
      setFile(selectedFile);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Selecione um arquivo GIF' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await uploadMascotGif(level, file);
      setCurrentGif(result.gif_url);
      setFile(null);
      setMessage({ type: 'success', text: `GIF do nível ${level} atualizado com sucesso!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
          <Flame size={24} fill="currentColor" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Gerenciar Mascote</h2>
          <p className="text-stone-500">Upload de GIFs para os níveis de evolução (1 a 50).</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Form */}
        <section className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-wider">Nível do Mascote</label>
            <input 
              type="number" 
              min="1" 
              max="50"
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-wider">Arquivo GIF (Max 5MB)</label>
            <div className="relative group">
              <input 
                type="file" 
                accept="image/gif"
                onChange={handleFileChange}
                className="hidden"
                id="mascot-upload"
              />
              <label 
                htmlFor="mascot-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-stone-200 rounded-[32px] cursor-pointer hover:border-red-500 hover:bg-red-50/30 transition-all group-hover:border-red-500"
              >
                {file ? (
                  <div className="text-center p-4">
                    <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
                    <p className="font-bold text-stone-900 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-stone-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Upload size={40} className="text-stone-300 mx-auto mb-2 group-hover:text-red-500 transition-colors" />
                    <p className="font-bold text-stone-900">Clique para selecionar</p>
                    <p className="text-xs text-stone-500">Apenas arquivos .gif</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl flex items-center gap-3 ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="text-sm font-medium">{message.text}</p>
            </motion.div>
          )}

          <button 
            onClick={handleUpload}
            disabled={loading || !file}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            {loading ? 'Enviando...' : 'Fazer Upload'}
          </button>
        </section>

        {/* Preview Section */}
        <section className="bg-stone-900 p-8 rounded-[32px] relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Flame size={160} className="text-red-500" fill="currentColor" />
          </div>

          <div className="relative z-10 text-center space-y-6 w-full">
            <div className="inline-block px-4 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-widest mb-4">
              Preview Nível {level}
            </div>

            <div className="w-48 h-48 mx-auto bg-white/5 rounded-[40px] flex items-center justify-center relative group overflow-hidden border border-white/10 backdrop-blur-sm">
              {fetching ? (
                <Loader2 size={40} className="text-white/20 animate-spin" />
              ) : currentGif ? (
                <img 
                  src={currentGif} 
                  alt={`Mascote Nível ${level}`} 
                  className="w-40 h-40 object-contain drop-shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-6">
                  <Flame size={48} className="text-white/10 mx-auto mb-2" fill="currentColor" />
                  <p className="text-white/30 text-xs font-medium">Nenhum GIF para este nível</p>
                </div>
              )}
            </div>

            {currentGif && (
              <p className="text-white/40 text-[10px] font-mono break-all px-4">
                {currentGif}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
