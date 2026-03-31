import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { getMascotVisualState } from '../lib/progression';

interface MascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  level?: number;
  progress?: number; // 0 to 100
  status?: 'happy' | 'neutral' | 'sad' | 'critical';
}

export default function Mascot({ size = 'md', message, level = 1, progress = 0, status = 'happy' }: MascotProps) {
  // 10 Stages, each with 5 levels
  const stage = useMemo(() => Math.min(10, Math.ceil(level / 5)), [level]);
  
  // Intra-stage progress (0 to 1)
  const stageProgress = useMemo(() => ((level - 1) % 5) / 4, [level]);

  // Dynamic visual state based on XP progress within level
  const dynamicState = useMemo(() => getMascotVisualState(progress, stage), [progress, stage]);

  const sizes = {
    sm: { width: 60, height: 60 },
    md: { width: 100, height: 100 },
    lg: { width: 160, height: 160 },
    xl: { width: 240, height: 240 }
  };

  // Evolution-based visual parameters
  const visualParams = useMemo(() => {
    const baseBrightness = dynamicState.brightness + (stage * 0.05) + (stageProgress * 0.02);
    const animationSpeed = (4 - (stage * 0.2) - (stageProgress * 0.1)) * dynamicState.speed;
    const sparkCount = stage >= 3 ? Math.floor(dynamicState.sparks + stageProgress * 2) : 0;
    const auraIntensity = stage >= 4 ? (stage - 3) * 0.1 + (stageProgress * 0.05) + (progress / 500) : 0;
    
    // Gradients for each stage
    const gradients = [
      { start: '#FF9E00', mid: '#FF5400', end: '#FF0054' }, // Stage 1: Warm orange
      { start: '#FFB700', mid: '#FF7000', end: '#FF0040' }, // Stage 2: Brighter
      { start: '#FFD000', mid: '#FF8500', end: '#FF006E' }, // Stage 3: Vivid
      { start: '#FFEA00', mid: '#FF9E00', end: '#FB5607' }, // Stage 4: Intense
      { start: '#FFEE00', mid: '#FF5400', end: '#8338EC' }, // Stage 5: Electric
      { start: '#FF006E', mid: '#8338EC', end: '#3A86FF' }, // Stage 6: Elite (Pink/Purple/Blue)
      { start: '#3A86FF', mid: '#00F5D4', end: '#FF006E' }, // Stage 7: Neon
      { start: '#FFFFFF', mid: '#FFD000', end: '#FF0054' }, // Stage 8: Lendária (White core)
      { start: '#FFFFFF', mid: '#00F5D4', end: '#8338EC' }, // Stage 9: Mítica
      { start: '#FFFFFF', mid: '#FF006E', end: '#3A86FF' }, // Stage 10: Transcendente
    ];

    return {
      brightness: baseBrightness,
      speed: animationSpeed,
      sparks: sparkCount,
      aura: auraIntensity,
      gradient: gradients[stage - 1] || gradients[0]
    };
  }, [stage, stageProgress]);

  // Status-based modifiers
  const statusModifiers = useMemo(() => {
    switch (status) {
      case 'critical': return { scale: 0.6, opacity: 0.4, speedMult: 2, saturation: 0.3 };
      case 'sad': return { scale: 0.8, opacity: 0.7, speedMult: 1.5, saturation: 0.6 };
      case 'neutral': return { scale: 0.9, opacity: 0.9, speedMult: 1.2, saturation: 0.8 };
      default: return { scale: 1, opacity: 1, speedMult: 1, saturation: 1 };
    }
  }, [status]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 select-none">
      <motion.div
        className="relative flex items-center justify-center"
        style={{ 
          width: sizes[size].width, 
          height: sizes[size].height,
          filter: `saturate(${statusModifiers.saturation * dynamicState.saturation}) brightness(${visualParams.brightness})`
        }}
        animate={{
          y: [0, -10, 0],
          scale: status === 'happy' ? 
            [statusModifiers.scale * dynamicState.scale, statusModifiers.scale * dynamicState.scale * 1.05, statusModifiers.scale * dynamicState.scale] : 
            statusModifiers.scale * dynamicState.scale,
          rotate: status === 'happy' ? [0, -2, 2, 0] : 0,
          opacity: statusModifiers.opacity
        }}
        transition={{
          duration: visualParams.speed * statusModifiers.speedMult,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Aura/Glow for higher stages */}
        {visualParams.aura > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ 
              background: `radial-gradient(circle, ${visualParams.gradient.mid}, ${visualParams.gradient.end})`,
              opacity: visualParams.aura
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [visualParams.aura * 0.6, visualParams.aura, visualParams.aura * 0.6]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}

        {/* Sparks */}
        {visualParams.sparks > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(visualParams.sparks)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [-20, -80],
                  x: (i - visualParams.sparks / 2) * 15,
                }}
                transition={{
                  duration: 1 + Math.random(),
                  repeat: Infinity,
                  delay: i * (2 / visualParams.sparks),
                }}
                style={{
                  left: '50%',
                  bottom: '40%',
                }}
              />
            ))}
          </div>
        )}

        {/* Floating Energy Elements for Stage 9+ */}
        {stage >= 9 && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`energy-${i}`}
                className="absolute w-3 h-3 rounded-full blur-sm"
                style={{ 
                  background: visualParams.gradient.start,
                  left: '45%', 
                  top: '45%' 
                }}
                animate={{
                  rotate: 360,
                  x: [Math.cos(i * 120) * 40, Math.cos(i * 120 + 180) * 40, Math.cos(i * 120) * 40],
                  y: [Math.sin(i * 120) * 40, Math.sin(i * 120 + 180) * 40, Math.sin(i * 120) * 40],
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 0.8, 0.4]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 1.5
                }}
              />
            ))}
          </div>
        )}

        {/* Main Flame Body */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-2xl"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`flameGrad-${level}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={visualParams.gradient.start} />
              <stop offset="50%" stopColor={visualParams.gradient.mid} />
              <stop offset="100%" stopColor={visualParams.gradient.end} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer Flame Shape */}
          <motion.path
            d="M50 5C50 5 85 40 85 70C85 86.5685 71.5685 100 55 100C38.4315 100 25 86.5685 25 70C25 40 50 5 50 5Z"
            fill={`url(#flameGrad-${level})`}
            filter="url(#glow)"
            animate={{
              d: [
                "M50 5C50 5 85 40 85 70C85 86.5685 71.5685 100 55 100C38.4315 100 25 86.5685 25 70C25 40 50 5 50 5Z",
                "M50 0C50 0 90 35 90 70C90 89.33 74.33 105 55 105C35.67 105 20 89.33 20 70C20 35 50 0 50 0Z",
                "M50 5C50 5 85 40 85 70C85 86.5685 71.5685 100 55 100C38.4315 100 25 86.5685 25 70C25 40 50 5 50 5Z"
              ]
            }}
            transition={{
              duration: visualParams.speed / 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Inner Glow/Core */}
          <motion.path
            d="M50 30C50 30 75 55 75 75C75 88.8 63.8 100 50 100C36.2 100 25 88.8 25 75C25 55 50 30 50 30Z"
            fill="white"
            opacity={stage >= 8 ? 0.4 : 0.2}
            animate={{
              scale: [0.8, 1, 0.8],
              opacity: stage >= 8 ? [0.3, 0.5, 0.3] : [0.1, 0.3, 0.1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Face */}
          <g transform="translate(0, 5)">
            {/* Eyes */}
            <AnimatePresence mode="wait">
              {status === 'critical' ? (
                <motion.g key="crit-eyes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <path d="M32 72 L44 64 M32 64 L44 72" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
                  <path d="M56 72 L68 64 M56 64 L68 72" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
                </motion.g>
              ) : (status === 'happy' || dynamicState.expression === 'happy') ? (
                <motion.g key="happy-eyes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <circle cx="38" cy="68" r="6" fill="white" />
                  <circle cx="62" cy="68" r="6" fill="white" />
                  <circle cx="39" cy="67" r="2.5" fill="#1c1917" />
                  <circle cx="61" cy="67" r="2.5" fill="#1c1917" />
                  <circle cx="37" cy="66" r="1.5" fill="white" opacity="0.8" />
                  <circle cx="59" cy="66" r="1.5" fill="white" opacity="0.8" />
                  {stage >= 6 && (
                    <motion.circle cx="39" cy="67" r="4" fill={visualParams.gradient.start} opacity="0.3" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                  )}
                </motion.g>
              ) : (status === 'neutral' || dynamicState.expression === 'neutral') ? (
                <motion.g key="neutral-eyes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <rect x="32" y="66" width="12" height="3" rx="1.5" fill="#1c1917" />
                  <rect x="56" y="66" width="12" height="3" rx="1.5" fill="#1c1917" />
                </motion.g>
              ) : (
                <motion.g key="sad-eyes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <path d="M32 70 Q38 64 44 70" stroke="#1c1917" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M56 70 Q62 64 68 70" stroke="#1c1917" strokeWidth="3" fill="none" strokeLinecap="round" />
                </motion.g>
              )}
            </AnimatePresence>

            {/* Mouth */}
            <AnimatePresence mode="wait">
              {status === 'happy' ? (
                <motion.path
                  key="happy-mouth"
                  d={stage >= 5 ? "M35 80 Q50 95 65 80" : "M40 82 Q50 90 60 82"}
                  stroke="#1c1917"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  animate={{ scale: [1, 1.1, 1] }}
                />
              ) : status === 'critical' ? (
                <motion.circle key="crit-mouth" cx="50" cy="84" r="4" stroke="#1c1917" strokeWidth="2" fill="none" />
              ) : status === 'neutral' ? (
                <motion.line key="neutral-mouth" x1="42" y1="84" x2="58" y2="84" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
              ) : (
                <motion.path key="sad-mouth" d="M42 86 Q50 82 58 86" stroke="#1c1917" strokeWidth="3" fill="none" strokeLinecap="round" />
              )}
            </AnimatePresence>
          </g>

          {/* Level Badge for higher stages */}
          {stage >= 3 && (
            <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transform="translate(75, 15)">
              <circle r="12" fill="white" className="shadow-sm" />
              <text y="4" textAnchor="middle" className="text-[10px] font-black fill-primary" style={{ fontSize: '10px' }}>{level}</text>
            </motion.g>
          )}
        </svg>
      </motion.div>
      
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl border border-white/20 relative"
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 border-t border-l border-white/20 rotate-45" />
          <p className="text-xs font-black text-stone-800 tracking-tight whitespace-nowrap uppercase">{message}</p>
        </motion.div>
      )}
    </div>
  );
}
