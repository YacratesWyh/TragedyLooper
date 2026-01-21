'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { GameBoard } from '@/components/GameBoard';
import { RoleSelector } from '@/components/RoleSelector';
import { GameInfo } from '@/components/GameInfo';
import { ActionHand } from '@/components/ActionHand';
import { DeckReference } from '@/components/DeckReference';
import { RulesReference } from '@/components/RulesReference';
import { PhaseControl } from '@/components/PhaseControl';
import { MultiplayerPanel } from '@/components/MultiplayerPanel';
import type { LocationType, CharacterId } from '@/types/game';
import { RotateCcw, AlertCircle } from 'lucide-react';

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
    endLoop 
  } = useGameStore();
  
  const { isConnected, updateGameState } = useMultiplayer();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    
    // 检查 baseId 是否已在本轮使用（用于多副本牌的限制）
    const isBaseIdUsedThisLoop = (baseId: string | undefined) => {
      if (!baseId) return false;
      const usedSet = myDeck.usedThisLoop instanceof Set 
        ? myDeck.usedThisLoop 
        : new Set(Array.isArray(myDeck.usedThisLoop) ? myDeck.usedThisLoop : []);
      return myDeck.allCards.some(c => 
        c.baseId === baseId && usedSet.has(c.id)
      );
    };

    // 检查这张牌是否今天已使用
    if (isUsedToday(card.id)) {
      setErrorMsg('这张牌今天已经使用过了');
      return;
    }

    // 检查每轮限一次的牌（检查同 baseId 的所有牌）
    if (card.oncePerLoop) {
      const checkId = card.baseId || card.id;
      if (isBaseIdUsedThisLoop(checkId)) {
        setErrorMsg('这类牌本轮回已经使用过了（每轮限1次）');
        return;
      }
    }

    // 检查是否已打满3张
    if (myPlayedCount >= maxCardsPerDay) {
      setErrorMsg('每天最多打出3张牌');
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
  };

  if (!gameState) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-950 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-purple-900/20 blur-[100px] rounded-full" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-900/20 blur-[100px] rounded-full" />
        </div>
        
        <div className="z-10 text-center mb-12">
            <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-blue-500">
                惨剧轮回
            </h1>
            <p className="text-xl text-slate-400 font-light tracking-widest uppercase">Tragedy Looper</p>
        </div>

        <RoleSelector onSelect={() => {}} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
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
               强制重置轮回
            </button>
          </div>
        </div>
      </div>

      {/* Rules Reference Panel (left side) */}
      <RulesReference />

      {/* Deck Reference Panel (right side) */}
      <DeckReference 
        deck={myDeck} 
        playerLabel={playerRole === 'mastermind' ? '剧作家牌组' : '主人公牌组'}
        side="right"
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative">
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
        <div className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4">
             <GameBoard 
                onCharacterClick={(charId) => handleCardPlay(charId, 'character')}
                onLocationClick={(loc) => handleCardPlay(loc, 'location')}
                isPlacingCard={!!selectedCardId}
             />
        </div>

        {/* Hand - 显示完整牌组，标记已使用的牌 */}
        {(() => {
          // 判断当前是否可以打牌
          const currentPhase = gameState?.phase;
          const isMyTurn = 
            (currentPhase === 'mastermind_action' && playerRole === 'mastermind') ||
            (currentPhase === 'protagonist_action' && playerRole === 'protagonist');
          
          // 获取当前阶段提示文字
          const getPhaseHint = () => {
            if (isMyTurn) return null;
            if (currentPhase === 'mastermind_action') return '⏳ 等待剧作家行动...';
            if (currentPhase === 'protagonist_action') return '⏳ 等待主人公行动...';
            if (currentPhase === 'dawn') return '☀️ 黎明阶段 - 无需行动';
            if (currentPhase === 'resolution') return '📋 结算中...';
            if (currentPhase === 'ability') return '✨ 友好能力阶段';
            if (currentPhase === 'incident') return '⚠️ 事件检查中';
            if (currentPhase === 'night') return '🌙 夜晚阶段';
            return '当前阶段无法打牌';
          };
          
          return (
            <div className={`relative border-t border-slate-800 bg-slate-900/90 backdrop-blur-md z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-opacity ${!isMyTurn ? 'opacity-60' : ''}`}>
              {/* 非行动阶段提示 */}
              {!isMyTurn && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-slate-700/90 text-slate-300 px-4 py-1.5 rounded-t text-sm z-30 whitespace-nowrap">
                  {getPhaseHint()}
                </div>
              )}
              <ActionHand 
                deck={myDeck} 
                selectedCardId={isMyTurn ? selectedCardId : null}
                onCardSelect={(card) => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
                disabled={!isMyTurn}
              />
            </div>
          );
        })()}
      </div>
    </main>
  );
}
