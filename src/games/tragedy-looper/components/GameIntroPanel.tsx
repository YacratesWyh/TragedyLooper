'use client';

/**
 * 游戏简介面板 - 独立侧边栏组件
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronDown, ChevronRight, Image as ImageIcon, Maximize2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';
import type { PlayerRole } from '@/games/tragedy-looper/types';

export function GameIntroPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button - Fixed top-right */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed top-2 right-14 z-[90] flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-2/90 border border-border-soft rounded-lg hover:bg-surface-3 transition-colors backdrop-blur-sm"
        title="游戏简介"
      >
        <Sparkles size={14} className="text-timoris" />
        <span className="text-xs text-slate-400">简介</span>
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
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="fixed top-0 right-0 h-full w-96 bg-surface-1/95 border-l border-border-soft z-[120] shadow-2xl overflow-hidden flex flex-col backdrop-blur-md"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-timoris/15 to-surface-1 border-b border-border-soft p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-timoris" size={24} />
                  <div>
                    <h3 className="font-bold text-lg">🎭 惨剧轮回</h3>
                    <p className="text-sm text-slate-400">游戏简介与胜负条件</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-surface-3 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 剧情背景（含隐性设定的剧本化叙述） */}
                <div className="bg-gradient-to-br from-surface-2/90 to-surface-1/90 rounded-lg p-4 border border-border-soft space-y-5">
                  <p className="text-slate-300 leading-relaxed italic text-sm">
                    「这是一个被诅咒的小镇。每当惨剧发生，时间就会倒流，一切重来……
                    但记忆不会消失。主人公们必须在有限的轮回中找出真相，
                    阻止悲剧的发生——否则，他们将永远困在这个轮回之中。」
                  </p>

                  <p className="text-text-muted leading-relaxed text-sm border-t border-border-soft pt-4">
                    在这个世界里，<strong className="text-slate-300">主人公</strong>与<strong className="text-slate-300">剧作家</strong>都不会现身于版图之上；
                    舞台上行走的，唯有被命运摆布的<strong className="text-slate-300">NPC 角色</strong>。
                    当剧作家布下的<strong className="text-timoris">阴谋</strong>达成条件，或是<strong className="text-mortis">关键人物或主人公不幸死亡</strong>，
                    <strong className="text-doloris">轮回</strong>便会再次启动——时间倒流，一切重来，唯有记忆留存。
                  </p>
                </div>

                {/* 游戏构成 */}
                <div className="bg-surface-2/60 rounded-lg p-3 border border-border-soft/80 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">👥</span>
                    <span><strong className="text-timoris">1 名剧作家</strong> vs <strong className="text-oblivionis">1-3 名主人公</strong><span className="text-slate-500">（推荐 3 人共同推理，共用 3 张行动牌）</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">🗺️</span>
                    <span>版图为 <strong className="text-white">2×2 的 4 个地点</strong>，NPC角色分布在各地点中，双方可以使用移动牌按横/纵方向代领npc移动到指示地点</span>
                  </div>
                </div>

                {/* 我该怎么做 */}
                <div className="bg-gradient-to-br from-doloris/10 to-slate-900/50 rounded-lg p-4 border border-doloris/30">
                  <div className="font-bold text-doloris mb-3 text-lg">🤔 我该怎么做？</div>
                  
                  {/* 主人公策略 */}
                  <div className="bg-oblivionis/15 rounded-lg p-3 mb-3 border border-oblivionis/20">
                    <div className="font-bold text-oblivionis mb-2 flex items-center gap-2">
                      <span>☀️</span> 主人公<span className="font-normal text-xs text-slate-500">（多人共同决策）</span>
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1.5">
                      <li className="flex gap-2">
                        <span className="text-oblivionis">•</span>
                        <span>只要<strong className="text-doloris">迎来最后一天之后的黎明</strong>即获得胜利，但是剧作家不会如你所愿……</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-oblivionis">•</span>
                        <span><strong className="text-amoris">增加角色好感</strong>，解锁友好能力<span className="text-slate-500">（友好指示物达标后可发动）</span>获取更多信息</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-oblivionis">•</span>
                        <span>观察剧作家的行动，推理角色身份和事件当事人</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* 剧作家策略 */}
                  <div className="bg-timoris/15 rounded-lg p-3 border border-timoris/20">
                    <div className="font-bold text-timoris mb-2 flex items-center gap-2">
                      <span>🌑</span> 剧作家
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1.5">
                      <li className="flex gap-2">
                        <span className="text-timoris">•</span>
                        <span><strong className="text-doloris">尽量迷惑主人公</strong>，制造虚假线索</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-timoris">•</span>
                        <span>加入除了真实信息以外的<strong className="text-timoris">干扰信息</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-timoris">•</span>
                        <span>让主人公<strong className="text-slate-400">无法判断场上情况</strong>，消耗轮回次数</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 剧本规则强调 */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-400">📜 剧本规则：</span>
                    <span className="px-2 py-0.5 bg-timoris text-white font-bold rounded text-xs">主线</span>
                    <span className="text-white">1 个</span>
                    <span className="text-slate-600">+</span>
                    <span className="px-2 py-0.5 bg-oblivionis text-white font-bold rounded text-xs">支线</span>
                    <span className="text-white">1-2 个</span>
                  </div>
                </div>

                {/* 主人公胜利 */}
                <div className="bg-oblivionis/10 border border-oblivionis/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">☀️</span>
                    <span className="font-bold text-oblivionis text-lg">主人公胜利条件</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    在<strong className="text-oblivionis/80">任意一次轮回</strong>中，
                    撑到<strong className="text-doloris">最后一天结束</strong>时没有触发任何失败条件，即可打破轮回获胜。
                  </p>
                  <div className="mt-3 pt-3 border-t border-oblivionis/30">
                    <p className="text-sm text-timoris font-medium mb-2">⚠️ 通用失败条件：</p>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>• <strong className="text-timoris">关键人物死亡</strong>（立即结束当前轮回）</li>
                      <li>• <strong className="text-timoris">身份能力击杀</strong>：杀手/杀人狂等角色的强制效果</li>
                    </ul>
                    <p className="text-sm text-slate-500 font-medium mt-3 mb-1">📜 剧本特定失败条件<span className="font-normal">（因剧本而异）</span>：</p>
                    <ul className="text-sm text-slate-500 space-y-1">
                      <li>• 特定区域密谋≥2</li>
                      <li>• 挚友死亡时身份公开</li>
                      <li className="text-xs italic">详见速查面板中的剧本规则</li>
                    </ul>
                  </div>
                </div>

                {/* 剧作家胜利 */}
                <div className="bg-timoris/10 border border-timoris/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🌑</span>
                    <span className="font-bold text-timoris text-lg">剧作家胜利条件</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    在<strong className="text-timoris/80">所有轮回</strong>结束时，
                    主人公仍未能打破轮回，剧作家即获胜。
                  </p>
                  <p className="text-sm text-slate-400 mt-3">
                    💡 关键：让惨剧发生、触发失败条件、消耗主人公的轮回次数
                  </p>
                </div>

                {/* 轮回机制 */}
                <div className="bg-timoris/15 border border-timoris/30 rounded-lg p-4">
                  <div className="font-bold text-timoris mb-3 text-lg">⏳ 轮回机制</div>
                  <ul className="text-sm text-slate-400 space-y-2">
                    <li className="flex gap-2">
                      <span className="text-timoris">•</span>
                      <span>每次轮回，所有角色状态重置，但主人公保留记忆（推理信息）</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-timoris">•</span>
                      <span>剧作家的身份分配在所有轮回中保持不变</span>
                    </li>

                  </ul>
                </div>

                {/* 游戏流程图 */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <div className="font-bold text-slate-300 mb-3">🔄 每日流程</div>
                  <img
                    src="/assets/tl/GameLoop.png"
                    alt="游戏流程图"
                    className="w-full rounded-lg border border-slate-600/50"
                  />
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 font-bold">1</span>
                      <span className="text-slate-400"><strong className="text-slate-300">黎明</strong>准备开始新的轮回</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-timoris/30 text-timoris flex items-center justify-center shrink-0 font-bold">2</span>
                      <span className="text-slate-400"><strong className="text-timoris">剧作家</strong>暗置最多 3 张行动牌</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-oblivionis/30 text-oblivionis flex items-center justify-center shrink-0 font-bold">3</span>
                      <span className="text-slate-400"><strong className="text-oblivionis">主人公</strong>暗置最多 3 张行动牌</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-doloris/30 text-doloris flex items-center justify-center shrink-0 font-bold">4</span>
                      <span className="text-slate-400"><strong className="text-doloris">翻牌结算</strong> — 翻开所有牌，按优先级执行效果</span>
                    </div>
                    <div className="ml-7 border-l-2 border-slate-700 pl-3 space-y-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-timoris/20 text-timoris flex items-center justify-center shrink-0 text-[10px] font-bold">5</span>
                        <span className="text-slate-500"><strong className="text-timoris">剧作家身份能力</strong>（剧作家决定角色/身份被动效果触发，只说结算结果不说犯人、过程）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-oblivionis/20 text-oblivionis flex items-center justify-center shrink-0 text-[10px] font-bold">6</span>
                        <span className="text-slate-500"><strong className="text-oblivionis">主人公友好能力</strong>（友好度达标后可主动发动）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-yellow-600/20 text-yellow-500 flex items-center justify-center shrink-0 text-[10px] font-bold">7</span>
                        <span className="text-slate-500"><strong className="text-yellow-500">事件检查</strong>（当天有事件 + 当事人存活 + 不安达限）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-mortis/20 text-mortis flex items-center justify-center shrink-0 text-[10px] font-bold">8</span>
                        <span className="text-slate-500"><strong className="text-mortis">夜晚</strong>（杀手/杀人狂等角色的夜间能力）</span>
                      </div>
                    </div>
                    <p className="text-slate-600 italic pt-1">⚠️ 剧作家注意：5～8 各为独立步骤，请在对应步骤才宣告效果。</p>
                  </div>
                </div>

                {/* 事件触发条件 */}
                <div className="bg-timoris/15 border border-timoris/30 rounded-lg p-4">
                  <div className="font-bold text-timoris mb-3">⚡ 事件触发条件</div>
                  <p className="text-sm text-timoris/80 font-medium mb-2">事件发生必须同时满足：</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
                    <li>今天有该事件（事件日程表）</li>
                    <li>当事人存活</li>
                    <li>当事人的不安 ≥ 不安上限<span className="text-slate-500">（每个角色固有的阈值）</span></li>
                  </ol>
                  <p className="text-slate-400 text-xs mt-3 pt-2 border-t border-timoris/15">
                    三个条件缺一不可。
                  </p>
                  <div className="mt-2 space-y-1 text-slate-300">
                    <p className="text-xs"><span className="text-mortis">✓</span> 降低不安 → <strong>所有事件</strong>有效</p>
                    <p className="text-xs"><span className="text-oblivionis">✓</span> 移动当事人 → 仅对<strong>特定地点事件</strong>有效（如医院事故）</p>
                  </div>
                </div>

                {/* 指示物说明 */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <div className="font-bold text-slate-300 mb-3">🎯 指示物说明<span className="font-normal text-xs text-slate-500 ml-2">放在角色/地点上的标记</span></div>
                  <div className="space-y-3 text-sm">
                    <div className="bg-amoris/15 border border-amoris/30 rounded-lg p-3">
                      <div className="font-bold text-amoris mb-1">友好指示物</div>
                      <p className="text-slate-300">
                        主人公玩家可以放置。角色身上带有足够的友好指示物后，可以使用其友好能力。
                      </p>
                    </div>
                    <div className="bg-timoris/15 border border-timoris/30 rounded-lg p-3">
                      <div className="font-bold text-timoris mb-1">不安指示物</div>
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
                {/* 实体游戏图文参考（折叠） */}
                <ReferenceGallery />
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

// ===== 实体游戏图文参考 =====

interface RefImage {
  id: string;
  title: string;
  path: string;
  category?: string;
  visibleTo?: PlayerRole;
}

interface RefConfig {
  images: RefImage[];
}

function getScriptAssetPath(scriptName: string): string {
  if (scriptName.includes('Basic Tragedy') || scriptName.includes('基本悲剧')) {
    return 'tl/btx';
  }
  return 'tl/fs';
}

function ReferenceGallery() {
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<RefConfig | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const { myRole: multiplayerRole } = useMultiplayer();
  const localRole = useGameStore((s) => s.playerRole);
  const gameState = useGameStore((s) => s.gameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const isHotseat = gameMode === 'hotseat';
  const currentRole = isHotseat ? localRole : (multiplayerRole || localRole);

  const scriptAssetPath = useMemo(() => {
    if (gameState?.publicInfo?.scriptName) {
      return getScriptAssetPath(gameState.publicInfo.scriptName);
    }
    return 'tl/fs';
  }, [gameState?.publicInfo?.scriptName]);

  useEffect(() => {
    fetch(`/assets/${scriptAssetPath}/config.json`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load ref config:', err));
  }, [scriptAssetPath]);

  const refImages = useMemo(() => {
    if (!config) return [];
    return config.images.filter(img => img.category === 'reference');
  }, [config]);

  const visibleImages = refImages.filter(img => {
    if (!img.visibleTo) return true;
    return img.visibleTo === currentRole;
  });

  if (visibleImages.length === 0) return null;

  const getImagePath = (img: RefImage) => `/assets/${scriptAssetPath}/${img.path}`;

  return (
    <>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-800/50 transition-colors"
        >
          <ImageIcon size={16} className="text-slate-400" />
          <span className="font-bold text-slate-300 flex-1 text-left text-sm">实体游戏图文参考</span>
          <span className="text-xs text-slate-500">{visibleImages.length} 张</span>
          {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-slate-500">以下内容在游戏中已有体现，仅供还原实体游戏参考。</p>
                <div className="grid grid-cols-2 gap-2">
                  {visibleImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-doloris/40 cursor-pointer transition-all"
                      onClick={() => setZoomedImage(getImagePath(img))}
                    >
                      <div className={cn(
                        "bg-slate-800",
                        img.path.endsWith('.png') ? "aspect-[4/3]" : "aspect-[3/2]"
                      )}>
                        <img
                          src={getImagePath(img)}
                          alt={img.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Maximize2 size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
                        <p className="text-[10px] text-white font-medium truncate">{img.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 放大查看 */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={zoomedImage}
              alt="参考图片"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
