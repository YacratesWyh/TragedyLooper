import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerDeck, ActionCard } from '@/types/game';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronDown, Heart, Zap, Eye, Footprints, X, Layers } from 'lucide-react';

interface DeckReferenceProps {
  deck: PlayerDeck;
  playerLabel: string;
  side: 'left' | 'right';
}

const CARD_ICONS: Record<string, React.ReactNode> = {
  movement: <Footprints size={14} />,
  goodwill: <Heart size={14} />,
  anxiety: <Zap size={14} />,
  intrigue: <Eye size={14} />,
};

const CARD_COLORS: Record<string, string> = {
  movement: 'bg-blue-600',
  goodwill: 'bg-pink-600',
  anxiety: 'bg-purple-600',
  intrigue: 'bg-slate-600',
};

// ===== 手牌参考数据 =====
interface HandCardInfo {
  type: 'movement' | 'goodwill' | 'anxiety' | 'intrigue';
  name: string;
  effect: string;
  oncePerLoop?: boolean;
}

const MASTERMIND_HAND: HandCardInfo[] = [
  { type: 'movement', name: '移动↑', effect: '纵向移动' },
  { type: 'movement', name: '移动→', effect: '横向移动' },
  { type: 'movement', name: '斜向移动', effect: '斜向移动', oncePerLoop: true },
  { type: 'anxiety', name: '不安+1', effect: '目标角色不安+1' },
  { type: 'anxiety', name: '不安+1', effect: '目标角色不安+1' },
  { type: 'anxiety', name: '不安-1', effect: '目标角色不安-1' },
  { type: 'anxiety', name: '禁止不安', effect: '抵消对方不安牌效果' },
  { type: 'goodwill', name: '禁止友好', effect: '抵消对方友好牌效果' },
  { type: 'intrigue', name: '密谋+1', effect: '目标密谋+1' },
  { type: 'intrigue', name: '密谋+2', effect: '目标密谋+2', oncePerLoop: true },
];

const PROTAGONIST_HAND: HandCardInfo[] = [
  { type: 'movement', name: '移动↑', effect: '纵向移动' },
  { type: 'movement', name: '移动→', effect: '横向移动' },
  { type: 'movement', name: '禁止移动', effect: '抵消对方移动牌效果', oncePerLoop: true },
  { type: 'goodwill', name: '友好+1', effect: '目标角色友好+1' },
  { type: 'goodwill', name: '友好+2', effect: '目标角色友好+2', oncePerLoop: true },
  { type: 'anxiety', name: '不安+1', effect: '目标角色不安+1' },
  { type: 'anxiety', name: '不安-1', effect: '目标角色不安-1', oncePerLoop: true },
  { type: 'intrigue', name: '禁止密谋', effect: '抵消对方密谋牌效果' },
];

const TYPE_COLORS_REF: Record<string, string> = {
  movement: 'bg-emerald-900/50 border-emerald-700/50 text-emerald-300',
  goodwill: 'bg-pink-900/50 border-pink-700/50 text-pink-300',
  anxiety: 'bg-purple-900/50 border-purple-700/50 text-purple-300',
  intrigue: 'bg-slate-700/50 border-slate-600/50 text-slate-300',
};

const TYPE_NAMES: Record<string, string> = {
  movement: '移动',
  goodwill: '友好',
  anxiety: '不安',
  intrigue: '密谋',
};

function HandCardsReference() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t border-slate-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-green-400" />
          <span className="font-bold text-sm text-slate-300">手牌参考</span>
        </div>
        <ChevronDown 
          size={16} 
          className={cn(
            "text-slate-500 transition-transform",
            isExpanded && "rotate-180"
          )} 
        />
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3 bg-slate-800/30">
              {/* 剧作家手牌 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={12} className="text-red-400" />
                  <span className="text-xs font-bold text-red-300">剧作家</span>
                </div>
                <div className="space-y-0.5">
                  {MASTERMIND_HAND.map((card, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <span className={cn(
                        "px-1 py-0.5 rounded text-[9px] border",
                        TYPE_COLORS_REF[card.type]
                      )}>
                        {TYPE_NAMES[card.type]}
                      </span>
                      <span className="text-white">{card.name}</span>
                      <span className="text-slate-500 flex-1 truncate">{card.effect}</span>
                      {card.oncePerLoop && (
                        <span className="text-[9px] text-amber-400">每轮1次</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 主人公手牌 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={12} className="text-blue-400" />
                  <span className="text-xs font-bold text-blue-300">主人公</span>
                </div>
                <div className="space-y-0.5">
                  {PROTAGONIST_HAND.map((card, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <span className={cn(
                        "px-1 py-0.5 rounded text-[9px] border",
                        TYPE_COLORS_REF[card.type]
                      )}>
                        {TYPE_NAMES[card.type]}
                      </span>
                      <span className="text-white">{card.name}</span>
                      <span className="text-slate-500 flex-1 truncate">{card.effect}</span>
                      {card.oncePerLoop && (
                        <span className="text-[9px] text-amber-400">每轮1次</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 出牌规则 */}
              <div className="pt-2 border-t border-slate-700/50 text-[10px] text-slate-500 space-y-0.5">
                <p>• 每天每角色/地点最多放 1 张牌</p>
                <p>• 每方每天出 3 张牌</p>
                <p>• 禁止牌可抵消同类型对方效果</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardItem({ card, deck }: { card: ActionCard; deck: PlayerDeck }) {
  // 兼容 Set 和 Array
  const checkUsedToday = (id: string) => {
    if (deck.usedToday instanceof Set) return deck.usedToday.has(id);
    return Array.isArray(deck.usedToday) && deck.usedToday.includes(id);
  };
  const checkUsedThisLoop = (id: string) => {
    if (deck.usedThisLoop instanceof Set) return deck.usedThisLoop.has(id);
    return Array.isArray(deck.usedThisLoop) && deck.usedThisLoop.includes(id);
  };

  const usedToday = checkUsedToday(card.id);
  const usedThisLoop = card.oncePerLoop && checkUsedThisLoop(card.id);
  const isUnavailable = usedToday || usedThisLoop;

  const getLabel = () => {
    if (card.isForbid) return '禁止';
    if (card.value) return card.value > 0 ? `+${card.value}` : `${card.value}`;
    if (card.movementType) {
      return card.movementType === 'horizontal' ? '横向' :
             card.movementType === 'vertical' ? '纵向' :
             card.movementType === 'diagonal' ? '斜向' : '禁止';
    }
    return '';
  };

  const getTypeName = () => {
    switch (card.type) {
      case 'movement': return '移动';
      case 'goodwill': return '友好';
      case 'anxiety': return '不安';
      case 'intrigue': return '密谋';
      default: return '';
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-1 rounded text-sm",
      isUnavailable ? "opacity-40 line-through" : "opacity-100"
    )}>
      <div className={cn(
        "w-6 h-6 rounded flex items-center justify-center text-white",
        CARD_COLORS[card.type]
      )}>
        {CARD_ICONS[card.type]}
      </div>
      <span className="flex-1">
        {getTypeName()} {getLabel()}
        {card.oncePerLoop && <span className="text-amber-400 ml-1">*</span>}
      </span>
      {usedToday && <span className="text-xs text-slate-500">今日已用</span>}
      {usedThisLoop && !usedToday && <span className="text-xs text-amber-500">本轮已用</span>}
    </div>
  );
}

export function DeckReference({ deck, playerLabel, side }: DeckReferenceProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 兼容 Set 和 Array（服务器发送的数据会把 Set 转成 Array）
  const isUsedToday = (id: string) => {
    if (deck.usedToday instanceof Set) return deck.usedToday.has(id);
    return Array.isArray(deck.usedToday) && deck.usedToday.includes(id);
  };
  const isUsedThisLoop = (id: string) => {
    if (deck.usedThisLoop instanceof Set) return deck.usedThisLoop.has(id);
    return Array.isArray(deck.usedThisLoop) && deck.usedThisLoop.includes(id);
  };

  const availableCount = deck.allCards.filter(c => 
    !isUsedToday(c.id) && !(c.oncePerLoop && isUsedThisLoop(c.id))
  ).length;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-30 px-2 py-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors flex flex-col items-center gap-1",
          side === 'left' ? "left-0 rounded-r-lg border-l-0" : "right-0 rounded-l-lg border-r-0"
        )}
        title="查看牌组"
      >
        {side === 'left' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        <div className="text-xs font-bold text-amber-400">{availableCount}</div>
        <div className="text-[10px] text-slate-500">/{deck.allCards.length}</div>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            
            {/* Panel Content */}
            <motion.div
              initial={{ x: side === 'left' ? -300 : 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: side === 'left' ? -300 : 300, opacity: 0 }}
              className={cn(
                "fixed top-0 h-full w-72 bg-slate-900 border-slate-700 z-50 shadow-2xl overflow-y-auto",
                side === 'left' ? "left-0 border-r" : "right-0 border-l"
              )}
            >
              {/* Header */}
              <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{playerLabel}</h3>
                  <p className="text-sm text-slate-400">
                    可用: {availableCount} / {deck.allCards.length}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Card List */}
              <div className="p-4 space-y-1">
                <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">移动牌</h4>
                {deck.allCards.filter(c => c.type === 'movement').map(card => (
                  <CardItem key={card.id} card={card} deck={deck} />
                ))}

                <h4 className="text-xs text-slate-500 uppercase tracking-wider mt-4 mb-2">友好牌</h4>
                {deck.allCards.filter(c => c.type === 'goodwill').map(card => (
                  <CardItem key={card.id} card={card} deck={deck} />
                ))}

                <h4 className="text-xs text-slate-500 uppercase tracking-wider mt-4 mb-2">不安牌</h4>
                {deck.allCards.filter(c => c.type === 'anxiety').map(card => (
                  <CardItem key={card.id} card={card} deck={deck} />
                ))}

                <h4 className="text-xs text-slate-500 uppercase tracking-wider mt-4 mb-2">密谋牌</h4>
                {deck.allCards.filter(c => c.type === 'intrigue').map(card => (
                  <CardItem key={card.id} card={card} deck={deck} />
                ))}
              </div>

              {/* Legend */}
              <div className="p-4 border-t border-slate-700 text-xs text-slate-400 space-y-1">
                <p><span className="text-amber-400">*</span> = 每轮限一次</p>
                <p>灰色删除线 = 已使用</p>
                <p className="mt-2 pt-2 border-t border-slate-800 text-slate-500">
                  主人公方有3套牌（1-3人），每人独立管理
                </p>
              </div>

              {/* 手牌参考 - 折叠区域 */}
              <HandCardsReference />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
