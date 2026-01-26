'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { GameBoard } from '@/components/GameBoard';
import { LobbyScreen } from '@/components/LobbyScreen';
import { GameInfo } from '@/components/GameInfo';
import { ActionHand } from '@/components/ActionHand';
import { DeckReference } from '@/components/DeckReference';
import { RulesReference } from '@/components/RulesReference';
import { PhaseControl } from '@/components/PhaseControl';
import { MultiplayerPanel } from '@/components/MultiplayerPanel';
import { ScriptImageViewer } from '@/components/ScriptImageViewer';
import { GameIntroPanel } from '@/components/GameIntroPanel';
import type { LocationType, CharacterId } from '@/types/game';
import { RotateCcw, AlertCircle, X } from 'lucide-react';

export default function Home() {
  const { 
    gameState, 
    playerRole, 
    mastermindDeck, 
    protagonistDeck,
    currentMastermindCards,
    currentProtagonistCards,
    playCard,
    isTargetOccupied,
    resolveDay, 
    endLoop,
    resolutionMessages,
    clearMessages,
    getSyncPayload
  } = useGameStore();
  
  const { isConnected, isReconnecting, updateGameState, myRole } = useMultiplayer();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);

  // 当有结算消息时自动显示
  useEffect(() => {
    if (resolutionMessages.length > 0) {
      setShowMessages(true);
    }
  }, [resolutionMessages]);

  // 获取当前玩家的牌组和已打出数量
  const myDeck = playerRole === 'mastermind' ? mastermindDeck : protagonistDeck;
  const myPlayedCount = playerRole === 'mastermind' 
    ? currentMastermindCards.length 
    : currentProtagonistCards.length;
  const maxCardsPerDay = 3;

  // Handle Card Play
  const handleCardPlay = (targetId?: string, targetType?: 'character' | 'location') => {
    if (!selectedCardId) return;
    setErrorMsg(null);

    // 检查是否在正确的行动阶段
    const currentPhase = gameState?.phase;
    if (currentPhase !== 'mastermind_action' && currentPhase !== 'protagonist_action') {
      setErrorMsg('当前阶段无法打牌');
      return;
    }
    
    // 检查是否轮到自己行动
    if (currentPhase === 'mastermind_action' && playerRole !== 'mastermind') {
      setErrorMsg('现在是剧作家行动阶段，请等待');
      return;
    }
    if (currentPhase === 'protagonist_action' && playerRole !== 'protagonist') {
      setErrorMsg('现在是主人公行动阶段，请等待');
      return;
    }

    const card = myDeck.allCards.find(c => c.id === selectedCardId);
    if (!card) return;

    // 检查卡牌是否已被使用（兼容 Set 和 Array）
    const isUsedToday = (id: string) => {
      if (myDeck.usedToday instanceof Set) return myDeck.usedToday.has(id);
      return Array.isArray(myDeck.usedToday) && myDeck.usedToday.includes(id);
    };
    
    // 检查这张牌是否今天已使用
    if (isUsedToday(card.id)) {
      setErrorMsg('这张牌今天已经使用过了');
      return;
    }

    // 检查每轮限一次的牌
    const usedThisLoopArr = Array.isArray(myDeck.usedThisLoop) 
      ? myDeck.usedThisLoop 
      : Array.from(myDeck.usedThisLoop);
    if (card.oncePerLoop && usedThisLoopArr.includes(card.id)) {
      setErrorMsg('这张牌本轮回已经使用过了');
      return;
    }

    // 检查是否已打满3张
    if (myPlayedCount >= maxCardsPerDay) {
      setErrorMsg(`每天最多只能打出 ${maxCardsPerDay} 张牌`);
      return;
    }

    const targetCharId = targetType === 'character' ? (targetId as CharacterId) : undefined;
    const targetLoc = targetType === 'location' ? (targetId as LocationType) : undefined;

    // 检查目标角色是否死亡
    if (targetCharId) {
      const targetCharState = gameState?.characters.find(c => c.id === targetCharId);
      if (targetCharState && !targetCharState.alive) {
        setErrorMsg('无法对死亡角色使用卡牌');
        return;
      }
    }

    // 检查目标是否已被占用
    if (isTargetOccupied(targetCharId, targetLoc)) {
      setErrorMsg('该目标已有你的牌，请先撤回');
      return;
    }

    // 任何牌都可以放地点（欺骗策略），不显示任何提示
    const playedCard = {
      card: card,
      targetCharacterId: targetCharId,
      targetLocation: targetLoc
    };

    playCard(playedCard);
    setSelectedCardId(null);
    
    // 联机模式下同步到服务器
    if (isConnected) {
      // 延迟一点让本地状态先更新
      setTimeout(() => {
        updateGameState(getSyncPayload());
      }, 50);
    }
  };

  // 未选择角色时显示大厅（即使 gameState 已被其他玩家初始化）
  if (!myRole || !gameState) {
    return <LobbyScreen onGameStart={() => {}} />;
  }

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-200 font-sans relative">
      {/* 重连提示覆盖层 */}
      {isReconnecting && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-amber-900/80 border border-amber-500 text-amber-200 shadow-2xl">
            <div className="w-5 h-5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
            <span className="font-bold">正在重连...</span>
          </div>
        </div>
      )}
      {/* Left Panel: Info + Phase Control */}
      <div className="w-72 flex flex-col border-r border-slate-800 bg-slate-900/50">
        {/* Game Info (上半部分) */}
        <GameInfo />
        
        {/* Phase Control (下半部分) */}
        <div className="flex-1 p-3 overflow-y-auto">
          <PhaseControl />
          
          {/* 结算控制 */}
          <div className="mt-3 pt-3 border-t border-slate-700">
            <button 
               onClick={() => { 
                 setErrorMsg(null); 
                 endLoop();
                 // 联机模式下同步
                 if (isConnected) {
                   setTimeout(() => {
                     const state = useGameStore.getState();
                     updateGameState({
                       gameState: state.gameState,
                       mastermindDeck: state.mastermindDeck,
                       protagonistDeck: state.protagonistDeck,
                       currentMastermindCards: state.currentMastermindCards,
                       currentProtagonistCards: state.currentProtagonistCards,
                     });
                   }, 50);
                 }
               }}
               className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-slate-200 rounded text-sm transition-all border border-slate-600/50 active:scale-95"
            >
               <RotateCcw size={14} />
               结束当前轮回
            </button>
          </div>
        </div>
      </div>

      {/* Left Side Panels */}
      <RulesReference />
      <GameIntroPanel />

      {/* Script Image Viewer (right bottom) */}
      <ScriptImageViewer />

      {/* Deck Reference Panel (right side) */}
      <DeckReference 
        deck={myDeck} 
        playerLabel={playerRole === 'mastermind' ? '剧作家牌组' : '主人公牌组'}
        side="right"
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* Top Bar - 包含联机面板 */}
        <div className="h-12 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm relative z-50">
            <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 font-bold text-blue-400">
                    {selectedCardId ? "🎯 请选择目标" : "行动阶段"}
                </span>
                {/* 已打出牌数 */}
                <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-sm">
                    已放置: <span className="font-bold text-amber-400">{myPlayedCount}</span>/{maxCardsPerDay}
                </span>
                {/* 错误提示 */}
                {errorMsg && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded bg-red-900/50 border border-red-700 text-red-300 text-sm animate-pulse">
                    <AlertCircle size={14} />
                    {errorMsg}
                  </span>
                )}
            </div>
            
            {/* 联机面板放到顶栏右侧 */}
            <MultiplayerPanel />
        </div>

        {/* Game Board */}
        <div className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4 relative">
             <GameBoard 
                onCharacterClick={(charId) => handleCardPlay(charId, 'character')}
                onLocationClick={(loc) => handleCardPlay(loc, 'location')}
                isPlacingCard={!!selectedCardId}
             />
             
             {/* 结算消息弹窗 */}
             {showMessages && resolutionMessages.length > 0 && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
                 <div className="bg-slate-800 border border-amber-500/50 rounded-lg shadow-2xl p-6 max-w-md mx-4 animate-in fade-in zoom-in duration-200">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                       <AlertCircle size={20} />
                       结算提示
                     </h3>
                    <button
                      onClick={() => {
                        setShowMessages(false);
                        clearMessages();
                      }}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                      title="关闭"
                    >
                       <X size={18} className="text-slate-400" />
                     </button>
                   </div>
                   <div className="space-y-2">
                     {resolutionMessages.map((msg, idx) => (
                       <div key={idx} className="flex items-start gap-2 text-slate-200">
                         <span className="text-amber-400">•</span>
                         <span>{msg}</span>
                       </div>
                     ))}
                   </div>
                   <button
                     onClick={() => {
                       setShowMessages(false);
                       clearMessages();
                     }}
                     className="mt-4 w-full px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors font-medium"
                   >
                     确认
                   </button>
                 </div>
               </div>
             )}
        </div>

        {/* Hand - 显示完整牌组，标记已使用的牌 */}
        {(() => {
    // 判断当前是否可以打牌
    const currentPhase = gameState?.phase;
    const isActionPhase = (currentPhase === 'mastermind_action' && playerRole === 'mastermind') ||
                         (currentPhase === 'protagonist_action' && playerRole === 'protagonist');
    const isHandFull = myPlayedCount >= maxCardsPerDay;
    const isMyTurn = isActionPhase && !isHandFull;
    
    // 获取当前阶段提示文字
    const getPhaseHint = () => {
      if (isMyTurn) return null;
      if (isHandFull && isActionPhase) return '✅ 今日已打满 3 张牌，请等待结算';
      if (currentPhase === 'mastermind_action') return '🎭 等待剧作家行动...';
      if (currentPhase === 'protagonist_action') return '🦸 等待主人公行动...';
      if (currentPhase === 'dawn') return '☀️ 黎明阶段';
      if (currentPhase === 'resolution') return '📋 结算中...';
      if (currentPhase === 'mastermind_ability') return '🎭 剧作家能力阶段';
      if (currentPhase === 'protagonist_ability') return '✨ 主人公能力阶段';
      if (currentPhase === 'incident') return '⚠️ 事件检查中';
      if (currentPhase === 'night') return '🌙 夜晚阶段';
      return '当前阶段无法打牌';
    };

    return (
      <div className={`relative border-t border-slate-800 bg-slate-900/90 backdrop-blur-md z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all ${!isMyTurn ? 'opacity-50 grayscale-[0.5]' : ''}`}>
        {/* 非行动阶段遮罩和提示 */}
        {!isMyTurn && (
          <div className="absolute inset-0 bg-black/10 z-30 pointer-events-none flex items-center justify-center">
            <div className="px-6 py-2 bg-slate-800/90 border border-slate-600 rounded-full text-slate-200 text-sm font-bold shadow-2xl backdrop-blur-md">
              {getPhaseHint()}
            </div>
          </div>
        )}
        
        <div className="p-1">
          <ActionHand 
            deck={myDeck} 
            selectedCardId={isMyTurn ? selectedCardId : null}
            onCardSelect={(card) => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
            disabled={!isMyTurn}
          />
        </div>
      </div>
    );
  })()}
      </div>
    </main>
  );
}
