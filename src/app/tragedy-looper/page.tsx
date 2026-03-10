'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';
import { GameBoard } from '@/games/tragedy-looper/components/GameBoard';
import { LobbyScreen } from '@/games/tragedy-looper/components/LobbyScreen';
import { GameInfo } from '@/games/tragedy-looper/components/GameInfo';
import { ActionHand } from '@/games/tragedy-looper/components/ActionHand';
import { DeckReference } from '@/games/tragedy-looper/components/DeckReference';
import { RulesReference, SupplementaryReference } from '@/games/tragedy-looper/components/RulesReference';
import { PhaseControl } from '@/games/tragedy-looper/components/PhaseControl';
import { MultiplayerPanel } from '@/games/tragedy-looper/components/MultiplayerPanel';
import { GameIntroPanel } from '@/games/tragedy-looper/components/GameIntroPanel';
import { TurnHandoffScreen } from '@/games/tragedy-looper/components/TurnHandoffScreen';
import { TutorialGuide } from '@/games/tragedy-looper/components/TutorialGuide';
import { TL_THEME } from '@/games/tragedy-looper/theme';
import type { LocationType, CharacterId, PlayerRole, GamePhase } from '@/games/tragedy-looper/types';
import { ROLE_NAMES } from '@/games/tragedy-looper/types';
import { getPlotsForSet, mergeRequiredRoles, type PlotDef } from '@/games/tragedy-looper/data/plotRoles';
import { AlertCircle, Move, PanelLeft, X } from 'lucide-react';

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
  const [canDragCharacter, setCanDragCharacter] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [guessY, setGuessY] = useState('');
  const [guessX1, setGuessX1] = useState('');
  const [guessX2, setGuessX2] = useState('');

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

  useEffect(() => {
    const body = document.body;
    const syncSidebarFromTutorial = () => {
      if (body.dataset.tutorialSidebar === 'open') {
        setIsSidebarOpen(true);
      }
    };

    syncSidebarFromTutorial();
    const observer = new MutationObserver(syncSidebarFromTutorial);
    observer.observe(body, {
      attributes: true,
      attributeFilter: ['data-tutorial-sidebar'],
    });

    return () => observer.disconnect();
  }, []);

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
  const roleLabel = playerRole === 'mastermind' ? '🎭 剧作家' : '🕵️ 主人公';

  return (
    <main className={`flex min-h-screen flex-col lg:flex-row font-sans relative bg-[url('/assets/tl/20220605022917_d75a4.jpg')] bg-cover bg-center bg-fixed ${TL_THEME.page}`}>
      {/* 热座模式交接屏幕 */}
      {showHandoff && gameState && (
        <TurnHandoffScreen
          targetRole={handoffRole}
          phase={gameState.phase}
          onConfirm={handleHandoffConfirm}
        />
      )}

      {/* 卡牌操作说明弹层（固定居中，避免遮挡移动端展开按钮） */}
      {showCardTutorial && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 backdrop-blur-sm px-4">
          <div className={`w-full max-w-80 rounded-xl shadow-2xl p-4 sm:p-5 ${TL_THEME.overlayCard}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                🃏 卡牌操作说明
              </h3>
              <button
                onClick={() => { setShowCardTutorial(false); localStorage.setItem('tl-card-tutorial-seen', '1'); }}
                aria-label="关闭卡牌操作说明"
                className="p-1 hover:bg-surface-3 rounded transition-colors text-text-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="space-y-2.5 mb-4">
              <li className="flex gap-2.5 text-xs text-text-muted">
                <span className="text-oblivionis shrink-0 font-bold">①</span>
                <span>点击底部卡牌选中，再点击 <strong className="text-white">NPC 角色</strong>即打出</span>
              </li>
              <li className="flex gap-2.5 text-xs text-text-muted">
                <span className="text-oblivionis shrink-0 font-bold">②</span>
                <span>打出后想反悔？<strong className="text-white">点击角色上的牌</strong>即可撤回</span>
              </li>
              <li className="flex gap-2.5 text-xs text-text-muted">
                <span className="text-oblivionis shrink-0 font-bold">③</span>
                <span>卡牌也可以打到<strong className="text-white">地点</strong>上——与密谋指示物相关</span>
              </li>
              <li className="flex gap-2.5 text-xs text-text-muted">
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

      {/* Sidebar Launcher (left side, not top bar) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-2 top-1/2 -translate-y-1/2 z-[95] h-10 w-9 rounded-r-md border border-slate-600 bg-slate-900/90 text-slate-200 hover:bg-slate-800 transition-colors flex items-center justify-center"
          title="展开信息栏"
          aria-label="展开信息栏"
        >
          <PanelLeft size={16} />
        </button>
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-[90] transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={() => setIsSidebarOpen(false)}
          aria-label="关闭信息栏"
          className="absolute inset-0 bg-black/45"
        />
        <div
          className={`absolute top-0 left-0 h-full w-[min(20rem,88vw)] border-r flex flex-col ${TL_THEME.shell} ${roleBorderColor} transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <GameInfo />
          <div className="flex-1 p-3 overflow-y-auto flex flex-col">
            <RulesReference />
            <PhaseControl />
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex lg:min-h-screen overflow-hidden transition-all duration-300 ease-in-out lg:shrink-0 ${
          isSidebarOpen
            ? `lg:w-72 border-r ${TL_THEME.shell} ${roleBorderColor}`
            : 'lg:w-0 border-r-0'
        }`}
      >
        <div className={`w-72 flex flex-col ${TL_THEME.shell} ${roleBorderColor}`}>
          <GameInfo />
          <div className="flex-1 p-3 overflow-y-auto flex flex-col">
            <RulesReference />
            <PhaseControl />
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden min-h-[60vh] lg:min-h-screen">
        {/* Top Bar */}
        <div className={`border-b flex flex-col lg:flex-row lg:items-center gap-2 px-3 sm:px-4 py-2.5 backdrop-blur-sm relative z-50 ${TL_THEME.panel} ${roleBorderColor}`}>
            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2 overflow-hidden">
              {/* 角色标识 + 放置数 */}
              {isHotseat && (
                <span className={`h-8 px-2.5 rounded-md text-xs font-bold shrink-0 inline-flex items-center ${roleColor} ${playerRole === 'mastermind' ? 'bg-timoris/15 border border-timoris/50' : 'bg-oblivionis/15 border border-oblivionis/50'}`}>
                  {roleLabel}
                </span>
              )}
              <span className={`h-8 px-2.5 rounded-md text-xs shrink-0 inline-flex items-center ${TL_THEME.chip}`}>
                <span className="font-bold text-doloris">{myPlayedCount}</span>/{maxCardsPerDay}
              </span>

              {errorMsg && (
                <span className="h-8 inline-flex items-center gap-1 px-2.5 rounded-md bg-amoris/12 border border-amoris/40 text-amoris text-xs shrink-0 max-w-full">
                  <AlertCircle size={12} />
                  <span className="truncate">{errorMsg}</span>
                </span>
              )}

              {/* 分隔线 */}
              <div className="hidden sm:block w-px h-6 bg-slate-700/80 shrink-0 mx-1" />

              {/* 剧情猜测 Y/X 下拉选择器 */}
              {(() => {
              const tragedySet = gameState?.publicInfo.tragedySet ?? 'first_steps';
              const { main: mainPlots, sub: subPlots } = getPlotsForSet(tragedySet);
              const selectedPlots: PlotDef[] = [];
              const yPlot = mainPlots.find(p => p.id === guessY);
              const x1Plot = subPlots.find(p => p.id === guessX1);
              const x2Plot = subPlots.find(p => p.id === guessX2);
              if (yPlot) selectedPlots.push(yPlot);
              if (x1Plot) selectedPlots.push(x1Plot);
              if (x2Plot) selectedPlots.push(x2Plot);
              const requiredRoles = mergeRequiredRoles(selectedPlots);
              const totalRequired = requiredRoles.reduce((s, r) => s + r.count, 0);
              const charCount = gameState?.publicInfo.characters.length ?? 0;
              const civilianCount = charCount - totalRequired;
              const hasSelection = guessY || guessX1;

              return (
                <div data-tutorial-id="plot-guess" className="flex items-center gap-2 flex-wrap">
                  <select
                    value={guessY}
                    onChange={e => setGuessY(e.target.value)}
                    className="h-8 rounded-md bg-slate-800/90 border border-slate-600 px-2.5 text-xs text-white focus:outline-none focus:border-violet-400 w-[108px] sm:w-auto"
                    title="猜测主线 Y"
                  >
                    <option value="">Y 主线</option>
                    {mainPlots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select
                    value={guessX1}
                    onChange={e => { setGuessX1(e.target.value); if (e.target.value === guessX2) setGuessX2(''); }}
                    className="h-8 rounded-md bg-slate-800/90 border border-slate-600 px-2.5 text-xs text-white focus:outline-none focus:border-violet-400 w-[108px] sm:w-auto"
                    title="猜测支线 X1"
                  >
                    <option value="">X1 支线</option>
                    {subPlots.map(p => <option key={p.id} value={p.id} disabled={p.id === guessX2}>{p.name}</option>)}
                  </select>
                  <select
                    value={guessX2}
                    onChange={e => { setGuessX2(e.target.value); if (e.target.value === guessX1) setGuessX1(''); }}
                    className="h-8 rounded-md bg-slate-800/90 border border-slate-600 px-2.5 text-xs text-white focus:outline-none focus:border-violet-400 w-[108px] sm:w-auto"
                    title="猜测支线 X2（可不选）"
                  >
                    <option value="">X2（无）</option>
                    {subPlots.map(p => <option key={p.id} value={p.id} disabled={p.id === guessX1}>{p.name}</option>)}
                  </select>

                  {/* 推算结果 */}
                  {hasSelection && (
                    <>
                      <div className="w-px h-6 bg-slate-700/80 shrink-0 mx-1" />
                      <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                        {requiredRoles.map(({ roleId, count }) => (
                          <span key={roleId} className="h-6 inline-flex items-center px-2 rounded-md bg-violet-500/18 border border-violet-400/35 text-violet-200 font-bold">
                            {ROLE_NAMES[roleId]}×{count}
                          </span>
                        ))}
                        <span className={`h-6 inline-flex items-center px-2 rounded-md font-bold ${
                          civilianCount < 0
                            ? 'bg-red-500/20 border border-red-400/50 text-red-300'
                            : 'bg-slate-700 border border-slate-600 text-slate-300'
                        }`}>
                          路人×{civilianCount}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            </div>

            {/* 右侧按钮 */}
            <div className="w-full flex items-center justify-end gap-1.5 shrink-0 max-w-full lg:w-auto lg:pl-2 lg:border-l lg:border-slate-700/70">
              {!isHotseat && <MultiplayerPanel />}
              <DeckReference inTopbar />
              <SupplementaryReference inTopbar />
              <GameIntroPanel inTopbar />
              <button
                onClick={() => setCanDragCharacter((prev) => !prev)}
                className={`h-7 px-2.5 rounded-md border text-xs font-bold transition-colors flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${
                  canDragCharacter
                    ? 'bg-amoris/25 border-amoris/60 text-amoris hover:bg-amoris/35'
                    : 'bg-oblivionis border-oblivionis text-white hover:bg-oblivionis/80'
                }`}
                title={canDragCharacter ? '已启用移动NPC（点击关闭）' : '启用移动NPC（拖拽角色）'}
              >
                <Move size={13} />
                {canDragCharacter ? '移动开' : '手动移动'}
              </button>
              <button
                onClick={() => setShowCardTutorial(v => !v)}
                className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center"
                title="操作说明"
              >
                ?
              </button>
            </div>
        </div>

        {/* Game Board */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 relative bg-black/96 backdrop-blur-[1px]">
             <GameBoard 
                onCharacterClick={(charId) => handleCardPlay(charId, 'character')}
                onLocationClick={(loc) => handleCardPlay(loc, 'location')}
                isPlacingCard={!!selectedCardId}
                canDragCharacter={canDragCharacter}
             />
             
             {/* 结算消息弹窗 */}
             {showMessages && resolutionMessages.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 z-50">
                 <div className="bg-surface-2 border border-doloris/50 rounded-lg shadow-2xl p-6 max-w-md mx-4 animate-in fade-in zoom-in duration-200">
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
                      className="p-1 hover:bg-surface-3 rounded transition-colors"
                      title="关闭"
                    >
                       <X size={18} className="text-text-muted" />
                     </button>
                   </div>
                   <div className="space-y-2">
                     {resolutionMessages.map((msg, idx) => (
                       <div key={idx} className="flex items-start gap-2 text-foreground">
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
      if (currentPhase === 'protagonist_action') return '🕵️ 等待主人公行动...';
      if (currentPhase === 'dawn') return '☀️ 黎明阶段';
      if (currentPhase === 'resolution') return '📋 结算中...';
      if (currentPhase === 'mastermind_ability') return '🎭 剧作家能力阶段';
      if (currentPhase === 'protagonist_ability') return '✨ 主人公能力阶段';
      if (currentPhase === 'incident') return '⚠️ 事件检查中';
      if (currentPhase === 'night') return '🌙 夜晚阶段';
      return '当前阶段无法打牌';
    };

    return (
      <div className={`relative backdrop-blur-md z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all ${TL_THEME.handContainer} ${!isMyTurn ? 'opacity-50 grayscale-[0.5]' : ''}`}>
        {!isMyTurn && (
          <div className="absolute inset-0 bg-black/10 z-30 pointer-events-none flex items-center justify-center">
            <div className={`px-6 py-2 rounded-full text-sm font-bold shadow-2xl backdrop-blur-md ${TL_THEME.handHint}`}>
              {getPhaseHint()}
            </div>
          </div>
        )}
        
        <div className="p-1" data-tutorial-id="action-hand">
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
      {/* 教学引导（仅 fs-01 教学剧本可见） */}
      <TutorialGuide />

    </main>
  );
}
