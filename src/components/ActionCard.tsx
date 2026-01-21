import React from 'react';
import { motion } from 'framer-motion';
import { ActionCard as ActionCardInterface } from '@/types/game';
import { cn } from '@/lib/utils';
import { Heart, Zap, Eye, Footprints } from 'lucide-react';

interface ActionCardProps {
  card: ActionCardInterface;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const CARD_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  movement: { 
    label: '移动', 
    color: 'bg-blue-600', 
    icon: <Footprints size={20} /> 
  },
  goodwill: { 
    label: '友好', 
    color: 'bg-pink-600', 
    icon: <Heart size={20} /> 
  },
  anxiety: { 
    label: '不安', 
    color: 'bg-purple-600', 
    icon: <Zap size={20} /> 
  },
  intrigue: { 
    label: '密谋', 
    color: 'bg-slate-600', 
    icon: <Eye size={20} /> 
  },
};

export function ActionCard({ card, isSelected, onClick, disabled }: ActionCardProps) {
  const config = CARD_TYPE_CONFIG[card.type] || { label: '未知', color: 'bg-gray-600', icon: null };
  
  return (
    <motion.div
      layout
      whileHover={!disabled ? { y: -10, scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "relative w-24 h-36 rounded-xl shadow-xl cursor-pointer border-2 flex flex-col items-center justify-between p-2 transition-all duration-200",
        config.color,
        isSelected ? "border-yellow-400 ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900" : "border-white/10",
        disabled && "opacity-50 grayscale cursor-not-allowed"
      )}
    >
      <div className="w-full flex justify-center text-white/90 pt-1">
        {config.icon}
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        {card.value && (
          <span className="text-2xl font-black text-white drop-shadow-md">
            {card.value > 0 ? `+${card.value}` : card.value}
          </span>
        )}
        {card.movementType && (
            <div className="text-white font-bold text-sm text-center">
                {card.movementType === 'horizontal' && '横向'}
                {card.movementType === 'vertical' && '纵向'}
                {card.movementType === 'diagonal' && '斜向'}
                {card.movementType === 'forbid' && '禁止'}
            </div>
        )}
      </div>

      <div className="w-full bg-black/20 rounded py-1 text-center">
        <span className="text-xs font-bold text-white tracking-widest">{config.label}</span>
      </div>

      {card.oncePerLoop && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" title="每轮回限一次" />
      )}
    </motion.div>
  );
}
