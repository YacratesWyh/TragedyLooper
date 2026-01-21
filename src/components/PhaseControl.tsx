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
import { 
  Sunrise, 
  UserCircle, 
  Users, 
  CheckCircle, 
  Sparkles, 
  AlertTriangle, 
  Moon,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_ICONS: Record<GamePhase, React.ReactNode> = {
  dawn: <Sunrise className="w-5 h-5" />,
  mastermind_action: <UserCircle className="w-5 h-5" />,
  protagonist_action: <Users className="w-5 h-5" />,
  resolution: <CheckCircle className="w-5 h-5" />,
  ability: <Sparkles className="w-5 h-5" />,
  incident: <AlertTriangle className="w-5 h-5" />,
  night: <Moon className="w-5 h-5" />,
  game_over: <AlertTriangle className="w-5 h-5" />,
};

const PHASE_COLORS: Record<GamePhase, string> = {
  dawn: 'bg-amber-500/20 border-amber-500 text-amber-200',
  mastermind_action: 'bg-red-500/20 border-red-500 text-red-200',
  protagonist_action: 'bg-blue-500/20 border-blue-500 text-blue-200',
  resolution: 'bg-green-500/20 border-green-500 text-green-200',
  ability: 'bg-purple-500/20 border-purple-500 text-purple-200',
  incident: 'bg-orange-500/20 border-orange-500 text-orange-200',
  night: 'bg-indigo-500/20 border-indigo-500 text-indigo-200',
  game_over: 'bg-red-900/50 border-red-700 text-red-300',
};

// 阶段顺序
const PHASE_ORDER: GamePhase[] = [
  'dawn',
  'mastermind_action', 
  'protagonist_action',
  'resolution',
  'ability',
  'incident',
  'night',
];

export function PhaseControl() {
  const { gameState, playerRole, resolveDay } = useGameStore();
  const { isConnected, updateGameState } = useMultiplayer();

  if (!gameState) return null;

  const currentPhase = gameState.phase;
  const currentPhaseColor = PHASE_COLORS[currentPhase];

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
    
    const newGameState = {
      ...gameState,
      phase: nextPhase,
    };

    // 如果是进入新的一天，更新天数
    if (nextPhase === 'dawn' && currentPhase === 'night') {
      newGameState.currentDay = gameState.currentDay + 1;
    }

    // 更新本地状态
    useGameStore.setState({ gameState: newGameState });

    // 如果联机，同步到服务器
    if (isConnected) {
      console.log('📤 发送状态同步到服务器');
      updateGameState({ gameState: newGameState });
    } else {
      console.log('⚠️ 未联机，跳过同步');
    }

    // 结算阶段特殊处理
    if (nextPhase === 'resolution') {
      setTimeout(() => {
        resolveDay();
        // 结算后也同步
        if (isConnected) {
          const resolvedState = useGameStore.getState().gameState;
          if (resolvedState) {
            updateGameState({ gameState: resolvedState });
          }
        }
      }, 100);
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
        };
      case 'mastermind_action':
        return {
          label: '进入主人公行动',
          action: () => advanceToPhase('protagonist_action'),
          description: '主人公开始打出行动牌（最多3张）',
        };
      case 'protagonist_action':
        return {
          label: '开始结算',
          action: () => advanceToPhase('resolution'),
          description: '翻开所有牌并结算效果',
        };
      case 'resolution':
        return {
          label: '进入友好能力阶段',
          action: () => advanceToPhase('ability'),
          description: '玩家可以使用角色的友好能力',
        };
      case 'ability':
        return {
          label: '进入事件检查',
          action: () => advanceToPhase('incident'),
          description: '检查是否触发事件',
        };
      case 'incident':
        return {
          label: '进入夜晚阶段',
          action: () => advanceToPhase('night'),
          description: '杀手/杀人狂能力发动',
        };
      case 'night':
        return {
          label: '进入下一天',
          action: () => advanceToPhase('dawn'),
          description: '新的一天从黎明阶段开始',
        };
      case 'game_over':
        return {
          label: '游戏结束',
          action: () => {},
          description: '游戏已结束',
        };
      default:
        return {
          label: '继续',
          action: () => {},
          description: '',
        };
    }
  };

  const nextAction = getNextAction();

  // 在行动阶段，只有对应玩家能推进
  const canProceed = () => {
    if (currentPhase === 'mastermind_action' && playerRole !== 'mastermind') {
      return false;
    }
    if (currentPhase === 'protagonist_action' && playerRole !== 'protagonist') {
      return false;
    }
    return true;
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
              {PHASE_NAMES[currentPhase]}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              第 {gameState.currentLoop} 轮回 · 第 {gameState.currentDay} 天
            </div>
          </div>
        </div>

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
            📋 翻开所有牌 → 移动 → 指示物 → 角色被动
          </div>
        )}
        {currentPhase === 'ability' && (
          <div className="mt-2 text-sm opacity-90">
            ✨ 达到友好度要求的角色可以使用能力
          </div>
        )}
        {currentPhase === 'incident' && (
          <div className="mt-2 text-sm opacity-90">
            ⚠️ 检查事件触发条件（不安≥上限）
          </div>
        )}
        {currentPhase === 'night' && (
          <div className="mt-2 text-sm opacity-90">
            🌙 杀手/杀人狂能力发动
          </div>
        )}
      </motion.div>

      {/* 阶段推进按钮 */}
      {currentPhase !== 'game_over' && canProceed() && (
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
