import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Type, 
  Sparkles, 
  Loader2, 
  ChevronLeft,
  GripVertical,
  AlertCircle
} from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { getBibleBooks, getChapter, createBibleChapter, updateBibleChapter } from '../../services/api';
import { GoogleGenAI } from "@google/genai";

type ContentBlock = {
  id: string;
  type: 'text' | 'image';
  value: string;
};

export default function ChapterEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [bookId, setBookId] = useState<number>(0);
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const booksData = await getBibleBooks(false);
        setBooks(booksData);
        
        if (id) {
          const chapter = await getChapter(Number(id));
          setBookId(chapter.book_id);
          setChapterNumber(chapter.chapter_number);
          setTitle(chapter.title || '');
          setBlocks(chapter.content.map((b: any, i: number) => ({ ...b, id: `block-${i}` })));
        } else if (booksData.length > 0) {
          setBookId(booksData[0].id);
        }
      } catch (err) {
        console.error("Error fetching data in ChapterEditor:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const addBlock = (type: 'text' | 'image') => {
    setBlocks([...blocks, { id: Math.random().toString(36).substr(2, 9), type, value: '' }]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const updateBlock = (id: string, value: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, value } : b));
  };

  const handleSave = async () => {
    if (!bookId || !chapterNumber) return alert('Selecione o livro e o número do capítulo');
    setSaving(true);
    try {
      const data = {
        book_id: bookId,
        chapter_number: chapterNumber,
        title,
        content: blocks.map(({ type, value }) => ({ type, value }))
      };

      if (id) {
        await updateBibleChapter(Number(id), data);
      } else {
        await createBibleChapter(data);
      }
      navigate('/admin/bible');
    } catch (err) {
      alert('Erro ao salvar capítulo');
    } finally {
      setSaving(false);
    }
  };

  const generateImage = async (blockId: string, text: string) => {
    if (!text) return alert('Digite um texto para gerar a imagem');
    setGenerating(blockId);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Uma ilustração épica e bíblica no estilo CARTOON, colorida, vibrante, baseada no seguinte texto: "${text}". Estilo cinematográfico, iluminação dramática, alta resolução, sem texto.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K"
          }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        const imageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
        // Find if there's an image block right after this text block, or create one
        const currentIndex = blocks.findIndex(b => b.id === blockId);
        const nextBlock = blocks[currentIndex + 1];
        
        if (nextBlock && nextBlock.type === 'image') {
          updateBlock(nextBlock.id, imageUrl);
        } else {
          const newImageBlock = { id: Math.random().toString(36).substr(2, 9), type: 'image' as const, value: imageUrl };
          const newBlocks = [...blocks];
          newBlocks.splice(currentIndex + 1, 0, newImageBlock);
          setBlocks(newBlocks);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar imagem. Verifique sua chave de API.');
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-600" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/bible')} className="p-2 hover:bg-stone-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">{id ? 'Editar Capítulo' : 'Novo Capítulo'}</h2>
            <p className="text-stone-500">Organize o fluxo de leitura e gere ilustrações.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Salvar Capítulo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900">Configurações</h3>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Livro</label>
              <select 
                value={bookId}
                onChange={(e) => setBookId(Number(e.target.value))}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500/20"
              >
                {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Número do Capítulo</label>
              <input 
                type="number"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(Number(e.target.value))}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Título do Capítulo (Opcional)</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: A Criação do Mundo"
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-bold">
              <Sparkles size={18} />
              Dica da IA
            </div>
            <p className="text-sm text-amber-800/80 leading-relaxed">
              Escreva o texto do versículo e clique em "Gerar Imagem" para criar uma ilustração no estilo cartoon automaticamente.
            </p>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-4">
            {blocks.map((block) => (
              <Reorder.Item 
                key={block.id} 
                value={block}
                className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden group"
              >
                <div className="flex items-start gap-4 p-4">
                  <div className="mt-3 cursor-grab active:cursor-grabbing text-stone-300">
                    <GripVertical size={20} />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        {block.type === 'text' ? <Type size={12} /> : <ImageIcon size={12} />}
                        {block.type === 'text' ? 'Texto / Versículo' : 'Imagem Ilustrativa'}
                      </div>
                      <button 
                        onClick={() => removeBlock(block.id)}
                        className="p-1 text-stone-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {block.type === 'text' ? (
                      <div className="space-y-3">
                        <textarea
                          value={block.value}
                          onChange={(e) => updateBlock(block.id, e.target.value)}
                          placeholder="Digite o texto do versículo aqui..."
                          className="w-full p-4 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none min-h-[100px] text-stone-800"
                        />
                        <button
                          onClick={() => generateImage(block.id, block.value)}
                          disabled={generating === block.id}
                          className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                        >
                          {generating === block.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          Gerar Imagem com IA
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="aspect-video bg-stone-50 rounded-xl border-2 border-dashed border-stone-100 flex items-center justify-center overflow-hidden relative group/img">
                          {block.value ? (
                            <img src={block.value} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={32} className="text-stone-200" />
                          )}
                          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                            <span className="text-xs font-bold">Alterar URL</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={block.value}
                          onChange={(e) => updateBlock(block.id, e.target.value)}
                          placeholder="URL da imagem ou Base64..."
                          className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs text-stone-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="flex items-center justify-center gap-4 py-8 border-2 border-dashed border-stone-100 rounded-3xl">
            <button 
              onClick={() => addBlock('text')}
              className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-full text-sm font-bold hover:bg-stone-200 transition-all"
            >
              <Plus size={16} />
              Adicionar Texto
            </button>
            <button 
              onClick={() => addBlock('image')}
              className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-full text-sm font-bold hover:bg-stone-200 transition-all"
            >
              <Plus size={16} />
              Adicionar Imagem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
