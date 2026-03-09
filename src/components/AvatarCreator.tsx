import React, { useState, useEffect } from 'react';
import { X, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AvatarOptions {
  top: string;
  accessories: string;
  hairColor: string;
  facialHair: string;
  facialHairColor: string;
  clothes: string;
  clothesColor: string;
  eyes: string;
  eyebrow: string;
  mouth: string;
  skinColor: string;
}

const OPTIONS = {
  skinColor: ['614335', 'ae5d29', 'd08b5b', 'edb98a', 'f8d25c', 'fd9841', 'ffdbb4'],
  top: [
    'longHair', 'shortHair', 'eyepatch', 'hat', 'hijab', 'turban', 'bob', 'curly', 
    'curvy', 'dreads', 'frida', 'fro', 'froBand', 'miaWallace', 'shavedSides', 
    'straight01', 'straight02', 'winterHat01', 'winterHat02', 'winterHat03', 
    'winterHat04', 'theCaesar', 'theCaesarAndSidePart', 'bigHair', 'hillageRockabilly', 
    'noHair', 'shaggy', 'shaggyMullet', 'shortCurly', 'shortFlatTop', 'shortRound', 
    'shortSidePart', 'sides'
  ],
  hairColor: ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'c93305', 'd6b370', 'e8e1e1', 'f59797', 'ecdcbf'],
  eyes: ['close', 'cry', 'default', 'dizzy', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky'],
  eyebrow: ['angry', 'angryNatural', 'default', 'defaultNatural', 'flatNatural', 'raisedExcited', 'raisedExcitedNatural', 'sadConcerned', 'sadConcernedNatural', 'unibrowNatural', 'upDown', 'upDownNatural'],
  mouth: ['concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad', 'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit'],
  clothes: ['blazerAndShirt', 'blazerAndTie', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'],
  clothesColor: ['262e33', '65c9ff', '5199e4', '25557c', 'e6e6e6', '929598', '3c4444', 'ff5c5c', 'ff4850', '212121', 'ffffff', 'ffff94', 'f4d150'],
  accessories: ['none', 'blank', 'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'],
  facialHair: ['none', 'blank', 'beardMedium', 'beardLight', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'],
  facialHairColor: ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'c93305', 'd6b370', 'e8e1e1', 'f59797', 'ecdcbf']
};

export default function AvatarCreator({ onSave, onCancel, initialAvatar }: { onSave: (url: string) => void, onCancel: () => void, initialAvatar?: string }) {
  const [options, setOptions] = useState<AvatarOptions>({
    top: 'shortHair',
    accessories: 'none',
    hairColor: '2c1b18',
    facialHair: 'none',
    facialHairColor: '2c1b18',
    clothes: 'shirtCrewNeck',
    clothesColor: '212121',
    eyes: 'default',
    eyebrow: 'default',
    mouth: 'smile',
    skinColor: 'edb98a'
  });

  const [activeTab, setActiveTab] = useState<keyof typeof OPTIONS>('skinColor');

  useEffect(() => {
    if (initialAvatar && initialAvatar.includes('dicebear.com')) {
      try {
        const url = new URL(initialAvatar);
        const params = new URLSearchParams(url.search);
        const newOptions = { ...options };
        Object.keys(OPTIONS).forEach(key => {
          const val = params.get(key);
          if (val) (newOptions as any)[key] = val as string;
        });
        setOptions(newOptions);
      } catch (e) {
        console.error("Error parsing initial avatar", e);
      }
    }
  }, [initialAvatar]);

  const generateUrl = () => {
    const baseUrl = 'https://api.dicebear.com/7.x/avataaars/svg';
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== 'none') params.append(key, value as string);
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const randomize = () => {
    const newOptions = { ...options };
    Object.entries(OPTIONS).forEach(([key, values]) => {
      (newOptions as any)[key] = values[Math.floor(Math.random() * values.length)];
    });
    setOptions(newOptions);
  };

  const tabs = [
    { id: 'skinColor', label: 'Pele' },
    { id: 'top', label: 'Cabelo' },
    { id: 'hairColor', label: 'Cor Cabelo' },
    { id: 'eyes', label: 'Olhos' },
    { id: 'eyebrow', label: 'Sobrancelha' },
    { id: 'mouth', label: 'Boca' },
    { id: 'clothes', label: 'Roupa' },
    { id: 'clothesColor', label: 'Cor Roupa' },
    { id: 'accessories', label: 'Acessórios' },
    { id: 'facialHair', label: 'Barba' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[600px]"
      >
        {/* Preview Section */}
        <div className="md:w-1/3 bg-stone-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-stone-100">
          <div className="relative mb-8">
            <div className="w-48 h-48 rounded-[48px] bg-white shadow-2xl overflow-hidden border-8 border-white">
              <img src={generateUrl()} alt="Avatar Preview" className="w-full h-full object-cover" />
            </div>
            <button 
              onClick={randomize}
              className="absolute -bottom-4 -right-4 p-4 bg-red-600 text-white rounded-2xl shadow-xl hover:bg-red-700 transition-all active:scale-90"
            >
              <RefreshCw size={24} />
            </button>
          </div>
          <div className="w-full space-y-3">
            <button 
              onClick={() => onSave(generateUrl())}
              className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
            >
              <Check size={20} />
              Salvar Avatar
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-4 bg-stone-100 text-stone-500 rounded-2xl font-bold hover:bg-stone-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Customization Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex overflow-x-auto p-4 gap-2 border-b border-stone-100 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'bg-red-600 text-white shadow-md shadow-red-200' 
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Options Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {OPTIONS[activeTab].map((option) => (
                <button
                  key={option}
                  onClick={() => setOptions({ ...options, [activeTab]: option })}
                  className={`relative aspect-square rounded-2xl border-2 transition-all flex items-center justify-center overflow-hidden ${
                    options[activeTab] === option 
                      ? 'border-red-600 bg-red-50 shadow-inner' 
                      : 'border-stone-100 bg-stone-50 hover:border-stone-200'
                  }`}
                >
                  {activeTab === 'skinColor' || activeTab === 'hairColor' || activeTab === 'facialHairColor' || activeTab === 'clothesColor' ? (
                    <div 
                      className="w-10 h-10 rounded-full shadow-sm" 
                      style={{ backgroundColor: `#${option}` }} 
                    />
                  ) : (
                    <div className="text-[10px] font-bold text-stone-400 uppercase text-center px-1 break-words">
                      {option}
                    </div>
                  )}
                  {options[activeTab] === option && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
