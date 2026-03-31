/**
 * Progression logic for the mascot system.
 * Formula: XP for next level = 500 + (currentLevel * 150) + (currentLevel^2 * 10)
 */

export const getXPForNextLevel = (level: number): number => {
  return 500 + (level * 150) + (level * level * 10);
};

export const getLevelData = (totalXP: number) => {
  let level = 1;
  let xpForNext = getXPForNextLevel(level);
  let accumulatedXP = 0;
  
  // Calculate level by iterating through levels
  // This is simple and works well for 50 levels
  while (level < 50) {
    const needed = getXPForNextLevel(level);
    if (totalXP < accumulatedXP + needed) {
      break;
    }
    accumulatedXP += needed;
    level++;
  }
  
  const currentXPInLevel = totalXP - accumulatedXP;
  const nextLevelXP = getXPForNextLevel(level);
  const progress = (currentXPInLevel / nextLevelXP) * 100;
  
  // Determine stage (1-10)
  const stage = Math.ceil(level / 5);
  
  return {
    level,
    currentXPInLevel,
    nextLevelXP,
    progress,
    stage,
    isMaxLevel: level >= 50
  };
};

export const getStageName = (stage: number): string => {
  const names = [
    "Chama Iniciante", "Chama Crescente", "Chama Viva", "Chama Intensa", "Chama Forte",
    "Chama Elite", "Chama Suprema", "Chama Lendária", "Chama Mítica", "Chama Transcendente"
  ];
  return names[stage - 1] || names[0];
};

export const getMascotStatus = (lastActivityAt?: string): 'happy' | 'neutral' | 'sad' | 'critical' => {
  if (!lastActivityAt) return 'happy';
  
  const lastActivity = new Date(lastActivityAt);
  const now = new Date();
  const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
  
  if (diffHours > 240) return 'critical'; // 10+ days
  if (diffHours > 120) return 'sad';      // 5+ days
  if (diffHours > 48) return 'neutral';   // 2+ days
  return 'happy';
};

export const getMascotVisualState = (progress: number, stage: number) => {
  // progress is 0-100
  let scale = 1;
  let brightness = 1;
  let saturation = 1;
  let speed = 1; // Base speed (lower is faster in my Mascot.tsx logic)
  let sparks = 0;
  let expression = 'neutral';

  if (progress <= 25) {
    scale = 0.8;
    brightness = 0.8;
    saturation = 0.8;
    speed = 1.2;
    expression = 'neutral';
  } else if (progress <= 50) {
    scale = 0.95;
    brightness = 1.0;
    saturation = 1.1;
    speed = 1.0;
    expression = 'happy';
  } else if (progress <= 75) {
    scale = 1.15;
    brightness = 1.2;
    saturation = 1.3;
    speed = 0.8;
    sparks = Math.max(2, Math.floor(stage * 1.5));
    expression = 'happy';
  } else {
    scale = 1.35;
    brightness = 1.5;
    saturation = 1.6;
    speed = 0.6;
    sparks = Math.max(4, Math.floor(stage * 3));
    expression = 'happy';
  }

  return { 
    scale, 
    brightness, 
    saturation, 
    speed, 
    sparks, 
    expression 
  };
};
