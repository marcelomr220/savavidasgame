import React from 'react';
import { motion } from 'framer-motion';

interface MascotProps {
  level: number;
  lastActivityAt?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Mascot({ level, lastActivityAt, size = 'md' }: MascotProps) {
  const isInactive = () => {
    if (!lastActivityAt) return false;
    const lastActivity = new Date(lastActivityAt).getTime();
    const now = new Date().getTime();
    const diffInHours = (now - lastActivity) / (1000 * 60 * 60);
    return diffInHours > 24; // Inactive after 24 hours
  };

  const inactive = isInactive();

  const getSize = () => {
    switch (size) {
      case 'sm': return 'w-12 h-12';
      case 'lg': return 'w-32 h-32';
      default: return 'w-20 h-20';
    }
  };

  // Determine flame intensity based on level
  const getFlameColors = () => {
    if (level <= 5) return { primary: '#EF4444', secondary: '#F59E0B' }; // Red to Orange
    if (level <= 15) return { primary: '#F59E0B', secondary: '#FCD34D' }; // Orange to Yellow
    return { primary: '#FCD34D', secondary: '#FFFFFF' }; // Yellow to White (Holy Fire)
  };

  return (
    <div className={`relative flex items-center justify-center ${getSize()}`}>
      {/* Base Flame Image (Previous Appearance) */}
      <img 
        src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif"
        alt="Chama"
        className="w-full h-full object-contain absolute inset-0"
        referrerPolicy="no-referrer"
      />

      {/* Expressive Face Overlaid */}
      <motion.svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10"
        animate={{
          y: inactive ? 0 : [0, -2, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Face */}
        <g transform="translate(0, 10)">
          {/* Eyes */}
          {inactive ? (
            // Sad Eyes
            <>
              <path d="M35 55Q40 50 45 55" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M55 55Q60 50 65 55" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : (
            // Happy Eyes
            <>
              <circle cx="40" cy="55" r="4" fill="black" />
              <circle cx="60" cy="55" r="4" fill="black" />
              {/* Eye sparkle */}
              <circle cx="41.5" cy="53.5" r="1.2" fill="white" opacity="0.9" />
              <circle cx="61.5" cy="53.5" r="1.2" fill="white" opacity="0.9" />
            </>
          )}

          {/* Mouth */}
          {inactive ? (
            // Sad Mouth
            <path d="M40 72Q50 65 60 72" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : (
            // Happy Mouth
            <path d="M38 68Q50 80 62 68" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}
        </g>
      </motion.svg>

      {/* Glow effect for high levels */}
      {level > 10 && !inactive && (
        <div 
          className="absolute inset-0 rounded-full blur-2xl opacity-20 animate-pulse bg-primary"
        />
      )}
    </div>
  );
}
