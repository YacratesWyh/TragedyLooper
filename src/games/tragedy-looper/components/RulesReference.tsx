'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  BookOpen, X, ChevronDown, ChevronRight,
  Maximize2, Lightbulb, Lock
} from 'lucide-react';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';
import type { PlayerRole } from '@/games/tragedy-looper/types';

// ===== 速查图片配置 =====

interface QuickRefImage {
  id: string;
  title: string;
  path: string;
  category?: string;
  visibleTo?: PlayerRole;
}

interface ScriptConfig {
  images: QuickRefImage[];
}

function getScriptAssetPath(tragedySet: string | undefined): string {
  return tragedySet === 'basic_tragedy' ? 'tl/btx' : 'tl/fs';
}

// ===== 剧情·身份速查（左栏内嵌） =====

export function RulesReference() {
  const [expanded, setExpanded] = useState(true);
  const [config, setConfig] = useState<ScriptConfig | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [mastermindUnlocked, setMastermindUnlocked] = useState(false);

  const gameState = useGameStore((s) => s.gameState);
  const localRole = useGameStore((s) => s.playerRole);
  const gameMode = useGameStore((s) => s.gameMode);
  const { myRole: multiplayerRole } = useMultiplayer();
  const isHotseat = gameMode === 'hotseat';
  const currentRole = isHotseat ? localRole : (multiplayerRole || localRole);

  useEffect(() => {
    if (isHotseat) setMastermindUnlocked(false);
  }, [currentRole, isHotseat]);

  const scriptAssetPath = useMemo(() => {
    return getScriptAssetPath(gameState?.publicInfo?.tragedySet);
  }, [gameState?.publicInfo?.tragedySet]);

  useEffect(() => {
    fetch(`/assets/${scriptAssetPath}/config.json`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load script config:', err));
  }, [scriptAssetPath]);

  const quickRefImages = useMemo(() => {
    if (!config) return [];
    return config.images.filter(img => img.category === 'quick-ref');
  }, [config]);

  const visibleImages = quickRefImages.filter(img => {
    if (!img.visibleTo) return true;
    if (isHotseat && img.visibleTo === 'mastermind' && !mastermindUnlocked) return false;
    return img.visibleTo === currentRole;
  });

  const lockedCount = isHotseat && currentRole === 'mastermind' && !mastermindUnlocked
    ? quickRefImages.filter(img => img.visibleTo === 'mastermind').length
    : 0;

  const getImagePath = (img: QuickRefImage) =>
    img.path.startsWith('/') ? img.path : `/assets/${scriptAssetPath}/${img.path}`;

  if (quickRefImages.length === 0) return null;

  return (
    <>
      <div className="border-t border-border-soft/70">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-2/50 transition-colors"
        >
          <BookOpen size={14} className="text-doloris shrink-0" />
          <span className="text-xs font-bold text-foreground flex-1 text-left">剧情 · 身份速查</span>
          {expanded
            ? <ChevronDown size={14} className="text-text-muted" />
            : <ChevronRight size={14} className="text-text-muted" />}
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                {visibleImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-md overflow-hidden border border-border-soft hover:border-doloris/40 cursor-pointer transition-all"
                    onClick={() => setZoomedImage(getImagePath(img))}
                  >
                    <div className="bg-surface-2 aspect-[4/3]">
                      <img
                        src={getImagePath(img)}
                        alt={img.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Maximize2 size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                    {img.visibleTo && (
                      <div className={cn(
                        "absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold",
                        img.visibleTo === 'mastermind'
                          ? "bg-timoris/60 text-timoris"
                          : "bg-oblivionis/60 text-oblivionis"
                      )}>
                        {img.visibleTo === 'mastermind' ? '剧作家' : '主人公'}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
                      <p className="text-[9px] text-white font-bold leading-tight">{img.title}</p>
                    </div>
                  </div>
                ))}
                </div>

                {/* 热座模式：剧作家专属内容需确认解锁 */}
                {lockedCount > 0 && (
                  <div className="mt-2 p-2 rounded-lg border border-dashed border-timoris/30 bg-timoris/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-timoris font-bold">
                      <Lock size={12} />
                      <span>{lockedCount} 张剧作家专属已隐藏</span>
                    </div>
                    <button
                      onClick={() => setMastermindUnlocked(true)}
                      className="w-full px-2 py-1.5 rounded bg-timoris hover:bg-timoris/80 text-white text-[11px] font-bold transition-colors"
                    >
                      确认查看
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 放大查看（全屏覆盖） */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 bg-surface-2/85 hover:bg-surface-3 text-white rounded-full transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <X size={24} />
            </button>
            <motion.img
              key={zoomedImage}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={zoomedImage}
              alt="速查大图"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ===== 进阶策略面板 =====

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-doloris">{icon}</span>
        <span className="font-bold flex-1 text-left">{title}</span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SupplementaryReference() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-2 right-28 z-[90] flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
        title="进阶策略"
      >
        <Lightbulb size={14} className="text-doloris" />
        <span className="text-xs text-slate-400">策略</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 z-[110]"
            />

            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              className="fixed top-0 left-0 h-full w-96 bg-slate-900 border-r border-slate-700 z-[120] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-gradient-to-r from-doloris/10 to-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Lightbulb className="text-doloris" size={24} />
                  <div>
                    <h3 className="font-bold text-lg">进阶策略</h3>
                    <p className="text-sm text-slate-400">信息公开规则 · 剧作家进阶</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <CollapsibleSection title="进阶策略" icon={<Lightbulb size={16} />} defaultOpen>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-oblivionis">☀️ 主人公策略</span>
                      <div className="flex-1 h-px bg-oblivionis/20" />
                    </div>

                    <div className="bg-oblivionis/10 rounded-lg p-3 border border-oblivionis/20">
                      <p className="text-xs text-slate-400 mb-2">目标是<strong className="text-white">活过最后一个轮回</strong>，而不是赢得第一个。</p>
                      <ul className="text-sm text-slate-300 space-y-1.5">
                        <li className="flex gap-2">
                          <span className="text-oblivionis shrink-0">▸</span>
                          <span><strong className="text-oblivionis">多试错，重视信息</strong>——每次失败都是情报。知道"第几步·什么结果"比本轮存活更有价值，下一轮才能针对性地防守。</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-oblivionis shrink-0">▸</span>
                          <span><strong className="text-oblivionis">不知道做什么？先刷好感</strong>——把友好指示物放到 NPC 身上，达到阈值后触发友好能力，获取更多线索或干预手段。</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-oblivionis shrink-0">▸</span>
                          <span>记录每一轮回剧作家在<strong className="text-doloris">哪一步</strong>宣告了什么结果，逐步缩小身份与当事人的可能范围。</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-timoris">🎭 剧作家策略</span>
                      <div className="flex-1 h-px bg-timoris/20" />
                    </div>

                    <div className="bg-doloris/10 rounded-lg p-3 border border-doloris/20">
                      <p className="text-xs font-medium text-doloris mb-2">📢 信息公开规则（强制）</p>
                      <p className="text-xs text-slate-400 mb-2">触发任何效果时，剧作家必须公告：</p>
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-400 font-bold">✓</span>
                          <span className="text-slate-300"><strong className="text-white">发生了什么</strong>（结果）</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-400 font-bold">✓</span>
                          <span className="text-slate-300"><strong className="text-white">发生在哪一步</strong>（阶段编号）</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-red-400 font-bold">✗</span>
                          <span className="text-slate-500 line-through">为什么发生（原因由主人公推理）</span>
                        </div>
                      </div>
                      <div className="bg-slate-800/60 rounded p-2 border border-slate-700/50 space-y-1">
                        <div className="text-xs text-green-400">✅ 正确：「第⑧步·夜晚：山田太郎死亡」</div>
                        <div className="text-xs text-red-400">❌ 错误：「因为杀人狂和山田太郎独处，山田太郎死亡」</div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">主人公可随时质询「发生在第几步」，必须如实回答。</p>
                    </div>

                    <div className="bg-timoris/10 rounded-lg p-3 border border-timoris/20">
                      <p className="text-xs text-slate-400 mb-2">策略一：用同一种方法在多个轮回中反复造成失败。</p>
                      <ul className="text-sm text-slate-300 space-y-1.5">
                        <li className="flex gap-2">
                          <span className="text-timoris shrink-0">▸</span>
                          <span>主人公每次失败后只会获知结果和阶段，<strong className="text-doloris">原因需要自己推理</strong>。重复的手法会让他们以为已经看穿你的套路。</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-timoris shrink-0">▸</span>
                          <span>当主人公将注意力集中于"熟悉的失败路径"时，在<strong className="text-timoris">关键轮回突然换手</strong>——他们来不及重新推理，轮回就耗尽了。</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-timoris/10 rounded-lg p-3 border border-timoris/20">
                      <p className="text-xs text-slate-400 mb-2">策略二：在同一阶段同时推进多条致胜路线。</p>
                      <ul className="text-sm text-slate-300 space-y-1.5">
                        <li className="flex gap-2">
                          <span className="text-timoris shrink-0">▸</span>
                          <span>前期用多个假动作让主人公疲于分散防守，消耗他们的行动牌和能力。</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-timoris shrink-0">▸</span>
                          <span>当多个失败条件同一阶段同时满足时，主人公只会被告知<strong className="text-doloris">「轮回结束」</strong>，而<strong className="text-timoris">无法得知是哪条线触发了结算</strong>——下一轮他们依然无从防起。</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
