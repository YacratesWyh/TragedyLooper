import React from 'react';
import { motion } from 'framer-motion';
import { CharacterState, Character } from '@/types/game';
import { IndicatorDisplay } from './IndicatorDisplay';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface CharacterCardProps {
  characterState: CharacterState;
  characterDef: Character;
  isDead: boolean;
  onClick?: () => void;
}

export function CharacterCard({ characterState, characterDef, isDead, onClick }: CharacterCardProps) {
  return (
    <motion.div
      layoutId={`char-${characterState.id}`}
      className={cn(
        "relative w-full max-w-[200px] bg-slate-800 border-2 rounded-lg p-3 shadow-lg select-none cursor-pointer transition-colors",
        isDead ? "border-red-900 bg-slate-900 opacity-60 grayscale" : "border-slate-600 hover:border-blue-400",
        "flex flex-col gap-2"
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-700 pb-2">
        <span className="font-bold text-slate-100">{characterDef.name}</span>
        {isDead && <span className="text-red-500 text-xs font-bold">[死亡]</span>}
        <div className="flex gap-1">
          {characterDef.traits.map((trait) => (
            <span key={trait} className="text-[10px] px-1 bg-slate-700 rounded text-slate-300">
              {trait === 'boy' ? '男' : trait === 'girl' ? '女' : '学生'}
            </span>
          ))}
        </div>
      </div>

      {/* Placeholder Avatar */}
      <div className={cn(
        "w-full h-24 rounded bg-slate-700 flex items-center justify-center overflow-hidden",
        isDead ? "bg-red-950/30" : "bg-slate-700"
      )}>
        {/* We use an icon as placeholder since we can't use images */}
        <User size={48} className={cn("text-slate-500", isDead && "text-red-900")} />
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-400">
            <span>不安极限: <span className="text-purple-400 font-bold">{characterDef.anxietyLimit}</span></span>
        </div>
        
        <IndicatorDisplay indicators={characterState.indicators} className="justify-between" />
      </div>

      {/* Abilities Indicator (Tiny dots or icons to show they have abilities) */}
      <div className="flex gap-1 mt-1 justify-center">
        {characterDef.abilities.map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
        ))}
      </div>
    </motion.div>
  );
}
