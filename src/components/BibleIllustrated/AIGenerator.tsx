import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ChevronLeft, Book } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBooks, getBookChapters, getChapterStructure, createFullChapter, uploadBase64Image } from '../../services/api';
import { generateChapterContent, generateImage } from '../../services/aiService';

export default function AIGenerator() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | ''>('');
  const [modelChapters, setModelChapters] = useState<any[]>([]);
  const [modelChapterId, setModelChapterId] = useState<number | ''>('');
  const [startChapter, setStartChapter] = useState<number>(1);
  const [endChapter, setEndChapter] = useState<number>(1);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (selectedBookId) {
      getBookChapters(Number(selectedBookId)).then(setModelChapters).catch(console.error);
    } else {
      setModelChapters([]);
    }
  }, [selectedBookId]);

  const addLog = (message: string) => {
    setLogs(prev => [message, ...prev].slice(0, 50));
  };

  const handleGenerate = async () => {
    if (!selectedBookId || !modelChapterId || startChapter > endChapter) {
      setError("Por favor, preencha todos os campos corretamente.");
      return;
    }

    const book = books.find(b => b.id === Number(selectedBookId));
    setIsGenerating(true);
    setError(null);
    setLogs([]);
    
    const totalChapters = endChapter - startChapter + 1;
    setProgress({ current: 0, total: totalChapters, status: 'Iniciando...' });

    try {
      addLog(`🧐 Analisando estrutura do capítulo modelo ${modelChapterId}...`);
      const structure = await getChapterStructure(Number(modelChapterId));
      addLog(`✅ Estrutura detectada: ${structure.join(' -> ')}`);

      for (let ch = startChapter; ch <= endChapter; ch++) {
        setProgress(prev => ({ ...prev, current: ch - startChapter + 1, status: `Gerando Capítulo ${ch}...` }));
        addLog(`✨ Gerando conteúdo para Capítulo ${ch}...`);
        
        const content = await generateChapterContent(book.name, ch, structure);
        addLog(`📝 Conteúdo gerado: "${content.title}"`);

        const processedBlocks = [];
        for (let i = 0; i < content.blocks.length; i++) {
          const block = content.blocks[i];
          if (block.type === 'image' && block.prompt) {
            addLog(`🎨 Gerando imagem para bloco ${i + 1}...`);
            const base64 = await generateImage(block.prompt);
            const path = `chapters/${book.name}/${ch}/image_${i + 1}_${Date.now()}.png`;
            const imageUrl = await uploadBase64Image(base64, path);
            processedBlocks.push({ ...block, image_url: imageUrl });
            addLog(`✅ Imagem ${i + 1} salva.`);
          } else {
            processedBlocks.push(block);
          }
        }

        addLog(`💾 Salvando Capítulo ${ch} no banco de dados...`);
        await createFullChapter(Number(selectedBookId), ch, content.title, processedBlocks);
        addLog(`🎉 Capítulo ${ch} concluído com sucesso!`);
      }

      setProgress(prev => ({ ...prev, status: 'Todas as gerações concluídas!' }));
      addLog("🚀 Processo finalizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || JSON.stringify(err);
      if (errorMessage.includes("API key not valid") || errorMessage.includes("400")) {
        setNeedsKey(true);
      }
      setError(`Erro durante a geração: ${errorMessage}`);
      addLog(`❌ ERRO: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/bible')}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Sparkles className="text-red-600" />
            Gerador de Capítulos IA
          </h2>
          <p className="text-stone-500">Gere capítulos bíblicos ilustrados automaticamente seguindo um modelo.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Livro</label>
              <select 
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                disabled={isGenerating}
              >
                <option value="">Selecione um livro</option>
                {books.map(book => (
                  <option key={book.id} value={book.id}>{book.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Capítulo Modelo (Layout)</label>
              <select 
                value={modelChapterId}
                onChange={(e) => setModelChapterId(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                disabled={isGenerating || !selectedBookId}
              >
                <option value="">Selecione o capítulo modelo</option>
                {modelChapters.map(ch => (
                  <option key={ch.id} value={ch.id}>Capítulo {ch.chapter_number}: {ch.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Capítulo Inicial</label>
                <input 
                  type="number"
                  value={startChapter}
                  onChange={(e) => setStartChapter(Number(e.target.value))}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  disabled={isGenerating}
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Capítulo Final</label>
                <input 
                  type="number"
                  value={endChapter}
                  onChange={(e) => setEndChapter(Number(e.target.value))}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  disabled={isGenerating}
                  min={startChapter}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedBookId || !modelChapterId}
            className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Gerar Capítulos com IA
              </>
            )}
          </button>
        </div>

        <div className="bg-stone-900 rounded-3xl p-8 text-white flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <Book size={18} className="text-red-500" />
              Console de Geração
            </h3>
            {isGenerating && (
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
            {logs.length === 0 && !isGenerating && (
              <p className="text-stone-600 italic">Aguardando início do processo...</p>
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
  );
}
