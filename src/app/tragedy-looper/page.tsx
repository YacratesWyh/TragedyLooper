'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';
import { GameBoard } from '@/games/tragedy-looper/components/GameBoard';
import { LobbyScreen } from '@/games/tragedy-looper/components/LobbyScreen';
import { GameInfo } from '@/games/tragedy-looper/components/GameInfo';
import { ActionHand } from '@/games/tragedy-looper/components/ActionHand';
import { DeckReference } from '@/games/tragedy-looper/components/DeckReference';
import { RulesReference } from '@/games/tragedy-looper/components/RulesReference';
import { PhaseControl } from '@/games/tragedy-looper/components/PhaseControl';
import { MultiplayerPanel } from '@/games/tragedy-looper/components/MultiplayerPanel';
import { ScriptImageViewer } from '@/games/tragedy-looper/components/ScriptImageViewer';
import { GameIntroPanel } from '@/games/tragedy-looper/components/GameIntroPanel';
import { TurnHandoffScreen } from '@/games/tragedy-looper/components/TurnHandoffScreen';
import type { LocationType, CharacterId, PlayerRole, GamePhase } from '@/games/tragedy-looper/types';
import { RotateCcw, AlertCircle, X } from 'lucide-react';

function getPhaseOwner(phase: GamePhase): PlayerRole | null {
  switch (phase) {
    case 'mastermind_action':
    case 'mastermind_ability':
    case 'night':
      return 'mastermind';
    case 'protagonist_action':
    case 'protagonist_ability':
      return 'protagonist';
    default:
      return null;
  }
}

export default function Home() {
  const { 
    gameState, 
    playerRole, 
    gameMode,
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
  
  const { isConnected, isReconnecting, isSpectator, updateGameState, myRole } = useMultiplayer();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);

  // 热座模式：交接屏幕
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffRole, setHandoffRole] = useState<PlayerRole>('mastermind');
  const prevPhaseRef = useRef<GamePhase | null>(null);

  const isHotseat = gameMode === 'hotseat';

  // 当有结算消息时自动显示
  useEffect(() => {
    if (resolutionMessages.length > 0) {
      setShowMessages(true);
    }
  }, [resolutionMessages]);

  // 热座模式：阶段变化时触发交接屏幕
  useEffect(() => {
    if (!isHotseat || !gameState) return;
    const phase = gameState.phase;
    if (phase === prevPhaseRef.current) return;
    prevPhaseRef.current = phase;

    const owner = getPhaseOwner(phase);
    if (owner && owner !== playerRole) {
      setHandoffRole(owner);
      setShowHandoff(true);
      setSelectedCardId(null);
    }
  }, [gameState?.phase, isHotseat, playerRole]);

  const handleHandoffConfirm = () => {
    useGameStore.setState({ playerRole: handoffRole });
    setShowHandoff(false);
    setSelectedCardId(null);
  };

  // 获取当前玩家的牌组和已打出数量
  const myDeck = playerRole === 'mastermind' ? mastermindDeck : protagonistDeck;
  const myPlayedCount = playerRole === 'mastermind' 
    ? currentMastermindCards.length 
    : currentProtagonistCards.length;
  const maxCardsPerDay = 3;

  const handleCardPlay = (targetId?: string, targetType?: 'character' | 'location') => {
    if (isSpectator) return;
    if (!selectedCardId) return;
    setErrorMsg(null);

    const currentPhase = gameState?.phase;
    if (currentPhase !== 'mastermind_action' && currentPhase !== 'protagonist_action') {
      setErrorMsg('当前阶段无法打牌');
      return;
    }
    
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

    const isUsedToday = (id: string) => {
      if (myDeck.usedToday instanceof Set) return myDeck.usedToday.has(id);
      return Array.isArray(myDeck.usedToday) && myDeck.usedToday.includes(id);
    };
    
    if (isUsedToday(card.id)) {
      setErrorMsg('这张牌今天已经使用过了');
      return;
    }

    const usedThisLoopArr = Array.isArray(myDeck.usedThisLoop) 
      ? myDeck.usedThisLoop 
      : Array.from(myDeck.usedThisLoop);
    if (card.oncePerLoop && usedThisLoopArr.includes(card.id)) {
      setErrorMsg('这张牌本轮回已经使用过了');
      return;
    }

    if (myPlayedCount >= maxCardsPerDay) {
      setErrorMsg(`每天最多只能打出 ${maxCardsPerDay} 张牌`);
      return;
    }

    const targetCharId = targetType === 'character' ? (targetId as CharacterId) : undefined;
    const targetLoc = targetType === 'location' ? (targetId as LocationType) : undefined;

    if (targetCharId) {
      const targetCharState = gameState?.characters.find(c => c.id === targetCharId);
      if (targetCharState && !targetCharState.alive) {
        setErrorMsg('无法对死亡角色使用卡牌');
        return;
      }
    }

    if (isTargetOccupied(targetCharId, targetLoc)) {
      setErrorMsg('该目标已有你的牌，请先撤回');
      return;
    }

    const playedCard = {
      card: card,
      targetCharacterId: targetCharId,
      targetLocation: targetLoc
    };

    playCard(playedCard);
    setSelectedCardId(null);
    
    if (isConnected) {
      setTimeout(() => {
        updateGameState(getSyncPayload());
      }, 50);
    }
  };

  // 入口条件：热座模式用 gameMode + gameState，联机模式用 myRole + gameState
  const isGameReady = isHotseat ? !!gameState : (!!myRole && !!gameState);
  if (!isGameReady) {
    return <LobbyScreen onGameStart={() => {}} />;
  }

  // 当前角色颜色标识
  const roleColor = playerRole === 'mastermind' ? 'text-red-400' : 'text-blue-400';
  const roleBorderColor = playerRole === 'mastermind' ? 'border-red-500/30' : 'border-blue-500/30';
  const roleLabel = playerRole === 'mastermind' ? '🎭 剧作家' : '🦸 主人公';

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-200 font-sans relative">
      {/* 热座模式交接屏幕 */}
      {showHandoff && gameState && (
        <TurnHandoffScreen
          targetRole={handoffRole}
          phase={gameState.phase}
          onConfirm={handleHandoffConfirm}
        />
      )}

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
      <div className={`w-72 flex flex-col border-r bg-slate-900/50 ${roleBorderColor}`}>
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
        {/* Top Bar */}
        <div className={`h-12 border-b flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm relative z-50 ${roleBorderColor}`}>
            <div className="flex items-center gap-4">
                {/* 当前角色标识（热座模式突出显示） */}
                {isHotseat && (
                  <span className={`px-3 py-1 rounded font-bold ${roleColor} ${playerRole === 'mastermind' ? 'bg-red-950 border border-red-700' : 'bg-blue-950 border border-blue-700'}`}>
                    {roleLabel}
                  </span>
                )}
                <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 font-bold text-blue-400">
                    {selectedCardId ? "🎯 请选择目标" : "行动阶段"}
                </span>
                <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-sm">
                    已放置: <span className="font-bold text-amber-400">{myPlayedCount}</span>/{maxCardsPerDay}
                </span>
                {errorMsg && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded bg-red-900/50 border border-red-700 text-red-300 text-sm animate-pulse">
                    <AlertCircle size={14} />
                    {errorMsg}
                  </span>
                )}
            </div>
            
            {!isHotseat && <MultiplayerPanel />}
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

        {/* Hand */}
        {(() => {
    const currentPhase = gameState?.phase;
    const isActionPhase = !isSpectator && (
      (currentPhase === 'mastermind_action' && playerRole === 'mastermind') ||
      (currentPhase === 'protagonist_action' && playerRole === 'protagonist')
    );
    const isHandFull = myPlayedCount >= maxCardsPerDay;
    const isMyTurn = isActionPhase && !isHandFull;
    
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
