'use client';

/**
 * 游戏简介面板 - 独立侧边栏组件
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, Sparkles } from 'lucide-react';

export function GameIntroPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button - Fixed on left side, below rules reference */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-0 top-1/2 translate-y-8 z-[90] px-2 py-3 bg-slate-800 border border-slate-700 border-l-0 rounded-r-lg hover:bg-slate-700 transition-colors flex flex-col items-center gap-1"
        title="游戏简介"
      >
        <Sparkles size={16} className="text-purple-400" />
        <span className="text-[10px] text-slate-400">简介</span>
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
            
            {/* Panel Content */}
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              className="fixed top-0 left-0 h-full w-96 bg-slate-900 border-r border-slate-700 z-[120] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900/50 to-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-purple-400" size={24} />
                  <div>
                    <h3 className="font-bold text-lg">🎭 惨剧轮回</h3>
                    <p className="text-sm text-slate-400">游戏简介与胜负条件</p>
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
                {/* 剧情背景 */}
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-lg p-4 border border-slate-600/50">
                  <p className="text-slate-300 leading-relaxed italic text-sm">
                    「这是一个被诅咒的小镇。每当惨剧发生，时间就会倒流，一切重来……
                    但记忆不会消失。主人公们必须在有限的轮回中找出真相，
                    阻止悲剧的发生——否则，他们将永远困在这个轮回之中。」
                  </p>
                </div>

                {/* 主人公胜利 */}
                <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">☀️</span>
                    <span className="font-bold text-blue-300 text-lg">主人公胜利条件</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    在<strong className="text-blue-200">任意一次轮回</strong>中，
                    平安存活到<strong className="text-amber-300">最后一天的夜晚结束</strong>，
                    看到轮回结束后的太阳升起，即可打破轮回获胜。
                  </p>
                  <div className="mt-3 pt-3 border-t border-blue-800/50">
                    <p className="text-sm text-red-400 font-medium mb-2">⚠️ 主人公失败条件：</p>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>• <strong className="text-red-300">关键人物死亡</strong>（强制，立即结束轮回）</li>
                      <li>• <strong className="text-red-300">剧情规则触发</strong>（轮回结束时检查）：</li>
                      <li className="pl-3 text-slate-500">- 特定区域密谋≥2（如学校、幕后黑手初始位置）</li>
                      <li className="pl-3 text-slate-500">- 挚友死亡时身份公开</li>
                      <li>• <strong className="text-red-300">身份能力</strong>：杀手/连环杀手的击杀效果</li>
                    </ul>
                    <p className="text-xs text-slate-500 mt-2 italic">
                      📋 FS剧本：主线1个 + 支线≤2个，具体规则见剧情速查
                    </p>
                  </div>
                </div>

                {/* 剧作家胜利 */}
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🌑</span>
                    <span className="font-bold text-red-300 text-lg">剧作家胜利条件</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    在<strong className="text-red-200">所有轮回</strong>结束时，
                    主人公仍未能打破轮回，剧作家即获胜。
                  </p>
                  <p className="text-sm text-slate-400 mt-3">
                    💡 关键：让惨剧发生、触发失败条件、消耗主人公的轮回次数
                  </p>
                </div>

                {/* 轮回机制 */}
                <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
                  <div className="font-bold text-purple-300 mb-3 text-lg">⏳ 轮回机制</div>
                  <ul className="text-sm text-slate-400 space-y-2">
                    <li className="flex gap-2">
                      <span className="text-purple-400">•</span>
                      <span>每次轮回，所有角色状态重置，但主人公保留记忆（推理信息）</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-purple-400">•</span>
                      <span>剧作家的身份分配在所有轮回中保持不变</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-purple-400">•</span>
                      <span>惨剧发生或关键人物死亡 → 当前轮回失败，进入下一轮回</span>
                    </li>
                  </ul>
                </div>

                {/* 游戏流程简述 */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <div className="font-bold text-slate-300 mb-3">📅 每日流程</div>
                  <ol className="text-sm text-slate-400 space-y-1.5">
                    <li><span className="text-amber-400">1. 黎明</span> - 新的一天开始</li>
                    <li><span className="text-red-400">2. 剧作家能力</span> - 使用身份能力</li>
                    <li><span className="text-red-400">3. 剧作家出牌</span> - 暗置行动牌</li>
                    <li><span className="text-blue-400">4. 主人公能力</span> - 使用友好能力</li>
                    <li><span className="text-blue-400">5. 主人公出牌</span> - 暗置行动牌</li>
                    <li><span className="text-green-400">6. 结算</span> - 翻开并结算所有牌</li>
                    <li><span className="text-orange-400">7. 事件</span> - 检查并处理当日事件</li>
                    <li><span className="text-slate-500">8. 夜晚</span> - 一天结束</li>
                  </ol>
                </div>

                {/* 事件触发条件 */}
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                  <div className="font-bold text-red-300 mb-3">⚡ 事件触发条件</div>
                  <p className="text-sm text-red-200 font-medium mb-2">事件发生必须同时满足：</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
                    <li>今天有该事件（事件日程表）</li>
                    <li>当事人存活</li>
                    <li>当事人的不安 ≥ 不安上限</li>
                  </ol>
                  <p className="text-slate-400 text-xs mt-3 pt-2 border-t border-red-900/50">
                    三个条件缺一不可。
                  </p>
                  <div className="mt-2 space-y-1 text-slate-300">
                    <p className="text-xs"><span className="text-green-400">✓</span> 降低不安 → <strong>所有事件</strong>有效</p>
                    <p className="text-xs"><span className="text-blue-400">✓</span> 移动当事人 → 仅对<strong>特定地点事件</strong>有效（如医院事故）</p>
                  </div>
                </div>

                {/* 指示物说明 */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <div className="font-bold text-slate-300 mb-3">🎯 指示物说明</div>
                  <div className="space-y-3 text-sm">
                    <div className="bg-pink-900/20 border border-pink-800/50 rounded-lg p-3">
                      <div className="font-bold text-pink-300 mb-1">友好指示物</div>
                      <p className="text-slate-300">
                        主人公玩家可以放置。角色身上带有足够的友好指示物后，可以使用其友好能力。
                      </p>
                    </div>
                    <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-3">
                      <div className="font-bold text-purple-300 mb-1">不安指示物</div>
                      <p className="text-slate-300">
                        双方玩家都可以放置。角色身上的不安指示物等于或超过其不安限度后，该角色可能会引发事件。
                      </p>
                    </div>
                    <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-3">
                      <div className="font-bold text-slate-300 mb-1">密谋指示物</div>
                      <p className="text-slate-300">
                        剧作家玩家可以放置。该指示物达到一定数量后，可能会由规则或者身份能力的效果导致主人公游戏失败。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-slate-700 p-3 bg-slate-900/80 text-xs text-slate-500 text-center">
                惨剧轮回 Tragedy Looper
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
