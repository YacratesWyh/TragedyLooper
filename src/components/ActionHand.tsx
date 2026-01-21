import React from 'react';
import { motion } from 'framer-motion';
import type { ActionCard as ActionCardInterface, PlayerDeck } from '@/types/game';
import { ActionCard } from './ActionCard';
import { cn } from '@/lib/utils';

interface ActionHandProps {
  deck: PlayerDeck;
  selectedCardId?: string | null;
  onCardSelect: (card: ActionCardInterface) => void;
  className?: string;
  /** 是否禁用整个手牌区（非行动阶段） */
  disabled?: boolean;
}

// 渲染单张卡牌
function CardSlot({ 
  card, 
  selectedCardId, 
  onCardSelect, 
  disabled,
  isUsedToday,
  isUsedThisLoop,
  size = 'normal',
}: {
  card: ActionCardInterface;
  selectedCardId?: string | null;
  onCardSelect: (card: ActionCardInterface) => void;
  disabled: boolean;
  isUsedToday: (id: string) => boolean;
  isUsedThisLoop: (id: string) => boolean;
  size?: 'normal' | 'small';
}) {
  const usedToday = isUsedToday(card.id);
  const usedThisLoop = card.oncePerLoop && isUsedThisLoop(card.id);
  const isDisabled = usedToday || usedThisLoop || disabled;

  // 已使用的牌：更明显的视觉效果
  const isUsed = usedToday || usedThisLoop;

  return (
    <motion.div
      key={card.id}
      layout
      initial={{ y: 30, opacity: 0 }}
      animate={{ 
        y: isUsed ? (size === 'small' ? 3 : 8) : 0,
        opacity: isUsed ? 0.25 : (disabled ? 0.5 : 1),
        scale: isUsed ? 0.9 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "flex flex-col items-center relative",
        isUsed && "grayscale"
      )}
    >
      <ActionCard
        card={card}
        isSelected={selectedCardId === card.id}
        onClick={() => !isDisabled && onCardSelect(card)}
        disabled={isDisabled}
        size={size}
      />
      {/* 已使用覆盖层 */}
      {isUsed && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          "bg-black/40 rounded-lg"
        )}>
          <span className={cn(
            "text-red-400 font-bold rotate-[-15deg]",
            size === 'small' ? "text-[10px]" : "text-xs"
          )}>
            {usedThisLoop ? "本轮已用" : "已用"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export function ActionHand({ deck, selectedCardId, onCardSelect, className, disabled = false }: ActionHandProps) {
  // 兼容 Set 和 Array（服务器发送的数据会把 Set 转成 Array）
  const isUsedToday = (id: string) => {
    if (deck.usedToday instanceof Set) return deck.usedToday.has(id);
    return Array.isArray(deck.usedToday) && deck.usedToday.includes(id);
  };
  const isUsedThisLoop = (id: string) => {
    if (deck.usedThisLoop instanceof Set) return deck.usedThisLoop.has(id);
    return Array.isArray(deck.usedThisLoop) && deck.usedThisLoop.includes(id);
  };

  // 判断是否为主人公牌组（有多套牌）
  const isProtagonist = deck.allCards.some(c => c.owner === 'protagonist');
  
  if (isProtagonist) {
    // 按 baseId 分组（每种牌一列，每列最多3张）
    const cardsByType: Record<string, ActionCardInterface[]> = {};
    const special: ActionCardInterface[] = []; // 禁止密谋（只有1张）
    
    deck.allCards.forEach(card => {
      const baseId = card.baseId || card.id;
      // 禁止密谋单独处理
      if (baseId === 'pro-forbid-intrigue') {
        special.push(card);
      } else {
        if (!cardsByType[baseId]) cardsByType[baseId] = [];
        cardsByType[baseId].push(card);
      }
    });
    
    // 牌类型显示顺序
    const typeOrder = [
      'pro-forbid-move',  // 禁止移动
      'pro-horiz',        // 横向
      'pro-vert',         // 纵向
      'pro-goodwill-1',   // 友好+1
      'pro-goodwill-2',   // 友好+2
      'pro-anxiety-plus', // 不安+1
      'pro-anxiety-minus', // 不安-1
    ];
    
    return (
      <div className={cn(
        "flex gap-2 p-2 transition-all items-start",
        disabled && "pointer-events-none",
        className
      )}>
        {/* 7种牌，每种一列（3张） */}
        {typeOrder.map(baseId => {
          const cards = cardsByType[baseId] || [];
          return (
            <div key={baseId} className="flex flex-col gap-1">
              {cards.map((card) => (
                <CardSlot
                  key={card.id}
                  card={card}
                  selectedCardId={selectedCardId}
                  onCardSelect={onCardSelect}
                  disabled={disabled}
                  isUsedToday={isUsedToday}
                  isUsedThisLoop={isUsedThisLoop}
                  size="small"
                />
              ))}
            </div>
          );
        })}
        
        {/* 分隔线 + 禁止密谋 */}
        {special.length > 0 && (
          <>
            <div className="w-px bg-slate-600/50 self-stretch mx-1" />
            <div className="flex flex-col gap-1">
              {special.map((card) => (
                <CardSlot
                  key={card.id}
                  card={card}
                  selectedCardId={selectedCardId}
                  onCardSelect={onCardSelect}
                  disabled={disabled}
                  isUsedToday={isUsedToday}
                  isUsedThisLoop={isUsedThisLoop}
                  size="small"
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // 剧作家牌组：单行显示
  return (
    <div className={cn(
      "flex gap-2 overflow-x-auto p-3 items-end min-h-[120px] transition-all",
      disabled && "pointer-events-none",
      className
    )}>
      {deck.allCards.map((card) => (
        <CardSlot
          key={card.id}
          card={card}
          selectedCardId={selectedCardId}
          onCardSelect={onCardSelect}
          disabled={disabled}
          isUsedToday={isUsedToday}
          isUsedThisLoop={isUsedThisLoop}
        />
      ))}
    </div>
  );
}
