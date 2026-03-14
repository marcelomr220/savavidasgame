import React, { useState, useEffect } from 'react';
import { TreeDeciduous, Droplets, Star, Flame, Sparkles, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, UserTree } from '../../types';
import { getUserTrees, plantTree, waterTree, getTreeTypes } from '../../services/api';

export default function KingdomTree({ user, onUpdateUser }: { user: User, onUpdateUser?: () => void }) {
  const [tree, setTree] = useState<UserTree | null>(null);
  const [treeTypes, setTreeTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState(false);
  const [planting, setPlanting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const types = await getTreeTypes(); // Ensure types exist and get them
        setTreeTypes(types);
        await fetchTree();
      } catch (err) {
        console.error("Error initializing Kingdom Tree:", err);
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchTree = async () => {
    try {
      const data = await getUserTrees(user.id);
      setTree(data[0] || null);
    } catch (err) {
      console.error("Error fetching tree:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlant = async (treeTypeId: number) => {
    if (planting) return;
    setPlanting(true);
    try {
      await plantTree(user.id, treeTypeId);
      await fetchTree();
    } catch (err) {
      console.error("Error planting tree:", err);
      alert("Erro ao plantar semente. Verifique se as tabelas do Supabase estão configuradas.");
    } finally {
      setPlanting(false);
    }
  };

  const handleWater = async () => {
    if (!tree || watering) return;
    setWatering(true);
    
    try {
      const data = await waterTree(tree.id, user.id);
      
      if (data && data.pointsEarned > 0) {
        setFeedback(`Evoluiu! +${data.pointsEarned} pts`);
        if (onUpdateUser) onUpdateUser();
      }
      setTimeout(() => {
        fetchTree();
        setWatering(false);
        setTimeout(() => setFeedback(null), 2000);
      }, 1000);
    } catch (err) {
      console.error("Error watering tree:", err);
      setWatering(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  if (!tree) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <TreeDeciduous size={40} />
          </div>
          <h3 className="text-2xl font-bold text-stone-900">Comece seu Jardim</h3>
          <p className="text-stone-500">Escolha uma semente para plantar e cultivar com Água Viva.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {treeTypes.map((type) => (
            <SeedCard 
              key={type.id}
              name={type.name} 
              rarity={type.rarity} 
              points={`${type.points_per_stage} pts/estágio`} 
              onPlant={() => handlePlant(type.id)}
              disabled={planting}
            />
          ))}
          {treeTypes.length === 0 && (
            <div className="col-span-full text-center p-8 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
              <p className="text-stone-500">Nenhuma semente disponível no momento.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const progress = ((tree.water_count || 0) % 5) * 20;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Tree Display Area */}
      <div className="bg-white rounded-[40px] border border-stone-200 shadow-sm overflow-hidden relative min-h-[400px] flex flex-col items-center justify-center p-8">
        <div className="absolute top-6 right-6 flex flex-col gap-2">
          <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100 flex items-center gap-2">
            <Star className="text-red-600" size={18} fill="currentColor" />
            <span className="font-bold text-red-700">{tree.points_per_stage} pts/nível</span>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-2">
            <Droplets className="text-blue-600" size={18} fill="currentColor" />
            <span className="font-bold text-blue-700">{tree.water_count} regadas</span>
          </div>
        </div>

        <div className="relative mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={tree.stage}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10"
            >
              <TreeVisual stage={tree.stage} />
            </motion.div>
          </AnimatePresence>
          
          {/* Ground */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-stone-100 rounded-[100%] blur-md -z-10" />
          
          {/* Feedback Animation */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -100, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg whitespace-nowrap z-20"
              >
                <Sparkles className="inline-block mr-2" size={16} />
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-stone-900">{tree.name}</h3>
          <p className="text-stone-500 font-medium">Estágio {tree.stage} de {tree.max_stages}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-stone-700">Progresso para o próximo estágio</span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="h-4 bg-stone-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
          />
        </div>

        <button
          onClick={handleWater}
          disabled={watering}
          className={`w-full py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
            watering 
              ? 'bg-blue-100 text-blue-400' 
              : 'bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-blue-700'
          }`}
        >
          <Droplets className={watering ? 'animate-bounce' : ''} size={28} fill="currentColor" />
          {watering ? 'Regando...' : 'Regar com Água Viva'}
        </button>

        <div className="flex items-center gap-2 p-4 bg-stone-50 rounded-2xl text-xs text-stone-500">
          <Info size={16} />
          <p>Cada 5 regadas sua árvore evolui para o próximo estágio e você ganha pontos!</p>
        </div>
      </div>
    </div>
  );
}

function SeedCard({ name, rarity, points, onPlant, disabled }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:border-red-200 transition-all group">
      <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <div className="w-4 h-4 bg-red-600 rounded-full blur-[2px]" />
      </div>
      <h4 className="text-lg font-bold text-stone-900 mb-1">{name}</h4>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
          rarity === 'Rara' ? 'bg-purple-50 text-purple-600' : 'bg-stone-100 text-stone-500'
        }`}>
          {rarity}
        </span>
        <span className="text-[10px] font-bold text-red-600 uppercase">{points}</span>
      </div>
      <button 
        onClick={onPlant}
        disabled={disabled}
        className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {disabled ? <Loader2 className="animate-spin" size={18} /> : 'Plantar Semente'}
      </button>
    </div>
  );
}

function TreeVisual({ stage }: { stage: number }) {
  // Simple visual representation of tree growth
  const sizes = [
    'w-8 h-8',   // Seedling
    'w-12 h-16', // Sprout
    'w-20 h-24', // Small tree
    'w-32 h-40', // Medium tree
    'w-40 h-56', // Large tree
    'w-48 h-64', // Mature tree
  ];

  return (
    <div className={`relative flex flex-col items-center justify-end ${sizes[stage - 1]}`}>
      {/* Trunk */}
      <div className={`bg-stone-700 rounded-full transition-all duration-500 ${
        stage === 1 ? 'w-2 h-4' :
        stage === 2 ? 'w-3 h-8' :
        stage === 3 ? 'w-6 h-12' :
        stage === 4 ? 'w-10 h-20' :
        stage === 5 ? 'w-14 h-28' :
        'w-18 h-32'
      }`} />
      
      {/* Leaves */}
      <div className={`absolute bottom-[30%] bg-red-500 rounded-full transition-all duration-700 shadow-lg ${
        stage === 1 ? 'w-6 h-6' :
        stage === 2 ? 'w-10 h-10' :
        stage === 3 ? 'w-24 h-20' :
        stage === 4 ? 'w-40 h-32' :
        stage === 5 ? 'w-56 h-48' :
        'w-64 h-56'
      }`} />

      {/* Fruits (only for mature stages) */}
      {stage >= 5 && (
        <>
          <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-red-500 rounded-full shadow-sm animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-red-500 rounded-full shadow-sm animate-pulse" />
          <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-red-500 rounded-full shadow-sm animate-pulse" />
        </>
      )}
    </div>
  );
}
