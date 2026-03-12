'use client';

import { motion } from 'framer-motion';
import type { CardRef } from '../types';
import { getCardDef, isMaigo, isBright } from '../types';

const CARD_ASPECT = 2.5 / 3.5;
const MAIGO_IMAGE = '/assets/maigo/tomori.webp';
const NORMAL_BACK_IMAGE = '/assets/maigo/Silhouette Dance.webp';
const CARD_BG_IMAGE = '/assets/maigo/demo_card.png';

/** 卡牌背面：variant=maigo 为迷子牌背，variant=normal 为抽他人牌时的正常牌背 */
function CardBack({
  width,
  onClick,
  className = '',
  variant = 'maigo',
}: {
  width: number;
  onClick?: () => void;
  className?: string;
  variant?: 'maigo' | 'normal';
}) {
  const height = width / CARD_ASPECT;
  const Tag = onClick ? motion.button : motion.div;
  const isNormal = variant === 'normal';
  const bgImage = encodeURI(isNormal ? NORMAL_BACK_IMAGE : MAIGO_IMAGE);

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl border-2 border-stone-800 shadow-lg overflow-hidden bg-stone-900
        ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:border-red-900/60 active:scale-0.98 transition-transform' : ''} ${className}`}
      style={{
        width,
        height,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {!isNormal && (
        <div className="w-full h-full flex items-center justify-center bg-black/40">
          <span className="text-red-500 font-medium tracking-wider text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">迷子</span>
        </div>
      )}
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

  // 边框颜色：迷子=暗红，亮牌=琥珀，暗牌=青石
  const borderCls = isM
    ? 'border-red-900/80'
    : isB
      ? 'border-amber-600/80'
      : 'border-slate-500/80';

  // 底图：迷子用角色图，其余用 demo_card.png
  const bgUrl = encodeURI(isM ? MAIGO_IMAGE : CARD_BG_IMAGE);

  // 覆盖层颜色：亮牌=琥珀暖色，暗牌=深青，迷子=黑
  const overlayBg = isM
    ? 'bg-black/55'
    : isB
      ? 'bg-amber-950/60'
      : 'bg-slate-900/65';

  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl border-2 shadow-lg overflow-hidden text-left
        ${borderCls}
        ${selected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-stone-950 scale-[1.03]' : ''}
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform' : ''} ${className}`}
      style={{
        width,
        height,
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      <div className={`w-full h-full flex flex-col p-2 relative ${overlayBg}`}>
        {/* 卡牌类型标签 */}
        {!isM && (
          <span className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[9px] font-bold tracking-wide
            ${isB ? 'bg-amber-500/80 text-amber-950' : 'bg-slate-600/80 text-slate-200'}`}>
            {isB ? '光' : '暗'}
          </span>
        )}
        {/* 额外行动徽章 */}
        {def.extra_round > 0 && (
          <span className={`absolute top-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-bold
            ${isB ? 'bg-amber-400/90 text-amber-950' : 'bg-amber-600/90 text-white'}`}>
            行动+{def.extra_round}
          </span>
        )}
        {/* 卡名 */}
        <div className={`font-bold text-sm leading-tight mt-4
          ${isM ? 'text-red-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]' : isB ? 'text-amber-100 drop-shadow' : 'text-slate-100 drop-shadow'}`}>
          {def.name}
        </div>
        {/* 效果描述 */}
        <div className={`text-[9px] mt-1 flex-1 break-words leading-snug
          ${isM ? 'text-red-300/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : isB ? 'text-amber-200/80' : 'text-slate-300/80'}`}>
          {def.description}
        </div>
        {/* 迷子标记 */}
        {isM && (
          <div className="flex justify-center mt-1">
            <span className="text-red-500 font-medium tracking-widest text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              迷子
            </span>
          </div>
        )}
      </div>
    </Tag>
  );
}

/** 单张卡牌：可正面或背面，带翻转动画。backVariant：背面为迷子牌背或正常牌背（抽他人牌时用 normal） */
export function MaigoCard({
  card,
  faceUp,
  width = 100,
  selected,
  onClick,
  className = '',
  small,
  backVariant = 'maigo',
}: {
  card?: CardRef | null;
  faceUp: boolean;
  width?: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  small?: boolean;
  backVariant?: 'maigo' | 'normal';
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
      <CardBack width={w} onClick={onClick} variant={backVariant} />
    </motion.div>
  );
}

/** 牌库堆叠（多张牌背叠在一起，点击从牌库顶抽）
 * 默认使用正常牌背（与上家手牌牌背相同），除非 topIsMaigo 为 true（如派出所、传闻等技能将迷子放到牌库顶）
 */
export function DeckPile({
  count,
  width = 100,
  onClick,
  className = '',
  topIsMaigo = false,
}: {
  count: number;
  width?: number;
  onClick?: () => void;
  className?: string;
  /** 牌库顶是否为迷子（由卡牌技能如派出所、传闻放置） */
  topIsMaigo?: boolean;
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
            <CardBack width={width} onClick={onClick} variant={topIsMaigo ? 'maigo' : 'normal'} />
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

/** 弃牌堆展示组件 - 显示所有弃置的卡牌（使用原卡组件） */
export function DiscardPile({
  discard,
  cardWidth = 80,
}: {
  discard: CardRef[];
  cardWidth?: number;
}) {
  if (discard.length === 0) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm">
        <span className="text-xs">弃牌堆</span>
        <span className="text-xs opacity-50">（空）</span>
      </div>
    );
  }

  // 反转数组，最新的在前面
  const showCards = [...discard].reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500">弃牌堆</span>
        <span className="text-xs text-stone-600">({discard.length}张)</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {showCards.map((card) => (
          <MaigoCard
            key={card.instanceId}
            card={card}
            width={cardWidth}
            faceUp={true}
          />
        ))}
      </div>
    </div>
  );
}
