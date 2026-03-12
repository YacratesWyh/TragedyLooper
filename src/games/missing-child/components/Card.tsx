'use client';

import { motion } from 'framer-motion';
import type { CardRef } from '../types';
import { getCardDef, isMaigo, isBright } from '../types';

const CARD_ASPECT = 2.5 / 3.5;
const MAIGO_IMAGE = '/assets/maigo/tomori.webp';

/** 卡牌背面（牌背图案：tomori 图） */
function CardBack({
  width,
  onClick,
  className = '',
}: {
  width: number;
  onClick?: () => void;
  className?: string;
}) {
  const height = width / CARD_ASPECT;
  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl border-2 border-stone-800 shadow-lg overflow-hidden bg-stone-900
        ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:border-red-900/60 active:scale-0.98 transition-transform' : ''} ${className}`}
      style={{
        width,
        height,
        backgroundImage: `url(${MAIGO_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      <div className="w-full h-full flex items-center justify-center bg-black/40">
        <span className="text-red-500 font-medium tracking-wider text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">迷子</span>
      </div>
    </Tag>
  );
}

/** 卡牌正面（牌面信息） */
function CardFront({
  card,
  width,
  selected,
  onClick,
  className = '',
}: {
  card: CardRef;
  width: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const def = getCardDef(card.cardId);
  const height = width / CARD_ASPECT;

  if (!def) return null;

  const isM = isMaigo(card.cardId);
  const isB = isBright(card.cardId);

  const bg =
    isM
      ? 'border-stone-800'
      : isB
        ? 'from-amber-900/90 to-amber-800/80 border-amber-600'
        : 'from-slate-700 to-slate-800 border-slate-600';

  const maigoStyle = isM
    ? {
        width,
        height,
        backgroundImage: `url(${MAIGO_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { width, height };

  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl border-2 shadow-lg overflow-hidden text-left
        ${isM ? '' : 'bg-gradient-to-br'} ${bg} ${selected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-stone-950 scale-[1.03]' : ''}
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-0.98 transition-transform' : ''} ${className}`}
      style={maigoStyle}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      <div className={`w-full h-full flex flex-col p-2 ${isM ? 'bg-black/50' : ''}`}>
        <div
          className={`font-bold text-sm leading-tight ${isM ? 'text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]' : 'text-stone-100'}`}
        >
          {def.name}
        </div>
        <div
          className={`text-[10px] mt-1 flex-1 break-words ${isM ? 'text-red-400/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : 'text-stone-400'}`}
        >
          {def.description}
        </div>
      </div>
    </Tag>
  );
}

/** 单张卡牌：可正面或背面，带翻转动画 */
export function MaigoCard({
  card,
  faceUp,
  width = 100,
  selected,
  onClick,
  className = '',
  small,
}: {
  card?: CardRef | null;
  faceUp: boolean;
  width?: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  small?: boolean;
}) {
  const w = small ? Math.min(width, 72) : width;

  if (faceUp && card) {
    return (
      <div className={`[perspective:1000px] ${className}`}>
        <motion.div
          initial={{ rotateY: 180 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.35 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <CardFront card={card} width={w} selected={selected} onClick={onClick} />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={card ? { rotateY: 0 } : false}
      animate={card ? { rotateY: 0 } : false}
      style={{ transformStyle: 'preserve-3d' }}
      className={className}
    >
      <CardBack width={w} onClick={onClick} />
    </motion.div>
  );
}

/** 牌库堆叠（多张牌背叠在一起，点击从牌库顶抽） */
export function DeckPile({
  count,
  width = 100,
  onClick,
  className = '',
}: {
  count: number;
  width?: number;
  onClick?: () => void;
  className?: string;
}) {
  const height = width / CARD_ASPECT;
  const offset = 4;

  return (
    <div className={`relative ${className}`} style={{ width: width + offset * 2, height: height + offset * 2 }}>
      {count > 0 && (
        <>
          <div
            className="absolute rounded-xl border-2 border-stone-600 bg-stone-800/90"
            style={{ width, height, left: offset * 2, top: offset * 2 }}
          />
          <div
            className="absolute rounded-xl border-2 border-stone-600 bg-stone-800/80"
            style={{ width, height, left: offset, top: offset }}
          />
          <div className="absolute left-0 top-0 z-10">
            <CardBack width={width} onClick={onClick} />
          </div>
          <span className="absolute -bottom-1 -right-1 z-20 rounded bg-stone-800 px-1.5 py-0.5 text-xs text-stone-400">
            {count}
          </span>
        </>
      )}
      {count === 0 && (
        <div
          className="absolute left-0 top-0 rounded-xl border-2 border-dashed border-stone-600 bg-stone-900/50 flex items-center justify-center text-stone-500 text-xs"
          style={{ width, height }}
        >
          空
        </div>
      )}
    </div>
  );
}
