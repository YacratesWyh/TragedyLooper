import React from 'react';
import { motion } from 'framer-motion';
import type { PlayedCard, PlayerRole } from '@/games/tragedy-looper/types';
import { useGameStore } from '@/games/tragedy-looper/store';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Heart, Zap, Footprints, X } from 'lucide-react';

interface PlacedCardsProps {
  /** 自己放的牌（面朝上，可见） */
  myCards: PlayedCard[];
  /** 对方放的牌（面朝下，只知道有牌） */
  opponentCards: PlayedCard[];
  /** 点击自己的牌时撤回 */
  onRetreat?: (cardId: string) => void;
  className?: string;
}

const CARD_ICONS: Record<string, React.ReactNode> = {
  movement: <Footprints size={12} />,
  goodwill: <Heart size={12} />,
  anxiety: <Zap size={12} />,
  intrigue: <Eye size={12} />,
};

const CARD_COLORS: Record<string, string> = {
  movement: 'bg-oblivionis border-oblivionis/80',
  goodwill: 'bg-amoris border-amoris/80',
  anxiety: 'bg-amoris border-amoris/80',
  intrigue: 'bg-slate-600 border-slate-400',
};

/** 面朝上的牌（自己放的，可撤回） */
function FaceUpCard({ playedCard, onRetreat }: { playedCard: PlayedCard; onRetreat?: () => void }) {
  const { card } = playedCard;
  
  // 获取显示内容
  const getCardLabel = () => {
    if (card.isForbid) return '禁';
    if (card.value !== undefined && card.value !== 0) {
      return card.value > 0 ? `+${card.value}` : `${card.value}`;
    }
    if (card.movementType) {
      return card.movementType === 'horizontal' ? '横' :
             card.movementType === 'vertical' ? '纵' :
             card.movementType === 'diagonal' ? '斜' : '禁';
    }
    return '';
  };

  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1 }}
      onClick={(e) => {
        e.stopPropagation();
        onRetreat?.();
      }}
      className={cn(
        "relative w-8 h-10 rounded border-2 flex flex-col items-center justify-center text-white text-[10px] font-bold shadow-lg cursor-pointer group",
        CARD_COLORS[card.type],
        card.isForbid && "border-timoris ring-1 ring-timoris"
      )}
      title={`点击撤回 - ${card.isForbid ? '禁止' : ''}${card.type}`}
    >
      {/* 撤回按钮（hover 时显示） */}
      {onRetreat && (
        <div className="absolute inset-0 bg-black/60 rounded opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <X size={14} className="text-timoris" />
        </div>
      )}
      {CARD_ICONS[card.type]}
      <span className={cn(card.isForbid && "text-timoris/80")}>{getCardLabel()}</span>
    </motion.div>
  );
}

/** 面朝下的牌（对方放的，只知道有牌） */
function FaceDownCard({ owner }: { owner: PlayerRole }) {
  const isMastermind = owner === 'mastermind';
  return (
    <motion.div
      initial={{ scale: 0, rotate: 20 }}
      animate={{ scale: 1, rotate: 0 }}
      className={cn(
        "w-8 h-10 rounded border-2 flex items-center justify-center shadow-lg",
        isMastermind 
          ? "bg-timoris/10 border-timoris/25" 
          : "bg-oblivionis/10 border-oblivionis/25"
      )}
      title={isMastermind ? "剧作家的牌" : "主人公的牌"}
    >
      <EyeOff size={14} className="text-slate-500" />
    </motion.div>
  );
}

/** 显示放在目标上的所有牌 */
export function PlacedCards({ myCards, opponentCards, onRetreat, className }: PlacedCardsProps) {
  const { gameState } = useGameStore();
  const phase = gameState?.phase || 'dawn';
  
  // 结算阶段及之后，所有牌都翻开
  const isRevealed = ['resolution', 'mastermind_ability', 'protagonist_ability', 'incident', 'night', 'game_over'].includes(phase);

  if (myCards.length === 0 && opponentCards.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex gap-1 flex-wrap", className)}>
      {/* 对方的牌 */}
      {opponentCards.map((pc, i) => (
        isRevealed ? (
          <FaceUpCard key={`opp-${i}`} playedCard={pc} />
        ) : (
          <FaceDownCard key={`opp-${i}`} owner={pc.card.owner} />
        )
      ))}
      {/* 自己的牌 */}
      {myCards.map((pc) => (
        <FaceUpCard 
          key={pc.card.id} 
          playedCard={pc} 
          onRetreat={(!isRevealed && onRetreat) ? () => onRetreat(pc.card.id) : undefined}
        />
      ))}
    </div>
  );
}
