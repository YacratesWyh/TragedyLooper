'use client';

/**
 * 手牌信息面板 - 独立侧边栏组件（右侧）
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X, Eye, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HandCardInfo {
  type: 'movement' | 'goodwill' | 'anxiety' | 'intrigue';
  name: string;
  effect: string;
  oncePerLoop?: boolean;
}

const MASTERMIND_HAND: HandCardInfo[] = [
  { type: 'movement', name: '移动↑', effect: '纵向移动' },
  { type: 'movement', name: '移动→', effect: '横向移动' },
  { type: 'movement', name: '斜向移动', effect: '斜向移动', oncePerLoop: true },
  { type: 'anxiety', name: '不安+1', effect: '目标角色不安+1' },
  { type: 'anxiety', name: '不安+1', effect: '目标角色不安+1' },
  { type: 'anxiety', name: '不安-1', effect: '目标角色不安-1' },
  { type: 'anxiety', name: '禁止不安', effect: '抵消对方不安牌效果' },
  { type: 'goodwill', name: '禁止友好', effect: '抵消对方友好牌效果' },
  { type: 'intrigue', name: '密谋+1', effect: '目标密谋+1' },
  { type: 'intrigue', name: '密谋+2', effect: '目标密谋+2', oncePerLoop: true },
];

const PROTAGONIST_HAND: HandCardInfo[] = [
  { type: 'movement', name: '移动↑', effect: '纵向移动' },
  { type: 'movement', name: '移动→', effect: '横向移动' },
  { type: 'movement', name: '禁止移动', effect: '抵消对方移动牌效果', oncePerLoop: true },
  { type: 'goodwill', name: '友好+1', effect: '目标角色友好+1' },
  { type: 'goodwill', name: '友好+2', effect: '目标角色友好+2', oncePerLoop: true },
  { type: 'anxiety', name: '不安+1', effect: '目标角色不安+1' },
  { type: 'anxiety', name: '不安-1', effect: '目标角色不安-1', oncePerLoop: true },
  { type: 'intrigue', name: '禁止密谋', effect: '抵消对方密谋牌效果' },
];

const TYPE_COLORS: Record<string, string> = {
  movement: 'bg-emerald-900/50 border-emerald-700/50 text-emerald-300',
  goodwill: 'bg-pink-900/50 border-pink-700/50 text-pink-300',
  anxiety: 'bg-purple-900/50 border-purple-700/50 text-purple-300',
  intrigue: 'bg-slate-700/50 border-slate-600/50 text-slate-300',
};

const TYPE_NAMES: Record<string, string> = {
  movement: '移动',
  goodwill: '友好',
  anxiety: '不安',
  intrigue: '密谋',
};

function HandTable({ cards, title, color }: { cards: HandCardInfo[]; title: string; color: 'red' | 'blue' }) {
  const borderColor = color === 'red' ? 'border-red-800/50' : 'border-blue-800/50';
  const headerBg = color === 'red' ? 'bg-red-900/30' : 'bg-blue-900/30';
  const headerText = color === 'red' ? 'text-red-300' : 'text-blue-300';

  return (
    <div className={cn("rounded-lg border overflow-hidden", borderColor)}>
      <div className={cn("px-3 py-2 font-bold text-sm", headerBg, headerText)}>
        {title}手牌
      </div>
      <div className="divide-y divide-slate-700/50">
        {cards.map((card, idx) => (
          <div key={idx} className="px-3 py-2 flex items-center gap-2 hover:bg-slate-800/30 transition-colors">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] border font-medium shrink-0",
              TYPE_COLORS[card.type]
            )}>
              {TYPE_NAMES[card.type]}
            </span>
            <span className="font-medium text-white text-sm">{card.name}</span>
            <span className="text-xs text-slate-400 flex-1">{card.effect}</span>
            {card.oncePerLoop && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-900/50 text-amber-300 rounded border border-amber-700/50 shrink-0">
                每轮1次
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HandCardsPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button - Fixed on RIGHT side */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 translate-y-20 z-[90] px-2 py-3 bg-slate-800 border border-slate-700 border-r-0 rounded-l-lg hover:bg-slate-700 transition-colors flex flex-col items-center gap-1"
        title="手牌参考"
      >
        <Layers size={16} className="text-green-400" />
        <span className="text-[10px] text-slate-400">手牌</span>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 z-[110]"
            />
            
            {/* Panel Content - Slides from RIGHT */}
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="fixed top-0 right-0 h-full w-[420px] bg-slate-900 border-l border-slate-700 z-[120] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-l from-green-900/50 to-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Layers className="text-green-400" size={24} />
                  <div>
                    <h3 className="font-bold text-lg">手牌参考</h3>
                    <p className="text-sm text-slate-400">双方行动牌一览</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 剧作家手牌 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={16} className="text-red-400" />
                    <span className="font-bold text-red-300">剧作家 (红方)</span>
                  </div>
                  <HandTable cards={MASTERMIND_HAND} title="剧作家" color="red" />
                </div>

                {/* 主人公手牌 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={16} className="text-blue-400" />
                    <span className="font-bold text-blue-300">主人公 (蓝方)</span>
                  </div>
                  <HandTable cards={PROTAGONIST_HAND} title="主人公" color="blue" />
                  <p className="text-xs text-slate-500 mt-2 px-1">
                    💡 主人公方 1-3 人，每人各有一套完整的牌组
                  </p>
                </div>

                {/* 出牌规则说明 */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <div className="font-bold text-slate-300 mb-3">📋 出牌规则</div>
                  <ul className="text-sm text-slate-400 space-y-2">
                    <li className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      <span>每天每个角色/地点最多放置 <strong className="text-white">1张牌</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      <span>剧作家每天出 <strong className="text-white">3张牌</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      <span>每位主人公每天出 <strong className="text-white">3张牌</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      <span><strong className="text-amber-300">每轮1次</strong> 的牌用完本轮回就没了</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      <span><strong className="text-green-300">禁止牌</strong> 可以抵消同类型的对方效果</span>
                    </li>
                  </ul>
                </div>

                {/* 牌型颜色说明 */}
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-2">牌型分类：</div>
                  <div className="flex flex-wrap gap-2">
                    <span className={cn("px-2 py-1 rounded text-xs border", TYPE_COLORS.movement)}>
                      移动 - 控制角色位置
                    </span>
                    <span className={cn("px-2 py-1 rounded text-xs border", TYPE_COLORS.goodwill)}>
                      友好 - 友好指示物
                    </span>
                    <span className={cn("px-2 py-1 rounded text-xs border", TYPE_COLORS.anxiety)}>
                      不安 - 不安指示物
                    </span>
                    <span className={cn("px-2 py-1 rounded text-xs border", TYPE_COLORS.intrigue)}>
                      密谋 - 密谋指示物
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-slate-700 p-3 bg-slate-900/80 text-xs text-slate-500 text-center">
                First Steps (FS-01) 手牌配置
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
