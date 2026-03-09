/**
 * 游戏阶段控制组件
 * 显示当前阶段并提供阶段推进按钮
 * 联机模式下通过 WebSocket 同步
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GamePhase } from '@/games/tragedy-looper/types';
import { PHASE_NAMES } from '@/games/tragedy-looper/types';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';
import { processDawnPhase, isGameOver } from '@/games/tragedy-looper/engine';
import { TL_PHASE_COLORS } from '@/games/tragedy-looper/theme';
import { 
  Sunrise, 
  UserCircle, 
  Users, 
  CheckCircle, 
  Sparkles, 
  AlertTriangle, 
  Moon,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  RefreshCw,
  History,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_ICONS: Record<GamePhase, React.ReactNode> = {
  dawn: <Sunrise className="w-5 h-5" />,
  mastermind_action: <UserCircle className="w-5 h-5" />,
  protagonist_action: <Users className="w-5 h-5" />,
  resolution: <CheckCircle className="w-5 h-5" />,
  mastermind_ability: <Sparkles className="w-5 h-5" />,
  protagonist_ability: <Sparkles className="w-5 h-5" />,
  incident: <AlertTriangle className="w-5 h-5" />,
  night: <Moon className="w-5 h-5" />,
  loop_end: <RefreshCw className="w-5 h-5" />,
  game_over: <AlertTriangle className="w-5 h-5" />,
};

// 阶段顺序
const PHASE_ORDER: GamePhase[] = [
  'dawn',
  'mastermind_action', 
  'protagonist_action',
  'resolution',
  'mastermind_ability',
  'protagonist_ability',
  'incident',
  'night',
];

export function PhaseControl() {
  const { 
    gameState, 
    resolveDay, 
    revertPhaseState,
    dayHistory,
    currentHistoryIndex,
    saveDaySnapshot,
    viewHistoryDay,
    exitHistoryView,
    getSyncPayload,
  } = useGameStore();
  const { isConnected, myRole, isSpectator, players, updateGameState, resetGame } = useMultiplayer();
  const gameMode = useGameStore((s) => s.gameMode);
  const storeRole = useGameStore((s) => s.playerRole);

  // 黎明阶段自动推进（包含游戏开局的初始 dawn）
  const advanceFromDawnRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (gameState?.phase !== 'dawn') return;
    const timer = setTimeout(() => {
      advanceFromDawnRef.current?.();
    }, 600);
    return () => clearTimeout(timer);
  }, [gameState?.phase]);

  if (!gameState) return null;

  const isHotseat = gameMode === 'hotseat';
  const currentScript = useGameStore((s) => s.currentScript);
  const isTutorial = currentScript?.id === 'fs-01' || gameState.publicInfo.scriptName.includes('初学者');

  // 是否正在回放历史
  const isViewingHistory = currentHistoryIndex !== null;
  // 获取当前显示的历史快照
  const historySnapshot = isViewingHistory ? dayHistory[currentHistoryIndex] : null;

  const currentPhase = gameState.phase;
  const currentPhaseColor = TL_PHASE_COLORS[currentPhase];
  
  // 热座模式用 store 的角色，联机用 multiplayer 的角色
  const playerRole = isHotseat ? storeRole : myRole;

  // 获取下一个阶段
  const getNextPhase = (): GamePhase => {
    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    if (currentIndex === -1 || currentIndex === PHASE_ORDER.length - 1) {
      return 'dawn'; // 循环回到黎明
    }
    return PHASE_ORDER[currentIndex + 1];
  };

  // 推进到下一阶段（同时同步到服务器）
  const advanceToPhase = (nextPhase: GamePhase) => {
    console.log('⏩ 推进阶段:', currentPhase, '->', nextPhase, '联机状态:', isConnected);
    
    let newGameState = {
      ...gameState,
      phase: nextPhase,
    };

    // 在进入新阶段时，自动保存当前快照（用于复位手动操作）
    // 我们排除行动阶段，因为行动阶段主要是放牌，撤回已经有专门逻辑
    const manualPhases: GamePhase[] = [
      'resolution', 
      'mastermind_ability', 
      'protagonist_ability', 
      'incident', 
      'night'
    ];
    
    if (manualPhases.includes(nextPhase)) {
      newGameState.phaseSnapshot = {
        characters: JSON.parse(JSON.stringify(gameState.characters)),
        boardIntrigue: { ...gameState.boardIntrigue }
      };
    }

    // 如果是进入新的一天，更新天数并重置每日状态
    if (nextPhase === 'dawn' && currentPhase === 'night') {
      // 在进入新一天前，保存当前状态到历史
      saveDaySnapshot();

      // 执行黎明阶段逻辑（亲友+1友好）
      newGameState = processDawnPhase(newGameState);
      newGameState.currentDay = gameState.currentDay + 1;
      
      // 检查主人公是否因生存天数足够而获胜
      const gameOverCheck = isGameOver(newGameState);
      if (gameOverCheck.isOver) {
        newGameState.phase = 'game_over';
        setTimeout(() => saveDaySnapshot(), 100);
      }

      // 清除前一天的卡牌
      const { mastermindDeck, protagonistDeck } = useGameStore.getState();
      useGameStore.setState({
        currentMastermindCards: [],
        currentProtagonistCards: [],
        mastermindDeck: {
          ...mastermindDeck,
          usedToday: new Set(),
        },
        protagonistDeck: {
          ...protagonistDeck,
          usedToday: new Set(),
        }
      });
    }

    // 更新本地状态
    useGameStore.setState({ gameState: newGameState });

    // 如果联机，同步到服务器 (立即同步阶段变化)
    if (isConnected) {
      console.log('📤 发送阶段同步到服务器:', nextPhase);
      updateGameState(getSyncPayload());
    }

    // 结算阶段：结算后自动跳至夜晚（跳过能力/事件中间阶段）
    if (nextPhase === 'resolution') {
      console.log('📋 进入结算流程...');
      setTimeout(() => {
        resolveDay();
        if (isConnected) {
          console.log('📤 发送结算结果同步到服务器');
          updateGameState(getSyncPayload());
        }
        // 结算完成后用最新 store 状态推进到夜晚（不能用闭包里的旧 gameState）
        setTimeout(() => {
          const freshState = useGameStore.getState().gameState;
          if (!freshState) return;
          const nightState = { ...freshState, phase: 'night' as GamePhase };
          useGameStore.setState({ gameState: nightState });
          if (isConnected) {
            updateGameState(getSyncPayload());
          }
        }, 400);
      }, 1000);
    }
  };

  // 注册黎明自动推进回调（供 useEffect 使用）
  advanceFromDawnRef.current = () => advanceToPhase('mastermind_action');

  // 根据当前阶段决定下一步动作
  // 只有打牌阶段和夜晚阶段需要手动点击；其余阶段自动推进，不显示按钮
  const getNextAction = () => {
    switch (currentPhase) {
      case 'mastermind_action':
        return {
          label: '进入主人公行动',
          action: () => advanceToPhase('protagonist_action'),
          description: '主人公开始打出行动牌（最多3张）',
          operator: 'mastermind' as const,
        };
      case 'protagonist_action':
        return {
          label: '开始结算',
          action: () => advanceToPhase('resolution'),
          description: '翻开所有牌并结算效果',
          operator: 'protagonist' as const,
        };
      case 'night':
        return {
          label: '进入下一天',
          action: () => advanceToPhase('dawn'),
          description: '新的一天从黎明阶段开始',
          operator: 'mastermind' as const,
        };
      case 'loop_end':
        return {
          label: '开始新轮回',
          action: () => {
            const { endLoop } = useGameStore.getState();
            endLoop();
            if (isConnected) {
              setTimeout(() => {
                const newState = useGameStore.getState();
                updateGameState({
                  gameState: newState.gameState,
                  mastermindDeck: newState.mastermindDeck,
                  protagonistDeck: newState.protagonistDeck,
                  currentMastermindCards: [],
                  currentProtagonistCards: [],
                });
              }, 50);
            }
          },
          description: '事件触发，本轮回结束。开始新的轮回。',
          operator: 'any' as const,
        };
      default:
        // dawn / resolution / mastermind_ability / protagonist_ability / incident / game_over
        // 均自动推进，不显示推进按钮
        return { label: '', action: () => {}, description: '', operator: 'mastermind' as const };
    }
  };

  const nextAction = getNextAction();

  // 热座模式下所有推进按钮可用（同一设备操作）
  const canProceed = () => {
    if (isSpectator) return false;
    if (isHotseat) return true;
    if (nextAction.operator === 'any') return true;
    return nextAction.operator === playerRole;
  };

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* 当前阶段显示 */}
      <motion.div
        key={currentPhase}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "relative px-4 py-3 rounded-lg border-2 backdrop-blur-sm",
          currentPhaseColor
        )}
      >
        <div className="flex items-center gap-3">
          {PHASE_ICONS[currentPhase]}
          <div className="flex-1">
            <div className="font-bold text-lg">
              {currentPhase === 'game_over' 
                ? (isGameOver(gameState).winner === 'mastermind' ? '🎭 剧作家获胜' : '🦸 主人公获胜')
                : PHASE_NAMES[currentPhase]}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              第 {gameState.currentLoop} 轮回 · 第 {gameState.currentDay} 天
            </div>
          </div>
        </div>

        {/* 游戏结束特殊显示 */}
        {currentPhase === 'game_over' && (
          <>
            <div className="mt-3 p-3 bg-black/40 rounded border border-white/10 text-sm font-medium leading-relaxed italic text-center">
              "{isGameOver(gameState).reason}"
            </div>
            
            {/* 历史回放控制 */}
            {dayHistory.length > 0 && (
              <div className="mt-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <History size={14} className="text-doloris" />
                  <span className="text-sm font-medium text-slate-300">
                    {isViewingHistory 
                      ? `回放：第 ${historySnapshot?.loop} 轮回 · 第 ${historySnapshot?.day} 天`
                      : '回顾本局游戏历史'
                    }
                  </span>
                  {isViewingHistory && (
                    <button
                      onClick={exitHistoryView}
                      className="ml-auto p-1 hover:bg-slate-700 rounded"
                      title="退出回放"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewHistoryDay(Math.max(0, (currentHistoryIndex ?? dayHistory.length) - 1))}
                    disabled={currentHistoryIndex === 0}
                    className="p-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="上一天"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex-1 flex gap-1 justify-center">
                    {dayHistory.map((snapshot, idx) => (
                      <button
                        key={idx}
                        onClick={() => viewHistoryDay(idx)}
                        title={`第 ${snapshot.loop} 轮回 · 第 ${snapshot.day} 天`}
                        className={cn(
                          "w-6 h-6 rounded-full text-xs font-bold transition-all",
                          currentHistoryIndex === idx 
                            ? "bg-doloris text-black" 
                            : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                        )}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (currentHistoryIndex === null || currentHistoryIndex >= dayHistory.length - 1) {
                        exitHistoryView();
                      } else {
                        viewHistoryDay(currentHistoryIndex + 1);
                      }
                    }}
                    className="p-2 rounded bg-slate-700 hover:bg-slate-600"
                    title="下一天"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                {!isViewingHistory && (
                  <p className="text-xs text-slate-500 text-center mt-2">
                    点击数字查看每天结束时的状态
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* 阶段说明 */}
        {currentPhase === 'dawn' && (
          <div className="mt-2 text-sm opacity-90">
            ☀️ 所有亲友角色自动获得 +1 友好
          </div>
        )}
        {currentPhase === 'mastermind_action' && (
          <div className="mt-2 text-sm opacity-90">
            🎭 剧作家打出行动牌（最多3张，暗置）
          </div>
        )}
        {currentPhase === 'protagonist_action' && (
          <div className="mt-2 text-sm opacity-90">
            🦸 主人公打出行动牌（最多3张，暗置）
          </div>
        )}
        {currentPhase === 'resolution' && (
          <div className="mt-2 text-sm opacity-90">
            📋 翻开所有牌 → 移动 → 指示物
          </div>
        )}
        {currentPhase === 'incident' && (
          <div className="mt-2 text-sm opacity-90">
            ⚠️ 检查事件触发条件（不安≥上限）
          </div>
        )}
        {currentPhase === 'night' && (
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="text-slate-400 font-medium mb-1">请按顺序处理以下步骤：</div>
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-full bg-doloris/40 text-doloris flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">④</span>
              <span><strong className="text-doloris">翻牌结算</strong> — 已自动完成（移动 → 指示物叠加）</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-full bg-timoris/30 text-timoris flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">⑤</span>
              <span><strong className="text-timoris">剧作家身份能力</strong> — 主犯、传谣人等任意能力（手动调整指示物）</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-full bg-oblivionis/40 text-oblivionis flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">⑥</span>
              <span><strong className="text-oblivionis">主人公友好能力</strong> — 友好度达标的角色可由主人公发动</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-full bg-doloris/40 text-doloris flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">⑦</span>
              <span><strong className="text-doloris">事件检查</strong> — 确认当事人存活且不安 ≥ 上限后触发事件</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-full bg-mortis/35 text-mortis flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">⑧</span>
              <span><strong className="text-mortis">夜晚能力</strong> — 杀手、杀人狂等强制/任意能力（手动调整指示物）</span>
            </div>
          </div>
        )}
        {currentPhase === 'loop_end' && (
          <div className="mt-2 text-sm opacity-90">
            🔄 事件触发导致本轮回结束，点击开始新轮回
          </div>
        )}
      </motion.div>

      {/* 阶段推进按钮 — 仅打牌阶段和夜晚阶段显示 */}
      {nextAction.label && currentPhase !== 'game_over' && canProceed() && (
        <div className="flex flex-col gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            animate={isTutorial ? {
              boxShadow: [
                '0 0 0 0 rgba(250,204,21,0)',
                '0 0 20px 4px rgba(250,204,21,0.4)',
                '0 0 0 0 rgba(250,204,21,0)',
              ],
            } : undefined}
            transition={isTutorial ? {
              boxShadow: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
            } : undefined}
            onClick={nextAction.action}
            className={cn(
              "flex items-center justify-between gap-3 px-5 py-4 rounded-xl",
              "text-white font-black text-base tracking-wide shadow-xl transition-all",
              isTutorial
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-900 ring-2 ring-amber-300/60"
                : currentPhase === 'mastermind_action' || currentPhase === 'night'
                  ? "bg-timoris hover:bg-timoris/80 shadow-timoris/20"
                  : currentPhase === 'protagonist_action'
                    ? "bg-[#FF5522] hover:bg-[#ff6a3d] shadow-[#FF5522]/25"
                    : "bg-doloris hover:bg-doloris/80 shadow-doloris/20"
            )}
          >
            <span>{nextAction.label}</span>
            <ChevronRight className={cn("w-6 h-6", isTutorial && "text-slate-900")} />
          </motion.button>

          {nextAction.description && (
            <div className="text-xs text-slate-400 text-center">
              {nextAction.description}
            </div>
          )}

          {/* 复位按钮（仅夜晚阶段） */}
          {currentPhase === 'night' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                revertPhaseState();
                if (isConnected) {
                  setTimeout(() => {
                    updateGameState(getSyncPayload());
                  }, 50);
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm border border-slate-600 transition-all"
            >
              <RotateCcw size={14} />
              <span>复位到该阶段前</span>
            </motion.button>
          )}
        </div>
      )}

      {/* 对方行动提示（仅打牌阶段有效） */}
      {nextAction.label && !canProceed() && (
        <div className="px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-300 text-sm text-center">
          ⏳ 等待{playerRole === 'mastermind' ? '主人公' : '剧作家'}行动...
        </div>
      )}

      {/* 模式 + 当前视角（合并） */}
      <div className={cn(
        "px-3 py-2 rounded border space-y-2",
        isHotseat
          ? playerRole === 'mastermind'
            ? "bg-timoris/10 border-timoris/30"
            : "bg-oblivionis/10 border-oblivionis/30"
          : "bg-slate-800/50 border-slate-700"
      )}>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-bold",
            playerRole === 'mastermind' ? "text-timoris" : "text-oblivionis"
          )}>
            {playerRole === 'mastermind' ? '🎭 剧作家' : '🦸 主人公'}
          </span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
            {isHotseat ? '热座' : isConnected ? '联机中' : '离线'}
          </span>
        </div>
        
        {isConnected && !isHotseat && (
          <div className="flex flex-col gap-1 text-xs border-t border-slate-700 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-timoris">🎭 剧作家</span>
              <span className={players.mastermind.connected ? 'text-slate-300' : 'text-slate-600'}>
                {players.mastermind.connected ? players.mastermind.name || '未知' : '等待加入'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-oblivionis">🦸 主人公</span>
              <span className={players.protagonist.connected ? 'text-slate-300' : 'text-slate-600'}>
                {players.protagonist.connected ? players.protagonist.name || '未知' : '等待加入'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 底部危险操作区 — 统一灰色 */}
      <div className="mt-auto pt-3 border-t border-slate-700/50 space-y-2">
        <button
          data-tutorial-id="end-loop-btn"
          onClick={() => {
            if (confirm('确定要结束当前轮回吗？')) {
              const { endLoop } = useGameStore.getState();
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
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 text-sm transition-all border border-slate-700/50"
        >
          <RefreshCw size={14} />
          <span>结束当前轮回</span>
        </button>

        {playerRole === 'mastermind' && (
          <button
            onClick={() => {
              if (confirm('确定要重新开始游戏吗？所有进度将丢失。')) {
                if (isHotseat) {
                  useGameStore.getState().resetGame();
                } else {
                  resetGame();
                }
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 text-sm transition-all border border-slate-700/50"
          >
            <RotateCcw size={14} />
            <span>重新开始游戏</span>
          </button>
        )}
      </div>
    </div>
  );
}
