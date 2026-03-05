'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';
import { GameBoard } from '@/games/tragedy-looper/components/GameBoard';
import { LobbyScreen } from '@/games/tragedy-looper/components/LobbyScreen';
import { GameInfo } from '@/games/tragedy-looper/components/GameInfo';
import { ActionHand } from '@/games/tragedy-looper/components/ActionHand';
import { DeckReference } from '@/games/tragedy-looper/components/DeckReference';
import { SupplementaryReference } from '@/games/tragedy-looper/components/RulesReference';
import { PhaseControl } from '@/games/tragedy-looper/components/PhaseControl';
import { MultiplayerPanel } from '@/games/tragedy-looper/components/MultiplayerPanel';
import { ScriptImageViewer } from '@/games/tragedy-looper/components/ScriptImageViewer';
import { GameIntroPanel } from '@/games/tragedy-looper/components/GameIntroPanel';
import { TurnHandoffScreen } from '@/games/tragedy-looper/components/TurnHandoffScreen';
import type { LocationType, CharacterId, PlayerRole, GamePhase } from '@/games/tragedy-looper/types';
import { AlertCircle, X } from 'lucide-react';

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
    resolutionMessages,
    clearMessages,
    getSyncPayload
  } = useGameStore();
  
  const { isConnected, isReconnecting, isSpectator, updateGameState, myRole } = useMultiplayer();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [showCardTutorial, setShowCardTutorial] = useState(false);

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

  // 游戏就绪后首次显示操作说明（localStorage 持久化，看过一次就不再弹出）
  useEffect(() => {
    if (gameState && !localStorage.getItem('tl-card-tutorial-seen')) {
      setShowCardTutorial(true);
    }
  }, [gameState]);

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

  // 入口条件：热座模式用 gameMode + gameState，联机模式用 myRole/isSpectator + gameState
  const isGameReady = isHotseat ? !!gameState : ((!!myRole || isSpectator) && !!gameState);
  if (!isGameReady) {
    return <LobbyScreen onGameStart={() => {}} />;
  }

  // 当前角色颜色标识
  const roleColor = playerRole === 'mastermind' ? 'text-timoris' : 'text-oblivionis';
  const roleBorderColor = playerRole === 'mastermind' ? 'border-timoris/30' : 'border-oblivionis/30';
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

      {/* 卡牌操作说明悬浮卡片（右上角，背景可见） */}
      {showCardTutorial && (
        <div className="fixed top-14 right-4 z-[150] w-80 bg-slate-900/95 border border-slate-600 rounded-xl shadow-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm">
              🃏 卡牌操作说明
            </h3>
            <button
              onClick={() => { setShowCardTutorial(false); localStorage.setItem('tl-card-tutorial-seen', '1'); }}
              className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <ul className="space-y-2.5 mb-4">
            <li className="flex gap-2.5 text-xs text-slate-300">
              <span className="text-oblivionis shrink-0 font-bold">①</span>
              <span>点击底部卡牌选中，再点击 <strong className="text-white">NPC 角色</strong>即打出</span>
            </li>
            <li className="flex gap-2.5 text-xs text-slate-300">
              <span className="text-oblivionis shrink-0 font-bold">②</span>
              <span>打出后想反悔？<strong className="text-white">点击角色上的牌</strong>即可撤回</span>
            </li>
            <li className="flex gap-2.5 text-xs text-slate-300">
              <span className="text-oblivionis shrink-0 font-bold">③</span>
              <span>卡牌也可以打到<strong className="text-white">地点</strong>上——与密谋指示物相关</span>
            </li>
            <li className="flex gap-2.5 text-xs text-slate-300">
              <span className="text-oblivionis shrink-0 font-bold">④</span>
              <span>版图上的<strong className="text-white">指示物按钮</strong>为能力区，在对应阶段可自由调节</span>
            </li>
          </ul>
          <button
            onClick={() => { setShowCardTutorial(false); localStorage.setItem('tl-card-tutorial-seen', '1'); }}
            className="w-full py-2 rounded-lg bg-oblivionis hover:bg-oblivionis/80 text-white text-sm font-bold transition-colors"
          >
            知道了
          </button>
        </div>
      )}

      {/* 重连提示覆盖层 */}
      {isReconnecting && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-doloris/20 border border-doloris text-doloris shadow-2xl">
            <div className="w-5 h-5 border-2 border-doloris border-t-transparent rounded-full animate-spin" />
            <span className="font-bold">正在重连...</span>
          </div>
        </div>
      )}
      {/* Left Panel: Info + Phase Control */}
      <div className={`w-72 flex flex-col border-r bg-slate-900/50 ${roleBorderColor}`}>
        {/* Game Info (上半部分) */}
        <GameInfo />
        
        {/* Phase Control (下半部分) */}
        <div className="flex-1 p-3 overflow-y-auto flex flex-col">
          <PhaseControl />
        </div>
      </div>

      {/* Left Side Panels */}
      <SupplementaryReference />
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
                  <span className={`px-3 py-1 rounded font-bold ${roleColor} ${playerRole === 'mastermind' ? 'bg-timoris/15 border border-timoris/50' : 'bg-oblivionis/15 border border-oblivionis/50'}`}>
                    {roleLabel}
                  </span>
                )}
                <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 font-bold text-oblivionis">
                    {selectedCardId ? "🎯 请选择目标" : "行动阶段"}
                </span>
                <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-sm">
                    已放置: <span className="font-bold text-doloris">{myPlayedCount}</span>/{maxCardsPerDay}
                </span>
                {errorMsg && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded bg-amoris/15 border border-amoris/50 text-amoris text-sm animate-pulse">
                    <AlertCircle size={14} />
                    {errorMsg}
                  </span>
                )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isHotseat && <MultiplayerPanel />}
              <button
                onClick={() => setShowCardTutorial(v => !v)}
                className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center"
                title="操作说明"
              >
                ?
              </button>
            </div>
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
                 <div className="bg-slate-800 border border-doloris/50 rounded-lg shadow-2xl p-6 max-w-md mx-4 animate-in fade-in zoom-in duration-200">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-bold text-doloris flex items-center gap-2">
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
                         <span className="text-doloris">•</span>
                         <span>{msg}</span>
                       </div>
                     ))}
                   </div>
                   <button
                     onClick={() => {
                       setShowMessages(false);
                       clearMessages();
                     }}
                     className="mt-4 w-full px-4 py-2 bg-doloris hover:bg-doloris/80 text-white rounded transition-colors font-medium"
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
