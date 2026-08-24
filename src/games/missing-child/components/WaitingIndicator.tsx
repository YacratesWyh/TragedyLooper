'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { MissingChildGameState, PendingEffect } from '../types';

interface WaitingIndicatorProps {
  gameState: MissingChildGameState;
  currentPlayerIndex: number;
}

/** 获取效果描述 */
function getEffectDescription(effect: PendingEffect): string {
  switch (effect.type) {
    case 'aquarium_pick':
      return '水族馆效果：所有人选择一张牌';
    case 'river_pick':
      return '河效果：所有人选择一张牌给左手边玩家';
    case 'shrine_pick_target':
      return '神社效果：选择目标玩家';
    case 'discard_to_hand':
      return '回头效果：从弃牌堆选择一张牌';
    case 'pick_player_draw2':
      return '电话亭效果：选择一名玩家抽两张牌';
    case 'pick_player_swap_top':
      return '投币洗衣机效果：选择手牌与牌库顶交换';
    case 'convenience_store':
      return '便利店效果：从牌库顶三张中选择';
    case 'pick_player_draw1':
      return '分岔路效果：选择一名玩家抽牌';
    case 'transfer_all_maigo':
      return '小黑崎效果：将所有迷子交给一名玩家';
    case 'shrine_pick_target':
      return '神社效果：选择手牌最多的玩家';
    default:
      return '等待其他玩家操作...';
  }
}

/** 获取需要操作的玩家列表 */
function getWaitingPlayers(gameState: MissingChildGameState): number[] {
  const effect = gameState.pendingEffect;
  if (!effect) return [];

  const alivePlayers = gameState.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.alive);

  switch (effect.type) {
    case 'aquarium_pick':
    case 'river_pick': {
      // 需要所有存活玩家选择
      const selectedPlayers = Object.keys(effect.selections || {}).map(Number);
      return alivePlayers
        .filter(({ i }) => !selectedPlayers.includes(i))
        .map(({ i }) => i);
    }
    default:
      // 其他效果通常只需要当前回合玩家操作
      return [];
  }
}

/** 获取操作状态 */
function getPlayerStatus(
  gameState: MissingChildGameState,
  playerIndex: number
): 'waiting' | 'done' | 'not_needed' {
  const effect = gameState.pendingEffect;
  if (!effect) return 'not_needed';

  const player = gameState.players[playerIndex];
  if (!player.alive) return 'not_needed';

  switch (effect.type) {
    case 'aquarium_pick':
    case 'river_pick': {
      const hasSelected = effect.selections?.[playerIndex] !== undefined;
      return hasSelected ? 'done' : 'waiting';
    }
    default:
      // 其他效果由当前回合玩家处理
      return playerIndex === gameState.currentPlayerIndex ? 'waiting' : 'not_needed';
  }
}

export function WaitingIndicator({ gameState, currentPlayerIndex }: WaitingIndicatorProps) {
  if (!gameState.pendingEffect) return null;

  const effect = gameState.pendingEffect;
  const waitingPlayers = getWaitingPlayers(gameState);
  const isCurrentPlayerTurn = waitingPlayers.includes(currentPlayerIndex);
  const isMultiPlayerEffect = effect.type === 'aquarium_pick' || effect.type === 'river_pick';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4"
    >
      <div className="bg-stone-900/95 backdrop-blur-sm border border-amber-500/40 rounded-xl p-4 shadow-2xl">
        {/* 效果标题 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">
            {effect.type === 'aquarium_pick' ? '🐠' :
             effect.type === 'river_pick' ? '🌊' :
             effect.type === 'shrine_pick_target' ? '⛩️' :
             effect.type === 'discard_to_hand' ? '♻️' :
             effect.type === 'pick_player_draw2' ? '📞' :
             effect.type === 'pick_player_swap_top' ? '🔄' :
             effect.type === 'convenience_store' ? '🏪' :
             effect.type === 'pick_player_draw1' ? '🛤️' :
             effect.type === 'transfer_all_maigo' ? '🖤' :
             '✨'}
          </span>
          <span className="font-bold text-amber-300">{getEffectDescription(effect)}</span>
        </div>

        {/* 多人效果的等待状态 */}
        {isMultiPlayerEffect && (
          <div className="space-y-2">
            <p className="text-sm text-stone-400">玩家状态：</p>
            <div className="flex flex-wrap gap-2">
              {gameState.players.map((p, i) => {
                const status = getPlayerStatus(gameState, i);
                if (status === 'not_needed') return null;

                const isMe = i === currentPlayerIndex;
                return (
                  <motion.div
                    key={p.id}
                    initial={false}
                    animate={status === 'waiting' ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5
                      ${status === 'waiting' 
                        ? isMe 
                          ? 'bg-amber-500/30 text-amber-200 ring-1 ring-amber-400/50' 
                          : 'bg-stone-700/50 text-stone-400'
                        : 'bg-green-500/20 text-green-400'
                      }`}
                  >
                    <span>{p.name} {isMe ? '(你)' : ''}</span>
                    {status === 'waiting' ? (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    ) : (
                      <span>✓</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* 当前玩家操作提示 */}
            {isCurrentPlayerTurn && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
              >
                <p className="text-amber-200 text-sm font-medium">
                  👆 请从你的手牌中选择一张牌
                </p>
              </motion.div>
            )}

            {/* 等待其他人提示 */}
            {!isCurrentPlayerTurn && waitingPlayers.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 p-3 bg-stone-700/30 border border-stone-600/50 rounded-lg"
              >
                <p className="text-stone-400 text-sm">
                  ⏳ 等待 {waitingPlayers.map(i => gameState.players[i].name).join('、')} 选择...
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* 单人效果的状态 */}
        {!isMultiPlayerEffect && currentPlayerIndex !== gameState.currentPlayerIndex && (
          <div className="p-3 bg-stone-700/30 border border-stone-600/50 rounded-lg">
            <p className="text-stone-400 text-sm">
              ⏳ 等待 {gameState.players[gameState.currentPlayerIndex].name} 完成操作...
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** 简化版等待指示器（用于页面顶部固定位置） */
export function MiniWaitingIndicator({ gameState }: { gameState: MissingChildGameState }) {
  if (!gameState.pendingEffect) return null;

  const effect = gameState.pendingEffect;
  const waitingPlayers = getWaitingPlayers(gameState);
  const isMultiPlayerEffect = effect.type === 'aquarium_pick' || effect.type === 'river_pick';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600/20 border border-amber-500/40 rounded-full"
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-medium text-amber-300">
          {isMultiPlayerEffect 
            ? `${waitingPlayers.length > 0 
                ? `等待 ${waitingPlayers.length} 人选择` 
                : '所有人已选择'}
              ` 
            : '效果执行中...'}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
