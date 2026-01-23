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
  /** 卡牌尺寸 */
  size?: 'normal' | 'small';
}

// 尺寸配置
const SIZE_CONFIG = {
  normal: {
    card: 'w-24 h-36 rounded-xl p-2',
    iconSize: 20,
    valueText: 'text-2xl',
    moveText: 'text-sm',
    labelPadding: 'py-1',
    labelText: 'text-xs',
    dotSize: 'w-2 h-2',
  },
  small: {
    card: 'w-14 h-20 rounded-lg p-1',
    iconSize: 12,
    valueText: 'text-sm',
    moveText: 'text-[10px]',
    labelPadding: 'py-0.5',
    labelText: 'text-[8px]',
    dotSize: 'w-1.5 h-1.5',
  },
};

const getCardTypeConfig = (iconSize: number): Record<string, { label: string; color: string; icon: React.ReactNode }> => ({
  movement: { 
    label: '移动', 
    color: 'bg-blue-600', 
    icon: <Footprints size={iconSize} /> 
  },
  goodwill: { 
    label: '友好', 
    color: 'bg-pink-600', 
    icon: <Heart size={iconSize} /> 
  },
  anxiety: { 
    label: '不安', 
    color: 'bg-purple-600', 
    icon: <Zap size={iconSize} /> 
  },
  intrigue: { 
    label: '密谋', 
    color: 'bg-slate-600', 
    icon: <Eye size={iconSize} /> 
  },
});

export function ActionCard({ card, isSelected, onClick, disabled, size = 'normal' }: ActionCardProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const typeConfig = getCardTypeConfig(sizeConfig.iconSize)[card.type] || { label: '未知', color: 'bg-gray-600', icon: null };
  
  return (
    <motion.div
      layout
      whileHover={!disabled ? { y: size === 'small' ? -5 : -10, scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "relative shadow-lg cursor-pointer border-2 flex flex-col items-center justify-between transition-all duration-200",
        sizeConfig.card,
        typeConfig.color,
        isSelected ? "border-yellow-400 ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900" : "border-white/10",
        disabled && "opacity-50 grayscale cursor-not-allowed"
      )}
    >
      <div className="w-full flex justify-center text-white/90">
        {typeConfig.icon}
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        {card.isForbid ? (
          <span className={cn(sizeConfig.valueText, "font-black text-red-300 drop-shadow-md")}>禁</span>
        ) : card.value ? (
          <span className={cn(sizeConfig.valueText, "font-black text-white drop-shadow-md")}>
            {card.value > 0 ? `+${card.value}` : card.value}
          </span>
        ) : card.movementType ? (
          <div className={cn("text-white font-bold text-center", sizeConfig.moveText)}>
            {card.movementType === 'horizontal' && '横'}
            {card.movementType === 'vertical' && '纵'}
            {card.movementType === 'diagonal' && '斜'}
            {card.movementType === 'forbid' && '禁'}
            </div>
        ) : null}
      </div>

      <div className={cn("w-full bg-black/20 rounded text-center", sizeConfig.labelPadding)}>
        <span className={cn("font-bold text-white", sizeConfig.labelText)}>{typeConfig.label}</span>
      </div>

      {card.oncePerLoop && (
        <div className={cn("absolute top-0.5 right-0.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]", sizeConfig.dotSize)} title="每轮回限用" />
      )}
    </motion.div>
  );
}
