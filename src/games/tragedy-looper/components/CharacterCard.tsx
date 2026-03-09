import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { CharacterState, Character, PlayedCard, Indicators, CharacterId, RoleType } from '@/games/tragedy-looper/types';
import { ROLE_NAMES } from '@/games/tragedy-looper/types';
import { IndicatorDisplay } from './IndicatorDisplay';
import { PlacedCards } from './PlacedCards';
import { cn } from '@/lib/utils';
import { getCharacterSpriteStyle, hasCharacterAsset } from '@/games/tragedy-looper/characterAssets';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';
import { X, Skull, RefreshCw, MapPin, Ban, HelpCircle, Zap } from 'lucide-react';
import type { LocationType } from '@/games/tragedy-looper/types';
import { TRAGEDY_SET_ROLES } from '@/games/tragedy-looper/data/plotRoles';

const FRIENDLY_ROLES: Set<RoleType> = new Set(['key_person', 'friend', 'lover']);
const HOSTILE_ROLES: Set<RoleType> = new Set(['killer', 'serial_killer', 'brain']);

function getGuessStyle(role: RoleType | undefined) {
  if (!role) return { bg: 'bg-slate-600', border: 'border-slate-500', text: 'text-white', hover: 'hover:bg-slate-500' };
  if (FRIENDLY_ROLES.has(role)) return { bg: 'bg-[#663344]', border: 'border-[#FF8899]', text: 'text-[#FFCCDD]', hover: 'hover:bg-[#774455]' };
  if (HOSTILE_ROLES.has(role)) return { bg: 'bg-[#5B1A1A]', border: 'border-[#CC4444]', text: 'text-[#FFAAAA]', hover: 'hover:bg-[#6B2222]' };
  return { bg: 'bg-[#3B2D5B]', border: 'border-[#9977DD]', text: 'text-[#DDCCFF]', hover: 'hover:bg-[#4A3870]' };
}

/** 位置显示配置 */
const LOCATION_STYLE: Record<LocationType, { label: string; short: string; color: string; bg: string }> = {
  hospital: { label: '医院', short: '医', color: 'text-blue-300',   bg: 'bg-blue-900/50 border-blue-700/50' },
  shrine:   { label: '神社', short: '社', color: 'text-purple-300', bg: 'bg-purple-900/50 border-purple-700/50' },
  city:     { label: '都市', short: '市', color: 'text-slate-300',  bg: 'bg-slate-700/60 border-slate-600/50' },
  school:   { label: '学校', short: '校', color: 'text-green-300',  bg: 'bg-green-900/50 border-green-700/50' },
};

/** 将 forbiddenLocation 统一为数组 */
function toForbidList(loc: LocationType | LocationType[] | null): LocationType[] {
  if (!loc) return [];
  return Array.isArray(loc) ? loc : [loc];
}

interface CharacterCardProps {
  characterState: CharacterState;
  characterDef: Character;
  isDead: boolean;
  /** 自己放在该角色上的牌 */
  myPlacedCards?: PlayedCard[];
  /** 对方放在该角色上的牌 */
  opponentPlacedCards?: PlayedCard[];
  /** 撤回牌 */
  onRetreatCard?: (cardId: string) => void;
  /** 是否正在放牌模式（有选中的牌） */
  isPlacingCard?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  /** 拖拽结束回调 */
  onDragEnd?: (charId: CharacterId, x: number, y: number) => void;
}

export function CharacterCard({ 
  characterState, 
  characterDef, 
  isDead, 
  myPlacedCards = [],
  opponentPlacedCards = [],
  onRetreatCard,
  isPlacingCard = false,
  onClick,
  onDragEnd
}: CharacterCardProps) {
  const [showGuessPopup, setShowGuessPopup] = useState(false);
  const [showEnlarge, setShowEnlarge] = useState(false);
  const hasCards = myPlacedCards.length > 0 || opponentPlacedCards.length > 0;
  
  const { isConnected, updateGameState, toggleCharacterLife } = useMultiplayer();
  const gameState = useGameStore((s) => s.gameState);
  const playerRole = useGameStore((s) => s.playerRole);
  const protagonistGuesses = useGameStore((s) => s.protagonistGuesses);
  const setProtagonistGuess = useGameStore((s) => s.setProtagonistGuess);

  const phase = gameState?.phase;
  const canToggleLife = phase !== 'protagonist_action';

  // 除主人公打牌阶段外，均可拖拽（手动修正位置）
  const canDrag = phase !== 'protagonist_action';

  // 是否允许手动编辑指示物（用于手动处理能力、纠错或剧作家操作）
  const canEditIndicators = true;

  // 死亡按钮 ref：用原生 capture listener 拦截 Framer Motion 的 drag
  const deathBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = deathBtnRef.current;
    if (!el) return;
    const stop = (e: PointerEvent) => e.stopPropagation();
    el.addEventListener('pointerdown', stop, true);
    return () => el.removeEventListener('pointerdown', stop, true);
  }, []);

  const toggleLife = () => {
    if (!canToggleLife) return;
    toggleCharacterLife(characterState.id);
  };

  const handleToggleLife = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLife();
  };

  // 调整指示物并同步到服务器
  const handleAdjustIndicator = useCallback((type: keyof Indicators, delta: number) => {
    if (!canEditIndicators) return;
    
    useGameStore.getState().adjustIndicator(characterState.id, type, delta);
    
    // 联机模式下同步
    if (isConnected) {
      setTimeout(() => {
        updateGameState(useGameStore.getState().getSyncPayload());
      }, 50);
    }
  }, [characterState.id, isConnected, updateGameState, canEditIndicators]);
  
  const handleClick = (e: React.MouseEvent) => {
    if (isPlacingCard) {
      onClick?.(e);
    }
  };
  
  // 检查角色是否有立绘资产
  const hasSpriteAsset = hasCharacterAsset(characterState.id);
  
  const spriteStyle = hasSpriteAsset 
    ? getCharacterSpriteStyle(characterState.id)
    : {};

  // 计算不安预警状态
  const anxietyDiff = characterDef.anxietyLimit - characterState.indicators.anxiety;
  const isAtLimit = anxietyDiff <= 0;      // 已达到或超过极限（危险！）
  const isNearLimit = anxietyDiff === 1;   // 差1点达到极限（警告！）

  // 根据不安状态决定样式
  const getAnxietyStyles = () => {
    if (isDead) {
      return {
        borderClass: "border-amoris/20",
        overlayClass: "bg-black/60",
        glowClass: "",
      };
    }
    
    if (isAtLimit) {
      return {
        borderClass: "border-timoris",
        overlayClass: "bg-timoris/30",
        glowClass: "shadow-[0_0_20px_rgba(51,85,102,0.6)]",
      };
    }
    
    if (isNearLimit) {
      return {
        borderClass: "border-doloris",
        overlayClass: "bg-doloris/20",
        glowClass: "shadow-[0_0_15px_rgba(187,153,85,0.4)]",
      };
    }
    
    // 正常状态
    return {
      borderClass: "border-slate-600 hover:border-slate-400",
      overlayClass: "",
      glowClass: "",
    };
  };

  const anxietyStyles = getAnxietyStyles();

  return (
    <motion.div
      layoutId={`char-${characterState.id}`}
      drag={canDrag}
      dragSnapToOrigin
      onDragEnd={(_, info) => onDragEnd?.(characterState.id, info.point.x, info.point.y)}
      className={cn(
        "relative w-full border-2 rounded-lg p-3 shadow-lg select-none transition-all duration-300 bg-cover bg-center",
        anxietyStyles.borderClass,
        anxietyStyles.glowClass,
        isDead ? "opacity-60" : "cursor-pointer",
        canDrag && "cursor-grab active:cursor-grabbing",
        hasCards && !isDead && "ring-2 ring-doloris/50",
        "flex flex-col gap-2 z-10",
        canDrag && "z-50"
      )}
      style={{
        backgroundImage: "url('/assets/tl/common/card-back-bg.png')",
        filter: isDead ? "grayscale(0.8)" : undefined,
      }}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: canDrag ? 1 : 0.98 }}
    >
      {/* 状态色覆盖层 */}
      {anxietyStyles.overlayClass && (
        <div className={cn("absolute inset-0 rounded-lg pointer-events-none z-0", anxietyStyles.overlayClass)} />
      )}

      {/* 死亡/复活切换按钮 */}
      <button
        ref={deathBtnRef}
        onClick={handleToggleLife}
        className={cn(
          "absolute -bottom-2 -left-2 p-1.5 rounded-full shadow-lg z-20 transition-all active:scale-90",
          isDead ? "bg-mortis hover:bg-mortis/80" : "bg-amoris hover:bg-amoris/80",
          "text-white"
        )}
        title={isDead ? "复活角色" : "宣告死亡"}
      >
        {isDead ? <RefreshCw size={14} /> : <Skull size={14} />}
      </button>

      {/* 已放置的牌显示（点击可撤回） */}
      {hasCards && (
        <div className="absolute -top-3 -right-2 z-10">
          <PlacedCards 
            myCards={myPlacedCards} 
            opponentCards={opponentPlacedCards}
            onRetreat={onRetreatCard}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
        <span className="font-bold text-slate-100 text-sm">{characterDef.name}</span>
        {isDead && <span className="text-amoris text-xs font-bold">[死亡]</span>}
        <div className="flex gap-1">
          {characterDef.traits.map((trait) => (
            <span key={trait} className="text-[10px] px-1 bg-slate-700 rounded text-slate-300">
              {trait === 'boy' ? '男' : trait === 'girl' ? '女' : '学生'}
            </span>
          ))}
        </div>
      </div>

      {/* 位置信息行：初始位置 + 禁止位置 X + 能力发动♥ */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* 初始位置 */}
        {(() => {
          const loc = LOCATION_STYLE[characterDef.initialLocation];
          return (
            <span className={cn('text-[10px] px-1 py-0.5 rounded border flex items-center gap-0.5', loc.bg, loc.color)}>
              <MapPin size={8} />
              {loc.short}
            </span>
          );
        })()}

        {/* 禁止进入位置（右上角 X） */}
        {toForbidList(characterDef.forbiddenLocation).map(loc => (
          <span key={loc} className="text-[10px] px-1 py-0.5 rounded border bg-timoris/20 border-timoris/40 text-timoris flex items-center gap-0.5">
            <Ban size={7} />
            {LOCATION_STYLE[loc].short}
          </span>
        ))}

        {/* 能力发动要求（♥ + 1/L） */}
        {characterDef.abilities.map((ability, i) => (
          <span key={i} className="ml-auto flex items-center gap-0.5">
            <span className="text-amoris text-[10px] tracking-tighter">
              {'♥'.repeat(Math.min(ability.goodwillRequired, 6))}
              {ability.goodwillRequired > 6 && `×${ability.goodwillRequired}`}
            </span>
            {ability.maxUsesPerLoop !== null && (
              <span className="text-[9px] text-doloris font-bold border border-doloris/50 rounded px-0.5">1/L</span>
            )}
          </span>
        ))}
      </div>

      {/* Avatar / Abilities Toggle */}
      <div
        className={cn(
          "relative w-full rounded overflow-hidden aspect-[620/866] cursor-pointer",
          isDead ? "bg-amoris/10" : "bg-slate-700"
        )}
        onClick={(e) => { e.stopPropagation(); setShowEnlarge(true); }}
      >
        {/* 角色立绘 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {hasSpriteAsset ? (
            <div 
              className="w-full h-full bg-center bg-no-repeat"
              style={spriteStyle}
            />
          ) : (
            // 备用：无立绘时显示纯色背景
            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
              <span className="text-slate-500 text-xs">{characterDef.name}</span>
            </div>
          )}
          
          {/* 死亡标记 - 大红X */}
          {isDead && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <X 
                size={80} 
                className="text-amoris drop-shadow-[0_0_10px_rgba(170,68,119,0.8)]" 
                strokeWidth={6}
              />
            </div>
          )}
          
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        {/* 不安极限显示 - 根据危险程度变色 */}
        <div className="flex items-center gap-1 text-xs transition-colors duration-300">
          <Zap
            size={11}
            fill="currentColor"
            className={cn(
              isAtLimit ? "text-[#e06666] animate-pulse" : isNearLimit ? "text-doloris" : "text-slate-400"
            )}
          />
          <span className={cn(
            isAtLimit ? "text-[#e06666] font-bold animate-pulse" : isNearLimit ? "text-doloris font-bold" : "text-slate-400"
          )}>
            不安:
          </span>
          <span className={cn(
            "font-bold",
            isAtLimit ? "text-[#e06666] animate-pulse" : isNearLimit ? "text-doloris/80" : "text-oblivionis"
          )}>
            {characterState.indicators.anxiety}/{characterDef.anxietyLimit}
          </span>
          {isAtLimit && <span className="text-[#e06666] animate-pulse">⚠️</span>}
        </div>
        
        <IndicatorDisplay 
          indicators={characterState.indicators} 
          className="justify-between"
          editable={canEditIndicators}
          onChange={handleAdjustIndicator}
        />
      </div>

      {/* 主人公专属：身份猜测按钮 */}
      {playerRole === 'protagonist' && (() => {
        const currentGuess = protagonistGuesses[characterState.id];
        const gs = getGuessStyle(currentGuess);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowGuessPopup((prev: boolean) => !prev);
            }}
            onPointerDown={e => e.stopPropagation()}
            className={cn(
              "w-full py-1 rounded border text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1",
              gs.bg, gs.border, gs.text, gs.hover
            )}
            title="猜测身份"
          >
            <HelpCircle size={11} />
            {currentGuess ? ROLE_NAMES[currentGuess] : '猜测身份'}
          </button>
        );
      })()}

      {/* 放大查看弹窗 - 使用 Portal 渲染到 body */}
      {/* 身份猜测弹窗 - Portal 到 body，完全脱离卡片事件 */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {showGuessPopup && playerRole === 'protagonist' && (() => {
            const tragedySet = gameState?.publicInfo.tragedySet ?? 'first_steps';
            const availableRoles = TRAGEDY_SET_ROLES[tragedySet];
            const currentGuess = protagonistGuesses[characterState.id];
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center"
                onClick={() => setShowGuessPopup(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-64"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-sm font-bold text-slate-200 mb-3">
                    {characterDef.name} · 猜测身份
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {/* 清除选项 */}
                    <button
                      onClick={() => {
                        setProtagonistGuess(characterState.id, null);
                        setShowGuessPopup(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                        !currentGuess
                          ? 'bg-slate-700 text-white font-bold'
                          : 'text-slate-400 hover:bg-slate-800'
                      )}
                    >
                      未知
                    </button>
                    {availableRoles.map(roleId => (
                      <button
                        key={roleId}
                        onClick={() => {
                          setProtagonistGuess(characterState.id, roleId);
                          setShowGuessPopup(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                          currentGuess === roleId
                            ? 'bg-violet-500/30 border border-violet-400/60 text-violet-200 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        )}
                      >
                        {ROLE_NAMES[roleId]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}

      {/* 放大查看弹窗 */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {showEnlarge && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center"
              onClick={() => setShowEnlarge(false)}
            >
              <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden w-72"
                onClick={e => e.stopPropagation()}
              >
                {/* 立绘区 */}
                <div className="relative w-full aspect-[3/4] bg-slate-800">
                  {hasSpriteAsset ? (
                    <div className="absolute inset-0 bg-center bg-no-repeat" style={spriteStyle} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-slate-500 text-2xl font-bold">{characterDef.name}</span>
                    </div>
                  )}
                  {isDead && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <X size={96} className="text-amoris drop-shadow-[0_0_16px_rgba(170,68,119,0.9)]" strokeWidth={5} />
                    </div>
                  )}
                  {/* 名字+特征 浮层 */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-end justify-between">
                      <span className="text-white font-black text-lg leading-none">{characterDef.name}</span>
                      <div className="flex gap-1">
                        {characterDef.traits.map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-700/80 rounded text-slate-300">
                            {t === 'boy' ? '男' : t === 'girl' ? '女' : '学生'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 信息区 */}
                <div className="px-4 py-3 space-y-3">
                  {/* 指示物 + 不安极限 */}
                  <div className="flex items-center justify-between">
                    <IndicatorDisplay indicators={characterState.indicators} editable={false} />
                    <div className="flex items-center gap-1 text-xs">
                      <Zap size={11} fill="currentColor" className={cn(isAtLimit ? 'text-[#e06666]' : isNearLimit ? 'text-doloris' : 'text-slate-400')} />
                      <span className={cn('font-bold', isAtLimit ? 'text-[#e06666]' : isNearLimit ? 'text-doloris' : 'text-slate-400')}>
                        {characterState.indicators.anxiety}/{characterDef.anxietyLimit}
                      </span>
                    </div>
                  </div>

                  {/* 位置 */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(() => {
                      const loc = LOCATION_STYLE[characterDef.initialLocation];
                      return (
                        <span className={cn('text-[11px] px-1.5 py-0.5 rounded border flex items-center gap-1', loc.bg, loc.color)}>
                          <MapPin size={9} /> 初始：{loc.short}
                        </span>
                      );
                    })()}
                    {toForbidList(characterDef.forbiddenLocation).map(loc => (
                      <span key={loc} className="text-[11px] px-1.5 py-0.5 rounded border bg-timoris/20 border-timoris/40 text-timoris flex items-center gap-1">
                        <Ban size={8} /> 禁入：{LOCATION_STYLE[loc].short}
                      </span>
                    ))}
                  </div>

                  {/* 能力列表 */}
                  {characterDef.abilities.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">友好能力</div>
                      {characterDef.abilities.map((ability, i) => (
                        <div key={i} className="bg-slate-800 rounded-lg px-3 py-2 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-200">{ability.description}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-amoris text-xs tracking-tighter">
                                {'♥'.repeat(Math.min(ability.goodwillRequired, 6))}
                                {ability.goodwillRequired > 6 && `×${ability.goodwillRequired}`}
                              </span>
                              {ability.maxUsesPerLoop !== null && (
                                <span className="text-[9px] text-doloris font-bold border border-doloris/50 rounded px-1">1/L</span>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{ability.effect}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 关闭提示 */}
                <div className="px-4 pb-3 text-center">
                  <span className="text-[11px] text-slate-600">点击空白处关闭</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
