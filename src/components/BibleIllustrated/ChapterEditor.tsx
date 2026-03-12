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
  AlertCircle,
  Hash,
  Upload,
  Settings
} from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { 
  getBooks, 
  getChapter, 
  createBibleChapter, 
  updateBibleChapter, 
  getChapterContent, 
  saveChapterBlocks,
  uploadBibleImage,
  getBibleVerses
} from '../../services/api';
import { GoogleGenAI } from "@google/genai";

type BlockType = 'text' | 'image' | 'verse';

type ContentBlock = {
  id: string;
  block_type: BlockType;
  verse_number?: number;
  content_text?: string;
  image_url?: string;
  verse_id?: number;
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
  const [uploading, setUploading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const booksData = await getBooks(true);
      setBooks(booksData);
      
      if (id) {
        const chapter = await getChapter(Number(id));
        setBookId(chapter.book_id);
        setChapterNumber(chapter.chapter_number);
        setTitle(chapter.title || '');
        
        // Load blocks
        const blocksData = await getChapterContent(Number(id));
        if (blocksData && blocksData.length > 0) {
          setBlocks(blocksData.map((b: any) => ({
            id: b.id.toString(),
            block_type: b.block_type,
            verse_number: b.bible_verses?.verse_number,
            content_text: b.block_type === 'verse' ? b.bible_verses?.verse_text : b.content_text,
            image_url: b.block_type === 'verse' ? b.bible_verses?.image_url : b.image_url,
            verse_id: b.verse_id
          })));
        } else {
          // Try to convert existing verses if no blocks exist
          const verses = await getBibleVerses(Number(id));
          if (verses && verses.length > 0) {
            setBlocks(verses.map((v: any) => ({
              id: `v-${v.id}`,
              block_type: 'verse',
              verse_number: v.verse_number,
              content_text: v.verse_text,
              image_url: v.image_url,
              verse_id: v.id
            })));
          }
        }
      } else if (booksData.length > 0) {
        setBookId(booksData[0].id);
      }
    } catch (err) {
      console.error("Error fetching data in ChapterEditor:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlock = { 
      id: Math.random().toString(36).substr(2, 9), 
      block_type: type,
      content_text: '',
      image_url: ''
    };
    if (type === 'verse') {
      const lastVerse = [...blocks].reverse().find(b => b.block_type === 'verse');
      newBlock.verse_number = lastVerse ? (lastVerse.verse_number || 0) + 1 : 1;
    }
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleFileUpload = async (blockId: string, file: File) => {
    setUploading(blockId);
    try {
      const url = await uploadBibleImage(file);
      updateBlock(blockId, { image_url: url });
    } catch (err) {
      alert('Erro ao fazer upload da imagem');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!bookId || !chapterNumber) return alert('Selecione o livro e o número do capítulo');
    setSaving(true);
    try {
      const chapterData = {
        book_id: bookId,
        chapter_number: chapterNumber,
        title
      };

      let chapterId = Number(id);
      if (id) {
        await updateBibleChapter(chapterId, chapterData);
      } else {
        const newChapter = await createBibleChapter(chapterData);
        chapterId = newChapter.id;
      }

      // Save blocks
      // Note: In a real app, we'd also need to ensure bible_verses are created/updated
      // For this implementation, we'll focus on the chapter_blocks table
      await saveChapterBlocks(chapterId, blocks);
      
      navigate('/admin/bible');
    } catch (err) {
      console.error(err);
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
        updateBlock(blockId, { image_url: imageUrl });
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
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Settings size={18} className="text-stone-400" />
              Configurações
            </h3>
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
              Adicione versículos e use o botão de IA para gerar imagens épicas. Você também pode arrastar os blocos para mudar a ordem.
            </p>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between bg-stone-100 p-2 rounded-2xl">
            <button 
              onClick={() => addBlock('verse')}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-stone-600 hover:bg-white hover:text-red-600 rounded-xl transition-all font-bold text-sm"
            >
              <Hash size={18} />
              Versículo
            </button>
            <button 
              onClick={() => addBlock('text')}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-stone-600 hover:bg-white hover:text-red-600 rounded-xl transition-all font-bold text-sm"
            >
              <Type size={18} />
              Texto
            </button>
            <button 
              onClick={() => addBlock('image')}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-stone-600 hover:bg-white hover:text-red-600 rounded-xl transition-all font-bold text-sm"
            >
              <ImageIcon size={18} />
              Imagem
            </button>
          </div>

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
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        {block.block_type === 'verse' && <Hash size={12} />}
                        {block.block_type === 'text' && <Type size={12} />}
                        {block.block_type === 'image' && <ImageIcon size={12} />}
                        {block.block_type === 'verse' ? `Versículo ${block.verse_number}` : block.block_type === 'text' ? 'Texto Adicional' : 'Imagem'}
                      </div>
                      <button 
                        onClick={() => removeBlock(block.id)}
                        className="p-1 text-stone-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {block.block_type === 'verse' && (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="w-16">
                            <label className="block text-[10px] font-bold text-stone-400 mb-1">Nº</label>
                            <input 
                              type="number"
                              value={block.verse_number}
                              onChange={(e) => updateBlock(block.id, { verse_number: Number(e.target.value) })}
                              className="w-full p-2 bg-stone-50 border border-stone-100 rounded-lg text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-stone-400 mb-1">Texto do Versículo</label>
                            <textarea
                              value={block.content_text}
                              onChange={(e) => updateBlock(block.id, { content_text: e.target.value })}
                              placeholder="Digite o texto do versículo..."
                              className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none min-h-[80px] text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-stone-400 mb-1">Imagem do Versículo (Opcional)</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={block.image_url}
                                onChange={(e) => updateBlock(block.id, { image_url: e.target.value })}
                                placeholder="URL da imagem..."
                                className="flex-1 p-2 bg-stone-50 border border-stone-100 rounded-lg text-xs"
                              />
                              <label className="p-2 bg-stone-100 text-stone-600 rounded-lg cursor-pointer hover:bg-stone-200 transition-colors">
                                <Upload size={16} />
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  onChange={(e) => e.target.files?.[0] && handleFileUpload(block.id, e.target.files[0])} 
                                />
                              </label>
                            </div>
                          </div>
                          <button
                            onClick={() => generateImage(block.id, block.content_text || '')}
                            disabled={generating === block.id}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors self-end"
                          >
                            {generating === block.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            Gerar com IA
                          </button>
                        </div>
                        
                        {block.image_url && (
                          <div className="relative aspect-video rounded-xl overflow-hidden border border-stone-100">
                            <img src={block.image_url} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => updateBlock(block.id, { image_url: '' })}
                              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {block.block_type === 'text' && (
                      <textarea
                        value={block.content_text}
                        onChange={(e) => updateBlock(block.id, { content_text: e.target.value })}
                        placeholder="Digite seu texto explicativo ou comentário..."
                        className="w-full p-4 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none min-h-[120px] text-stone-800"
                      />
                    )}

                    {block.block_type === 'image' && (
                      <div className="space-y-4">
                        <div className="aspect-video bg-stone-50 rounded-xl border-2 border-dashed border-stone-100 flex items-center justify-center overflow-hidden relative group/img">
                          {block.image_url ? (
                            <img src={block.image_url} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center space-y-2">
                              <ImageIcon size={32} className="text-stone-200 mx-auto" />
                              <p className="text-[10px] text-stone-400 font-bold uppercase">Nenhuma imagem selecionada</p>
                            </div>
                          )}
                          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                            <div className="flex flex-col items-center gap-2">
                              <Upload size={24} />
                              <span className="text-xs font-bold">Fazer Upload</span>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => e.target.files?.[0] && handleFileUpload(block.id, e.target.files[0])} 
                            />
                          </label>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-stone-400 uppercase">URL da Imagem</label>
                          <input
                            type="text"
                            value={block.image_url}
                            onChange={(e) => updateBlock(block.id, { image_url: e.target.value })}
                            placeholder="Ou cole a URL da imagem aqui..."
                            className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs text-stone-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-stone-400 uppercase">Legenda (Opcional)</label>
                          <input
                            type="text"
                            value={block.content_text}
                            onChange={(e) => updateBlock(block.id, { content_text: e.target.value })}
                            placeholder="Digite uma legenda para a imagem..."
                            className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs text-stone-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {blocks.length === 0 && (
            <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
              <Plus className="mx-auto mb-4 text-stone-300" size={48} />
              <p className="text-stone-500 font-medium">Nenhum bloco adicionado.</p>
              <p className="text-stone-400 text-sm">Use os botões acima para começar a montar seu capítulo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
