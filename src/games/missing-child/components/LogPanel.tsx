'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import type { MissingChildGameState, LogEntry } from '../types';
import { ScrollText, X } from 'lucide-react';

interface LogPanelProps {
  gameState: MissingChildGameState;
  currentPlayerIndex: number;
}

/** 获取日志类型对应的图标 */
function getLogIcon(type: LogEntry['type']): string {
  switch (type) {
    case 'turn_start':
      return '🎲';
    case 'turn_skip':
      return '⏭️';
    case 'draw_from_left':
      return '👈';
    case 'draw_from_deck':
      return '📚';
    case 'play_card':
      return '🃏';
    case 'card_effect':
      return '✨';
    case 'extra_action':
      return '⚡';
    case 'bad_end':
      return '💀';
    case 'happy_end':
      return '🌟';
    case 'game_end':
      return '🏁';
    default:
      return '📝';
  }
}

/** 获取日志类型对应的颜色 */
function getLogColor(type: LogEntry['type']): string {
  switch (type) {
    case 'turn_start':
      return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    case 'turn_skip':
      return 'text-stone-400 border-stone-500/30 bg-stone-500/10';
    case 'draw_from_left':
    case 'draw_from_deck':
      return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    case 'play_card':
      return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    case 'card_effect':
      return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
    case 'extra_action':
      return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    case 'bad_end':
      return 'text-red-400 border-red-500/30 bg-red-500/10';
    case 'happy_end':
      return 'text-green-400 border-green-500/30 bg-green-500/10';
    case 'game_end':
      return 'text-stone-400 border-stone-500/30 bg-stone-500/10';
    default:
      return 'text-stone-400 border-stone-500/30 bg-stone-500/10';
  }
}

/** 单条日志条目 */
function LogItem({ log, isCurrentPlayer }: { log: LogEntry; isCurrentPlayer: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded-lg border text-sm ${getLogColor(log.type)} ${
        isCurrentPlayer ? 'ring-1 ring-current/30' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">{getLogIcon(log.type)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-tight">{log.message}</p>
          {log.detail && (
            <div className="mt-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs opacity-70 hover:opacity-100 underline"
              >
                {expanded ? '收起' : '详情'}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-1 text-xs opacity-80 whitespace-pre-wrap overflow-hidden"
                  >
                    {log.detail}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}
          <p className="text-xs opacity-50 mt-1">
            第{log.round + 1}轮 第{log.turn ?? '?'}回合 · {new Date(log.timestamp).toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/** 日志面板 */
export function LogPanel({ gameState, currentPlayerIndex }: LogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true);

  // 自动滚动到最新日志
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.logs, isOpen]);

  const logs = gameState.logs;

  // 移动端：底部抽屉式
  // 桌面端：右侧固定面板
  return (
    <>
      {/* 桌面端：右侧固定面板 */}
      <div className="hidden lg:block fixed right-0 top-0 bottom-0 w-80 z-30">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 bg-stone-900/95 backdrop-blur-sm border-l border-stone-700/50 flex flex-col"
            >
              {/* 标题栏 */}
              <div className="flex items-center justify-between p-4 border-b border-stone-700/50">
                <div className="flex items-center gap-2">
                  <ScrollText size={18} className="text-amber-400" />
                  <h3 className="font-bold text-stone-200">游戏日志</h3>
                  <span className="text-xs text-stone-500">({logs.length})</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-stone-700/50 rounded-lg transition-colors"
                >
                  <X size={18} className="text-stone-400" />
                </button>
              </div>

              {/* 日志列表 */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent"
              >
                {logs.length === 0 ? (
                  <p className="text-center text-stone-500 text-sm py-8">
                    游戏开始，等待第一个行动...
                  </p>
                ) : (
                  logs.map((log) => (
                    <LogItem
                      key={log.id}
                      log={log}
                      isCurrentPlayer={log.playerIndex === currentPlayerIndex}
                    />
                  ))
                )}
              </div>

              {/* 底部信息 */}
              <div className="p-3 border-t border-stone-700/50 text-xs text-stone-500">
                当前: 第 {gameState.round + 1} 轮 · {gameState.players[gameState.currentPlayerIndex]?.name} 的回合
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 展开按钮 */}
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsOpen(true)}
            className="absolute right-4 top-4 p-3 bg-stone-800/90 hover:bg-stone-700/90 border border-stone-600/50 rounded-full shadow-lg transition-colors"
          >
            <ScrollText size={20} className="text-amber-400" />
            {logs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-stone-900 text-xs font-bold rounded-full flex items-center justify-center">
                {logs.length > 9 ? '9+' : logs.length}
              </span>
            )}
          </motion.button>
        )}
      </div>

      {/* 移动端：底部抽屉 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-stone-900/95 backdrop-blur-sm border-t border-stone-700/50 max-h-[60vh] flex flex-col"
            >
              {/* 拖动条 / 标题栏 */}
              <div 
                className="flex items-center justify-between p-3 border-b border-stone-700/50"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1 bg-stone-600 rounded-full mx-auto" />
                </div>
                <div className="flex items-center gap-2">
                  <ScrollText size={16} className="text-amber-400" />
                  <span className="font-bold text-stone-200 text-sm">游戏日志</span>
                  <span className="text-xs text-stone-500">({logs.length})</span>
                </div>
                <button className="p-1">
                  <X size={18} className="text-stone-400" />
                </button>
              </div>

              {/* 日志列表 */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-2"
              >
                {logs.length === 0 ? (
                  <p className="text-center text-stone-500 text-sm py-4">
                    游戏开始，等待第一个行动...
                  </p>
                ) : (
                  [...logs].reverse().map((log) => (
                    <LogItem
                      key={log.id}
                      log={log}
                      isCurrentPlayer={log.playerIndex === currentPlayerIndex}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 展开按钮 */}
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsOpen(true)}
            className="absolute right-4 bottom-4 p-3 bg-stone-800/90 hover:bg-stone-700/90 border border-stone-600/50 rounded-full shadow-lg transition-colors"
          >
            <ScrollText size={20} className="text-amber-400" />
            {logs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-stone-900 text-xs font-bold rounded-full flex items-center justify-center">
                {logs.length > 9 ? '9+' : logs.length}
              </span>
            )}
          </motion.button>
        )}
      </div>
    </>
  );
}

/** 简化的日志按钮（用于空间有限的场景） */
export function LogButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800/50 hover:bg-stone-700/50 border border-stone-600/30 rounded-lg text-xs text-stone-400 hover:text-stone-200 transition-colors"
    >
      <ScrollText size={14} />
      <span>日志</span>
      {count > 0 && (
        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-[10px]">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
