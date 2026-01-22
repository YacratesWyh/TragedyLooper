import React from 'react';
import { motion } from 'framer-motion';
import type { ActionCard as ActionCardInterface, PlayerDeck } from '@/types/game';
import { ActionCard } from './ActionCard';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';

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
        y: isUsed ? (size === 'small' ? 2 : 5) : 0,
        opacity: isUsed ? 0.15 : (disabled ? 0.5 : 1),
        scale: isUsed ? 0.85 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "flex flex-col items-center relative",
        isUsed && "grayscale pointer-events-none"
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
          "absolute inset-0 flex items-center justify-center z-10",
          "bg-black/60 rounded-lg backdrop-blur-[1px] border border-slate-700"
        )}>
          <span className={cn(
            "text-white font-black rotate-[-15deg] uppercase tracking-tighter drop-shadow-md",
            size === 'small' ? "text-[8px]" : "text-[10px]"
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

  // 获取今天已经出过牌的行号 (1, 2, 3)
  const usedRowNums = new Set<number>();
  const usedTodayList = deck.usedToday instanceof Set ? Array.from(deck.usedToday) : (deck.usedToday || []);
  usedTodayList.forEach(id => {
    const match = id.match(/-(\d+)$/);
    if (match) usedRowNums.add(parseInt(match[1], 10));
  });

  // 获取当前选中牌所在的行号
  let selectedRowWeight: number | null = null;
  if (selectedCardId) {
    const match = selectedCardId.match(/-(\d+)$/);
    if (match) selectedRowWeight = parseInt(match[1], 10);
  }

  // 判断是否为主人公牌组（有多套牌）
  const isProtagonist = deck.allCards.some(c => c.owner === 'protagonist');
  
  if (isProtagonist) {
    // 按 setNum 分组（3行，每行7张）
    const rows: ActionCardInterface[][] = [[], [], []];
    const special: ActionCardInterface[] = []; // 禁止密谋（只有1张）
    
    // 牌类型显示顺序 (7种)
    const typeOrder = [
      'pro-forbid-move',   // 禁止移动
      'pro-horiz',         // 横向
      'pro-vert',          // 纵向
      'pro-goodwill-1',    // 友好+1
      'pro-goodwill-2',    // 友好+2
      'pro-anxiety-plus',  // 不安+1
      'pro-anxiety-minus', // 不安-1
    ];

    deck.allCards.forEach(card => {
      if (card.id === 'pro-forbid-intrigue') {
        special.push(card);
      } else {
        // 解析 setNum (e.g., pro-horiz-1 -> 1)
        const match = card.id.match(/-(\d+)$/);
        const setNum = match ? parseInt(match[1], 10) : 1;
        rows[setNum - 1].push(card);
      }
    });

    // 对每一行按 typeOrder 排序
    rows.forEach(row => {
      row.sort((a, b) => typeOrder.indexOf(a.baseId!) - typeOrder.indexOf(b.baseId!));
    });
    
    return (
      <div className={cn(
        "flex flex-col gap-2 p-2 transition-all items-start bg-slate-900/50 rounded-xl border border-slate-700/50 shadow-inner",
        disabled && "opacity-80",
        className
      )}>
        <div className="flex gap-4">
          {/* 左侧：3行主牌组 */}
          <div className="flex flex-col gap-2">
            {rows.map((row, rowIndex) => {
              const rowNum = rowIndex + 1;
              const isRowDisabled = usedRowNums.has(rowNum);
              
              return (
                <div 
                  key={`row-${rowIndex}`} 
                  className={cn(
                    "flex gap-1.5 p-1 bg-slate-800/30 rounded-lg transition-opacity duration-300",
                    isRowDisabled ? "opacity-40 grayscale" : "opacity-100"
                  )}
                >
                  {row.map((card) => {
                    const isCardSelected = selectedCardId === card.id;
                    // 如果该行已出过牌，或者当前选中了该行的其他牌，则该牌不可选
                    const isCardUnselectable = (isRowDisabled && !isUsedToday(card.id)) || 
                                             (selectedRowWeight === rowNum && !isCardSelected);

                    return (
                      <CardSlot
                        key={card.id}
                        card={card}
                        selectedCardId={selectedCardId}
                        onCardSelect={onCardSelect}
                        disabled={disabled || isCardUnselectable}
                        isUsedToday={isUsedToday}
                        isUsedThisLoop={isUsedThisLoop}
                        size="small"
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* 右侧：特殊功能区 */}
          <div className="flex items-stretch h-full">
            <div className="w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent self-stretch mx-3" />
            
            <div className="flex flex-col items-center justify-between py-1 px-2 bg-slate-800/20 rounded-xl border border-slate-700/30">
              <div className="flex flex-col items-center gap-1.5 mb-2">
                <ShieldAlert size={14} className="text-amber-500/70" />
                <div className="flex flex-col -gap-1">
                  <span className="text-[10px] font-black text-amber-500/60 leading-none text-center">特</span>
                  <span className="text-[10px] font-black text-amber-500/60 leading-none text-center">殊</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
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
              
              <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-700" />
            </div>
          </div>
        </div>
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
