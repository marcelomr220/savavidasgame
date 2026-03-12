import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  Book, 
  Image as ImageIcon, 
  Upload,
  Eye,
  Layout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBooks, createFullChapter, uploadBase64Image } from '../../services/api';
import { analyzeVisualTemplate, generateChapterContent, generateImage } from '../../services/aiService';

export default function VisualTemplateGenerator() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | ''>('');
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedStructure, setDetectedStructure] = useState<string[] | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);

  useEffect(() => {
    getBooks().then(setBooks).catch(console.error);
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setNeedsKey(!hasKey);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setNeedsKey(false);
    }
  };

  const addLog = (message: string) => {
    setLogs(prev => [message, ...prev].slice(0, 50));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshot(reader.result as string);
      setDetectedStructure(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!screenshot) return;
    
    setIsAnalyzing(true);
    setError(null);
    addLog("🔍 Analisando screenshot para detectar estrutura visual...");
    
    try {
      const base64 = screenshot.split(',')[1];
      const structure = await analyzeVisualTemplate(base64);
      setDetectedStructure(structure);
      addLog(`✅ Estrutura detectada: ${structure.join(' -> ')}`);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || JSON.stringify(err);
      if (errorMessage.includes("API key not valid") || errorMessage.includes("400")) {
        setNeedsKey(true);
      }
      setError(`Erro na análise: ${errorMessage}`);
      addLog(`❌ ERRO na análise: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedBookId || !chapterNumber || !detectedStructure) {
      setError("Por favor, selecione o livro, capítulo e analise o template primeiro.");
      return;
    }

    const book = books.find(b => b.id === Number(selectedBookId));
    setIsGenerating(true);
    setError(null);
    setSuccess(false);
    
    setProgress({ current: 0, total: 1, status: 'Iniciando geração...' });

    try {
      addLog(`✨ Gerando conteúdo para ${book.name} Capítulo ${chapterNumber}...`);
      
      const content = await generateChapterContent(book.name, chapterNumber, detectedStructure);
      addLog(`📝 Conteúdo gerado: "${content.title}"`);

      const processedBlocks = [];
      setProgress(prev => ({ ...prev, total: content.blocks.length, status: 'Processando blocos...' }));

      for (let i = 0; i < content.blocks.length; i++) {
        const block = content.blocks[i];
        setProgress(prev => ({ ...prev, current: i + 1, status: `Processando bloco ${i + 1} de ${content.blocks.length}...` }));

        if (block.type === 'image' && block.prompt) {
          addLog(`🎨 Gerando imagem para bloco ${i + 1}...`);
          const base64 = await generateImage(block.prompt);
          const path = `chapters/${book.name}/${chapterNumber}/image_${i + 1}_${Date.now()}.png`;
          const imageUrl = await uploadBase64Image(base64, path);
          processedBlocks.push({ ...block, image_url: imageUrl });
          addLog(`✅ Imagem ${i + 1} salva.`);
        } else {
          processedBlocks.push(block);
        }
      }

      addLog(`💾 Salvando capítulo no banco de dados...`);
      await createFullChapter(Number(selectedBookId), chapterNumber, content.title, processedBlocks);
      
      addLog(`🎉 Capítulo ${chapterNumber} de ${book.name} gerado com sucesso!`);
      setSuccess(true);
      setProgress(prev => ({ ...prev, status: 'Concluído!' }));
    } catch (err: any) {
      console.error(err);
      setError(`Erro durante a geração: ${err.message}`);
      addLog(`❌ ERRO na geração: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/bible')}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Layout className="text-blue-600" />
            Gerador por Template Visual
          </h2>
          <p className="text-stone-500">Envie um screenshot de um layout e a IA gerará novos capítulos seguindo o mesmo estilo.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Config & Upload */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
            {needsKey && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-3 text-amber-700 text-sm font-medium">
                  <AlertCircle size={18} />
                  Chave de API não configurada ou inválida.
                </div>
                <button
                  onClick={handleSelectKey}
                  className="text-xs bg-amber-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-700 transition-all w-fit"
                >
                  Configurar Chave de API
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Livro Destino</label>
                <select 
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isGenerating || isAnalyzing}
                >
                  <option value="">Selecione um livro</option>
                  {books.map(book => (
                    <option key={book.id} value={book.id}>{book.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Capítulo Destino</label>
                <input 
                  type="number"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(Number(e.target.value))}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isGenerating || isAnalyzing}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-stone-700">Screenshot do Template</label>
              <div className="relative aspect-video bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 overflow-hidden group">
                {screenshot ? (
                  <>
                    <img src={screenshot} alt="Template" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white text-stone-900 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                        <Upload size={18} />
                        Trocar Imagem
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center gap-3 text-stone-400 hover:text-stone-600 transition-colors">
                    <Upload size={48} />
                    <span className="font-bold">Clique para enviar screenshot</span>
                    <span className="text-xs">PNG, JPG ou WEBP</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {!detectedStructure && screenshot && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Analisando Layout...
                  </>
                ) : (
                  <>
                    <Eye size={20} />
                    Analisar Screenshot
                  </>
                )}
              </button>
            )}

            {detectedStructure && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Layout size={16} />
                    Estrutura Detectada
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detectedStructure.map((type, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs font-bold text-blue-700 uppercase">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedBookId}
                  className="w-full py-4 bg-stone-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Gerando Capítulo...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="text-red-500" />
                      Gerar Capítulo com este Template
                    </>
                  )}
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-600 text-sm">
                <CheckCircle2 size={18} />
                Capítulo gerado com sucesso!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Console & Progress */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-stone-900 rounded-3xl p-8 text-white flex flex-col h-[600px] shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <Book size={18} className="text-red-500" />
                Console de Geração
              </h3>
              {(isGenerating || isAnalyzing) && (
                <span className="text-xs font-mono text-red-400 animate-pulse">PROCESSANDO</span>
              )}
            </div>

            {isGenerating && (
              <div className="mb-6 space-y-2">
                <div className="flex justify-between text-xs font-mono text-stone-400">
                  <span>Progresso</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-red-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm font-bold text-red-400">{progress.status}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 scrollbar-hide">
              {logs.length === 0 && (
                <p className="text-stone-600 italic">Aguardando screenshot para análise...</p>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${log.startsWith('✅') || log.startsWith('🎉') ? 'text-green-400' : log.startsWith('❌') ? 'text-red-400' : 'text-stone-300'}`}>
                  <span className="text-stone-600">[{new Date().toLocaleTimeString()}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
