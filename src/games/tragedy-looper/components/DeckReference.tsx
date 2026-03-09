/*
 * @Author: cyanocitta
 * @Date: 2026-03-04 19:24:39
 * @LastEditTime: 2026-03-09 19:09:01
 * @FilePath: \tragedylooper\src\games\tragedy-looper\components\DeckReference.tsx
 * @Description: 
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X } from 'lucide-react';

const ONCE_PER_LOOP_CARDS = [
  {
    side: '剧作家' as const,
    color: 'text-timoris',
    cards: [
      { name: '斜向移动', effect: '角色斜向移动一格', type: '移动' },
      { name: '密谋+2', effect: '目标密谋+2', type: '密谋' },
    ],
  },
  {
    side: '主人公' as const,
    color: 'text-oblivionis',
    cards: [
      { name: '禁止移动', effect: '抵消对方移动牌效果', type: '移动' },
      { name: '友好+2', effect: '目标角色友好+2', type: '友好' },
      { name: '不安-1', effect: '目标角色不安-1', type: '不安' },
    ],
  },
];

const DECK_COMPOSITION = [
  {
    side: '剧作家',
    color: 'text-timoris',
    lines: [
      '移动: 斜向移动* / 横向移动 / 纵向移动',
      '友好: 禁止友好',
      '不安: +1×2 / -1 / 禁止不安',
      '密谋: +1 / +2*',
      '合计: 10 张',
    ],
  },
  {
    side: '主人公',
    color: 'text-oblivionis',
    lines: [
      '3 套基础牌: 禁止移动* / 横向 / 纵向 / 友好+1 / 友好+2* / 不安+1 / 不安-1*',
      '额外: 禁止密谋 ×1',
      '合计: 22 张（7×3 + 1）',
    ],
  },
] as const;

export function DeckReference() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-2 right-36 z-[95] h-8 flex items-center gap-1.5 px-2.5 bg-[#7799CC] border border-[#7799CC] rounded-lg hover:bg-[#6f8fc1] transition-colors"
        title="牌限"
      >
        <Layers size={14} className="text-white/90" />
        <span className="text-xs text-white/90">牌限</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="fixed top-12 right-36 z-[101] w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-doloris" />
                  <span className="font-bold text-sm">每轮回限用一次</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-800 rounded">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {ONCE_PER_LOOP_CARDS.map((group) => (
                  <div key={group.side}>
                    <div className={`text-xs font-bold mb-2 ${group.color}`}>
                      {group.side === '剧作家' ? '🎭' : '☀️'} {group.side}
                    </div>
                    <div className="space-y-1.5">
                      {group.cards.map((card) => (
                        <div key={card.name} className="flex items-baseline gap-2 text-sm">
                          <span className="text-white font-medium">{card.name}</span>
                          <span className="text-slate-500 text-xs">{card.effect}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-700/50">
                  <p className="text-[10px] text-slate-400 font-bold mb-2">牌库组成</p>
                  <div className="space-y-2">
                    {DECK_COMPOSITION.map((group) => (
                      <div key={group.side}>
                        <p className={`text-[10px] font-bold ${group.color}`}>
                          {group.side}
                        </p>
                        <div className="mt-0.5 space-y-0.5">
                          {group.lines.map((line) => (
                            <p key={line} className="text-[10px] text-slate-500 leading-tight">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/50 text-[10px] text-slate-500 space-y-0.5">
                  <p>• 其余手牌每天重置，可重复使用</p>
                  <p>• 主人公是3个人每个人有一张限定牌，可以同日打出，剧作家只有一次</p>
                  <p>• 每方每天出 3 张牌，这三张牌位置不能重复</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
