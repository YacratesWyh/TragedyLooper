import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CharacterState, Character, PlayedCard, Indicators, CharacterId } from '@/types/game';
import { IndicatorDisplay } from './IndicatorDisplay';
import { PlacedCards } from './PlacedCards';
import { cn } from '@/lib/utils';
import { getCharacterSpriteStyle, hasCharacterAsset } from '@/lib/characterAssets';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { X, Skull, RefreshCw } from 'lucide-react';

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
  const [showZoomedImage, setShowZoomedImage] = useState(false);
  const hasCards = myPlacedCards.length > 0 || opponentPlacedCards.length > 0;
  
  const { isConnected, updateGameState, toggleCharacterLife } = useMultiplayer();
  const gameState = useGameStore((s) => s.gameState);
  const playerRole = useGameStore((s) => s.playerRole);

  const phase = gameState?.phase;

  // 判断是否允许拖拽（除打牌阶段外，允许人工修正位置）
  const canDrag = phase !== 'mastermind_action' && phase !== 'protagonist_action';

  // 是否允许手动编辑指示物（用于手动处理能力、纠错或剧作家操作）
  const canEditIndicators = true;

  // 切换死亡状态
  const handleToggleLife = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 仅在非打牌阶段允许手动切换死亡状态
    const phase = gameState?.phase;
    if (phase === 'mastermind_action' || phase === 'protagonist_action') {
      return;
    }
    
    toggleCharacterLife(characterState.id);
  };

  // 调整指示物并同步到服务器
  const handleAdjustIndicator = useCallback((type: keyof Indicators, delta: number) => {
    if (!canEditIndicators) return;
    
    useGameStore.getState().adjustIndicator(characterState.id, type, delta);
    
    // 联机模式下同步
    if (isConnected) {
      setTimeout(() => {
        const state = useGameStore.getState();
        updateGameState({ gameState: state.gameState });
      }, 50);
    }
  }, [characterState.id, isConnected, updateGameState, canEditIndicators]);
  
  const handleClick = (e: React.MouseEvent) => {
    // 放牌模式下，传递点击事件给父组件
    if (isPlacingCard) {
      onClick?.(e);
      return;
    }
    
    // 非放牌模式下，点击放大图片
    if (hasSpriteAsset) {
      setShowZoomedImage(true);
    }
  };
  
  // 检查角色是否有立绘资产
  const hasSpriteAsset = hasCharacterAsset(characterState.id);
  
  // 获取角色立绘样式（显示宽度180px）
  const displayWidth = 180;
  const spriteStyle = hasSpriteAsset 
    ? getCharacterSpriteStyle(characterState.id, displayWidth)
    : {};
  
  // 放大版本的立绘样式（显示宽度400px）
  const zoomedDisplayWidth = 400;
  const zoomedSpriteStyle = hasSpriteAsset 
    ? getCharacterSpriteStyle(characterState.id, zoomedDisplayWidth)
    : {};

  // 计算不安预警状态
  const anxietyDiff = characterDef.anxietyLimit - characterState.indicators.anxiety;
  const isAtLimit = anxietyDiff <= 0;      // 已达到或超过极限（危险！）
  const isNearLimit = anxietyDiff === 1;   // 差1点达到极限（警告！）

  // 根据不安状态决定样式
  const getAnxietyStyles = () => {
    if (isDead) {
      return {
        borderClass: "border-red-900",
        bgClass: "bg-slate-900",
        glowClass: "",
      };
    }
    
    if (isAtLimit) {
      // 已达极限：红色边框 + 红色渐变背景（不闪烁）
      return {
        borderClass: "border-red-600",
        bgClass: "bg-gradient-to-br from-red-900/80 via-slate-800 to-slate-800",
        glowClass: "shadow-[0_0_20px_rgba(220,38,38,0.6)]",
      };
    }
    
    if (isNearLimit) {
      // 差1点：橙色边框 + 橙色渐变警告
      return {
        borderClass: "border-orange-500",
        bgClass: "bg-gradient-to-br from-orange-900/40 via-slate-800 to-slate-800",
        glowClass: "shadow-[0_0_15px_rgba(249,115,22,0.4)]",
      };
    }
    
    // 正常状态
    return {
      borderClass: "border-slate-600 hover:border-blue-400",
      bgClass: "bg-slate-800",
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
        "relative w-full max-w-[200px] border-2 rounded-lg p-3 shadow-lg select-none transition-all duration-300",
        anxietyStyles.bgClass,
        anxietyStyles.borderClass,
        anxietyStyles.glowClass,
        isDead ? "cursor-not-allowed" : "cursor-pointer",
        canDrag && "cursor-grab active:cursor-grabbing",
        hasCards && !isDead && "ring-2 ring-amber-500/50", // 有牌时高亮
        "flex flex-col gap-2 z-10",
        canDrag && "z-50" // 拖拽时置顶
      )}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: canDrag ? 1 : 0.98 }}
    >
      {/* 死亡/复活切换按钮 */}
      <button
        onClick={handleToggleLife}
        className={cn(
          "absolute -bottom-2 -left-2 p-1.5 rounded-full shadow-lg z-20 transition-all active:scale-90",
          isDead ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500",
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

      {/* Avatar / Abilities Toggle */}
      <div className={cn(
        "relative w-full rounded overflow-hidden",
        isDead ? "bg-red-950/30" : "bg-slate-700"
      )}
        style={{ 
          // 620x866 原始尺寸，按 displayWidth 等比例缩放
          height: hasSpriteAsset ? `${Math.round(866 * displayWidth / 620)}px` : '96px',
        }}
      >
        {/* 角色立绘 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {hasSpriteAsset ? (
            <div 
              className={cn(
                "w-full h-full bg-center bg-no-repeat transition-all duration-300 cursor-pointer",
                isDead && "grayscale opacity-40"
              )}
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
                className="text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" 
                strokeWidth={6}
              />
            </div>
          )}
          
          {/* 点击放大提示 */}
          {hasSpriteAsset && !isDead && !isPlacingCard && (
            <div className="absolute bottom-1 right-1 text-[9px] text-white/60 bg-black/40 px-1 py-0.5 rounded pointer-events-none">
              点击放大
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        {/* 不安极限显示 - 根据危险程度变色 */}
        <div className="flex justify-between items-center text-xs">
          <span className="transition-colors duration-300">
            <span className={cn(
              isAtLimit 
                ? "text-red-400 font-extrabold animate-pulse" 
                : isNearLimit 
                  ? "text-orange-400 font-bold" 
                  : "text-slate-400"
            )}>
              不安
            </span>
            <span className={cn(
              isAtLimit 
                ? "text-red-400 font-bold" 
                : isNearLimit 
                  ? "text-orange-400 font-bold" 
                  : "text-slate-400"
            )}>
              极限: 
            </span>
            <span className={cn(
              "ml-1 font-bold",
              isAtLimit 
                ? "text-red-300 animate-pulse" 
                : isNearLimit 
                  ? "text-orange-300" 
                  : "text-purple-400"
            )}>
              {characterState.indicators.anxiety}/{characterDef.anxietyLimit}
            </span>
            {isAtLimit && <span className="ml-1 text-red-500 animate-pulse">⚠️</span>}
            {isNearLimit && <span className="ml-1 text-orange-500">⚡</span>}
          </span>
        </div>
        
        <IndicatorDisplay 
          indicators={characterState.indicators} 
          className="justify-between"
          editable={canEditIndicators}
          onChange={handleAdjustIndicator}
        />
      </div>

      {/* 放大查看弹窗 */}
      <AnimatePresence>
        {showZoomedImage && hasSpriteAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              e.stopPropagation();
              setShowZoomedImage(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowZoomedImage(false)}
                className="absolute -top-3 -right-3 p-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-full transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              {/* 放大的立绘 */}
              <div 
                className={cn(
                  "mx-auto rounded-lg shadow-2xl overflow-hidden",
                  isDead && "grayscale"
                )}
                style={zoomedSpriteStyle}
              />
              
              {/* 角色信息 */}
              <div className="mt-4 bg-slate-900/90 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{characterDef.name}</h3>
                  <span className="text-purple-400 text-sm">
                    不安上限: {characterDef.anxietyLimit}
                  </span>
                </div>
                
                {/* 能力列表 */}
                {characterDef.abilities.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-pink-400 font-bold">角色能力</div>
                    {characterDef.abilities.map((ability, i) => (
                      <div key={i} className="bg-slate-800/50 rounded p-2">
                        <div className="flex items-center gap-2 text-sm text-pink-300 font-medium">
                          <span>友好 ≥ {ability.goodwillRequired}</span>
                          {ability.maxUsesPerLoop && (
                            <span className="text-amber-400 text-xs">
                              (每轮{ability.maxUsesPerLoop}次)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-300 mt-1">{ability.effect}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm">此角色无特殊能力</div>
                )}
              </div>
              
              <div className="mt-3 text-center text-slate-500 text-xs">
                点击任意位置关闭
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
