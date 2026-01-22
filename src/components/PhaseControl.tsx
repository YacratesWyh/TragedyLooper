/**
 * 游戏阶段控制组件
 * 显示当前阶段并提供阶段推进按钮
 * 联机模式下通过 WebSocket 同步
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { GamePhase } from '@/types/game';
import { PHASE_NAMES } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { processDawnPhase, isGameOver } from '@/game/engine';
import { 
  Sunrise, 
  UserCircle, 
  Users, 
  CheckCircle, 
  Sparkles, 
  AlertTriangle, 
  Moon,
  ChevronRight,
  RotateCcw,
  RefreshCw
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

const PHASE_COLORS: Record<GamePhase, string> = {
  dawn: 'bg-amber-500/20 border-amber-500 text-amber-200',
  mastermind_action: 'bg-red-500/20 border-red-500 text-red-200',
  protagonist_action: 'bg-blue-500/20 border-blue-500 text-blue-200',
  resolution: 'bg-green-500/20 border-green-500 text-green-200',
  mastermind_ability: 'bg-red-500/20 border-red-400 text-red-200',
  protagonist_ability: 'bg-blue-500/20 border-blue-400 text-blue-200',
  incident: 'bg-orange-500/20 border-orange-500 text-orange-200',
  night: 'bg-indigo-500/20 border-indigo-500 text-indigo-200',
  loop_end: 'bg-purple-500/20 border-purple-500 text-purple-200',
  game_over: 'bg-red-900/50 border-red-700 text-red-300',
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
  const { gameState, resolveDay, revertPhaseState, takePhaseSnapshot } = useGameStore();
  const { isConnected, myRole, updateGameState } = useMultiplayer();

  if (!gameState) return null;

  const currentPhase = gameState.phase;
  const currentPhaseColor = PHASE_COLORS[currentPhase];
  
  // 使用 multiplayer 中的角色作为准则
  const playerRole = myRole;

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
      // 执行黎明阶段逻辑（亲友+1友好）
      newGameState = processDawnPhase(newGameState);
      newGameState.currentDay = gameState.currentDay + 1;
      
      // 检查主人公是否因生存天数足够而获胜
      const gameOverCheck = isGameOver(newGameState);
      if (gameOverCheck.isOver) {
        newGameState.phase = 'game_over';
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
      const syncPayload: any = { gameState: newGameState };
      
      // 如果是进入新的一天，同时重置卡牌
      if (nextPhase === 'dawn' && currentPhase === 'night') {
        const { mastermindDeck, protagonistDeck } = useGameStore.getState();
        syncPayload.currentMastermindCards = [];
        syncPayload.currentProtagonistCards = [];
        // 必须明确同步重置后的牌组状态（usedToday 设为空 Set，updateGameState 会自动序列化为数组）
        syncPayload.mastermindDeck = { ...mastermindDeck, usedToday: new Set() };
        syncPayload.protagonistDeck = { ...protagonistDeck, usedToday: new Set() };
      }
      
      updateGameState(syncPayload);
    }

    // 结算阶段特殊处理
    if (nextPhase === 'resolution') {
      console.log('📋 进入结算流程...');
      // 延迟一点结算，让玩家先看到牌翻开
      setTimeout(() => {
        resolveDay();
        // 结算完成后再次同步状态（包含最新的指示物数值）
        if (isConnected) {
          const resolvedState = useGameStore.getState().gameState;
          if (resolvedState) {
            console.log('📤 发送结算结果同步到服务器');
            updateGameState({ gameState: resolvedState });
          }
        }
      }, 1000); // 增加到 1 秒，让翻牌动画更明显
    }
  };

  // 根据当前阶段决定下一步动作
  const getNextAction = () => {
    switch (currentPhase) {
      case 'dawn':
        return {
          label: '进入剧作家行动',
          action: () => advanceToPhase('mastermind_action'),
          description: '剧作家开始打出行动牌（最多3张）',
          operator: 'any' as const,
        };
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
      case 'resolution':
        return {
          label: '进入剧作家能力阶段',
          action: () => advanceToPhase('mastermind_ability'),
          description: '剧作家点击指示物调整（角色能力）',
          operator: 'any' as const,
        };
      case 'mastermind_ability':
        return {
          label: '进入主人公能力阶段',
          action: () => advanceToPhase('protagonist_ability'),
          description: '主人公点击指示物调整（友好技能）',
          operator: 'mastermind' as const,
        };
      case 'protagonist_ability':
        return {
          label: '进入事件检查',
          action: () => advanceToPhase('incident'),
          description: '检查是否触发事件',
          operator: 'protagonist' as const,
        };
      case 'incident':
        return {
          label: '进入夜晚阶段',
          action: () => advanceToPhase('night'),
          description: '剧作家点击指示物调整（杀手等能力）',
          operator: 'any' as const,
        };
      case 'night':
        return {
          label: '进入下一天',
          action: () => advanceToPhase('dawn'),
          description: '新的一天从黎明阶段开始',
          operator: 'mastermind' as const,
        };
      case 'game_over':
        return {
          label: '游戏结束',
          action: () => {},
          description: '游戏已结束',
          operator: 'any' as const,
        };
      case 'loop_end':
        return {
          label: '开始新轮回',
          action: () => {
            // 重置到新轮回
            const { endLoop, gameState } = useGameStore.getState();
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
        return {
          label: '继续',
          action: () => {},
          description: '',
          operator: 'any' as const,
        };
    }
  };

  const nextAction = getNextAction();

  // 检查当前玩家是否能推进阶段
  const canProceed = () => {
    if (nextAction.operator === 'any') return true;
    return nextAction.operator === playerRole;
  };

  return (
    <div className="flex flex-col gap-3">
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
          <div className="mt-3 p-3 bg-black/40 rounded border border-white/10 text-sm font-medium leading-relaxed italic text-center">
            "{isGameOver(gameState).reason}"
          </div>
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
        {currentPhase === 'mastermind_ability' && (
          <div className="mt-2 text-sm opacity-90">
            🎭 剧作家点击指示物调整（角色能力）
          </div>
        )}
        {currentPhase === 'protagonist_ability' && (
          <div className="mt-2 text-sm opacity-90">
            ✨ 主人公点击指示物调整（友好技能）
          </div>
        )}
        {currentPhase === 'incident' && (
          <div className="mt-2 text-sm opacity-90">
            ⚠️ 检查事件触发条件（不安≥上限）
          </div>
        )}
        {currentPhase === 'night' && (
          <div className="mt-2 text-sm opacity-90">
            🌙 剧作家点击指示物调整（杀手等能力）
          </div>
        )}
        {currentPhase === 'loop_end' && (
          <div className="mt-2 text-sm opacity-90">
            🔄 事件触发导致本轮回结束，点击开始新轮回
          </div>
        )}
      </motion.div>

      {/* 阶段推进按钮 */}
      {currentPhase !== 'game_over' && canProceed() && (
        <div className="flex flex-col gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={nextAction.action}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3 rounded-lg",
              "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500",
              "text-white font-bold shadow-lg transition-all"
            )}
          >
            <span>{nextAction.label}</span>
            <ChevronRight className="w-5 h-5" />
          </motion.button>

          {/* 复位按钮：允许玩家撤销当前阶段的手动调整 */}
          {['resolution', 'mastermind_ability', 'protagonist_ability', 'incident', 'night'].includes(currentPhase) && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                revertPhaseState();
                if (isConnected) {
                  setTimeout(() => {
                    updateGameState({ gameState: useGameStore.getState().gameState });
                  }, 50);
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm border border-slate-600 transition-all shadow-md"
            >
              <RotateCcw size={14} />
              <span>复位到该阶段前</span>
            </motion.button>
          )}
        </div>
      )}

      {/* 对方行动提示 */}
      {!canProceed() && (
        <div className="px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-300 text-sm text-center">
          ⏳ 等待{playerRole === 'mastermind' ? '主人公' : '剧作家'}行动...
        </div>
      )}

      {/* 当前角色指示 */}
      <div className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800/50 border border-slate-700">
        <span className="text-xs text-slate-400">当前视角：</span>
        <span className={cn(
          "text-sm font-bold",
          playerRole === 'mastermind' ? "text-red-400" : "text-blue-400"
        )}>
          {playerRole === 'mastermind' ? '🎭 剧作家' : '🦸 主人公'}
        </span>
        {isConnected && (
          <span className="text-xs text-green-400 ml-auto">● 联机中</span>
        )}
      </div>

      {/* 阶段说明 */}
      {nextAction.description && canProceed() && (
        <div className="text-xs text-slate-400 text-center">
          {nextAction.description}
        </div>
      )}
    </div>
  );
}
