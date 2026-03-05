'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  BookOpen, X, ChevronDown, ChevronRight,
  AlertTriangle, Lightbulb,
  Image as ImageIcon, Maximize2, Lock
} from 'lucide-react';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';
import { FS01_BEGINNER_PUBLIC } from '@/games/tragedy-looper/scripts/fs-01';
import type { PlayerRole } from '@/games/tragedy-looper/types';

// ===== 身份数据 =====
interface RoleInfo {
  id: string;
  name: string;
  limit?: number;           // 不安上限增减
  ignoreGoodwill?: boolean; // 无视友好
  alwaysIgnore?: boolean;   // 必定无视友好
  timing: string;           // 触发时机
  effect: string;           // 效果描述
}

const ROLES: RoleInfo[] = [
  {
    id: 'key_person',
    name: '关键人物',
    timing: '强制',
    effect: '该角色死亡时，主人公失败，当前轮回立即结束。'
  },
  {
    id: 'killer',
    name: '杀手',
    ignoreGoodwill: true,
    timing: '任意能力：第⑧步·夜晚',
    effect: '同一区域1名关键人物身上有2枚或以上【密谋】→那名关键人物死亡。'
  },
  {
    id: 'brain',
    name: '主犯',
    ignoreGoodwill: true,
    timing: '任意能力：第⑤步·剧作家身份能力',
    effect: '对同一区域中任意1名角色身上，或者该角色所在的版图上放置1枚【密谋】。'
  },
  {
    id: 'cultist',
    name: '邪教徒',
    alwaysIgnore: true,
    timing: '任意能力：第④步·翻牌结算',
    effect: '可以无效化同一区域中任意角色身上和该角色所在版图上放置的禁止密谋。'
  },
  {
    id: 'conspiracy_theorist',
    name: '传谣人',
    limit: 1,
    timing: '任意能力：第⑤步·剧作家身份能力',
    effect: '对同一区域中任意1名角色身上放置1枚【不安】。'
  },
  {
    id: 'serial_killer',
    name: '杀人狂',
    timing: '强制：第⑧步·夜晚',
    effect: '若有1名角色与该角色位于同一区域→那名角色死亡。'
  },
  {
    id: 'ghost',
    name: '妖流',
    ignoreGoodwill: true,
    timing: '失败条件：轮回结束时',
    effect: '该卡牌为死亡状态，此时需要告知主人公该卡牌的身份。'
  },
  {
    id: 'friend',
    name: '亲友',
    limit: 2,
    timing: '强制：轮回开始时',
    effect: '该角色身份公开→在该角色身上放置1枚【友好】。'
  },
];

// ===== 事件数据 =====
type IncidentId = 'murder' | 'anxiety_spread' | 'suicide' | 'hospital_incident' | 'faraway_murder' | 'missing' | 'transfer';

interface IncidentInfo {
  id: IncidentId;
  name: string;
  effect: string;
}

const INCIDENTS: IncidentInfo[] = [
  {
    id: 'murder',
    name: '谋杀案',
    effect: '令犯人以外的1名和犯人处于同一区域的角色死亡。'
  },
  {
    id: 'anxiety_spread',
    name: '不安扩散',
    effect: '往任意1名角色身上放置2枚【不安】，随后往另外1名角色身上放置1枚【密谋】。'
  },
  {
    id: 'suicide',
    name: '自杀',
    effect: '犯人死亡。'
  },
  {
    id: 'hospital_incident',
    name: '医院的事件',
    effect: '医院有1枚及更多【密谋】→处于医院的所有角色死亡。医院有2枚及更多【密谋】→主角死亡。'
  },
  {
    id: 'faraway_murder',
    name: '远距离杀人',
    effect: '令1名放置有2枚及更多【密谋】的角色死亡。'
  },
  {
    id: 'missing',
    name: '行踪不明',
    effect: '将犯人移动至任意版图，随后往犯人所在版图放置1枚【密谋】。'
  },
  {
    id: 'transfer',
    name: '流传',
    effect: '移除任意1名角色身上2枚【友好】，随后往另外1名角色身上放置2枚【友好】。'
  },
];

// ===== 剧本速查组件 =====
interface ScriptImage {
  id: string;
  title: string;
  path: string;
  visibleTo?: PlayerRole; // 可选：限制可见性，undefined 表示所有人可见
}

interface ScriptConfig {
  images: ScriptImage[];
}

function ScriptReference() {
  const [config, setConfig] = useState<ScriptConfig | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // 优先使用多人游戏角色，回退到本地角色
  const { myRole: multiplayerRole } = useMultiplayer();
  const localRole = useGameStore((s) => s.playerRole);
  const currentRole = multiplayerRole || localRole;

  useEffect(() => {
    fetch('/assets/fs/config.json')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load script config:', err));
  }, []);

  if (!config || config.images.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-700 rounded-lg">
        暂无剧本图片数据
        <p className="mt-1">请在 public/assets/fs/config.json 中配置</p>
      </div>
    );
  }

  // 根据角色过滤可见图片
  const visibleImages = config.images.filter(img => {
    if (!img.visibleTo) return true; // 无限制，所有人可见
    return img.visibleTo === currentRole;
  });

  // 检测是否有隐藏图片（属于对方阵营）
  const hiddenCount = config.images.length - visibleImages.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {visibleImages.map((img) => (
          <div key={img.id} className="group relative">
            <div 
              className={cn(
                "aspect-[3/4] rounded-lg overflow-hidden border bg-slate-800 cursor-pointer transition-colors relative",
                img.visibleTo 
                  ? img.visibleTo === 'mastermind' 
                    ? "border-timoris/30 hover:border-timoris" 
                    : "border-oblivionis/30 hover:border-oblivionis"
                  : "border-slate-700 hover:border-doloris/50"
              )}
              onClick={() => setZoomedImage(`/assets/fs/${img.path}`)}
            >
              <img 
                src={`/assets/fs/${img.path}`} 
                alt={img.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* 角色专属标记 */}
              {img.visibleTo && (
                <div className={cn(
                  "absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold",
                  img.visibleTo === 'mastermind' 
                    ? "bg-timoris/50 text-timoris" 
                    : "bg-oblivionis/50 text-oblivionis"
                )}>
                  {img.visibleTo === 'mastermind' ? '剧作家' : '主人公'}
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs text-center text-slate-400 font-medium truncate" title={img.title}>
              {img.title}
            </p>
          </div>
        ))}
      </div>

      {/* 隐藏图片提示 */}
      {hiddenCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 px-2 py-1.5 bg-slate-800/30 rounded-lg border border-slate-700/30">
          <Lock size={12} />
          <span>还有 {hiddenCount} 张对方阵营专属卡牌</span>
        </div>
      )}

      {/* Zoomed Image Overlay */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <motion.button
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-6 right-6 p-2 bg-slate-800/50 hover:bg-slate-700 text-white rounded-full transition-colors"
            >
              <X size={24} />
            </motion.button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={zoomedImage}
              alt="Zoomed reference"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== 组件 =====
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

// 高亮指示物文本
function highlightTokens(text: string) {
  return text.split(/(\【[^】]+\】)/).map((part, i) => {
    if (part.startsWith('【') && part.endsWith('】')) {
      const token = part.slice(1, -1);
      const colorMap: Record<string, string> = {
        '密谋': 'text-slate-300 bg-slate-700',
        '不安': 'text-amoris bg-amoris/20',
        '友好': 'text-amoris bg-amoris/20',
      };
      return (
        <span key={i} className={cn('px-1 rounded text-xs font-bold', colorMap[token] || 'text-doloris')}>
          {token}
        </span>
      );
    }
    return part;
  });
}

/** 当前剧本的事件列表 */
function ScriptIncidents() {
  const gameState = useGameStore((state) => state.gameState);
  const publicInfo = gameState?.publicInfo ?? FS01_BEGINNER_PUBLIC;
  const currentDay = gameState?.currentDay ?? 1;
  
  // 获取当前剧本的事件类型
  const scriptIncidentTypes = publicInfo.incidentSchedule.map(i => i.type);
  
  // 当前剧本包含的事件
  const relevantIncidents = INCIDENTS.filter(i => scriptIncidentTypes.includes(i.id as typeof scriptIncidentTypes[number]));
  
  // 其他事件（当前剧本不存在）
  const otherIncidents = INCIDENTS.filter(i => !scriptIncidentTypes.includes(i.id as typeof scriptIncidentTypes[number]));
  
  return (
    <div className="space-y-3">
      {/* 事件时间表 */}
      <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-600/50">
        <div className="text-xs text-slate-400 mb-2">📅 事件日程</div>
        <div className="space-y-1">
          {publicInfo.incidentSchedule.map((schedule, i) => {
            const incidentInfo = INCIDENTS.find(inc => inc.id === schedule.type);
            const isToday = schedule.day === currentDay;
            const isPast = schedule.day < currentDay;
            
            return (
              <div 
                key={i}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-sm",
                  isToday && "bg-amoris/15 border border-amoris/30",
                  isPast && "opacity-50",
                  !isToday && !isPast && "bg-slate-700/30"
                )}
              >
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isToday ? "bg-amoris text-white" : "bg-slate-700 text-slate-400"
                )}>
                  {schedule.day}
                </span>
                <span className="font-medium">{incidentInfo?.name || schedule.type}</span>
                {isToday && <span className="ml-auto text-amoris text-xs animate-pulse">今日!</span>}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 当前剧本的事件详情 - 直接展开 */}
      {relevantIncidents.length > 0 && (
        <div className="space-y-2">
          {relevantIncidents.map(incident => (
            <div key={incident.id} className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-doloris" />
                <span className="font-bold text-white">{incident.name}</span>
              </div>
              <div className="text-sm text-slate-300 leading-relaxed">
                {highlightTokens(incident.effect)}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 其他事件（当前不存在）- 整体折叠 */}
      {otherIncidents.length > 0 && (
        <OtherIncidentsSection incidents={otherIncidents} />
      )}
    </div>
  );
}

/** 其他事件整体折叠区域 */
function OtherIncidentsSection({ incidents }: { incidents: IncidentInfo[] }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="mt-4 pt-3 border-t border-slate-700/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-slate-400 transition-colors py-1"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>🔒 其他事件（本剧本不存在）</span>
        <span className="text-slate-600">({incidents.length})</span>
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-2">
              {incidents.map(incident => (
                <div 
                  key={incident.id} 
                  className="bg-slate-800/20 rounded-lg border border-slate-700/30 p-2.5 opacity-60"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={12} className="text-slate-500" />
                    <span className="font-bold text-slate-400 text-sm">{incident.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    {highlightTokens(incident.effect)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export function RulesReference() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button - Fixed on left side, z-[90] to stay above character cards */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[90] px-2 py-3 bg-slate-800 border border-slate-700 border-l-0 rounded-r-lg hover:bg-slate-700 transition-colors flex flex-col items-center gap-1"
        title="规则速查"
      >
        <BookOpen size={16} className="text-doloris" />
        <span className="text-[10px] text-slate-400">速查</span>
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
              <div className="bg-gradient-to-r from-doloris/10 to-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-doloris" size={24} />
                  <div>
                    <h3 className="font-bold text-lg">First Steps 速查表</h3>
                    <p className="text-sm text-slate-400">事件 · 剧本图文</p>
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
              <div className="flex-1 overflow-y-auto">
                {/* 事件速查 */}
                <CollapsibleSection title="本剧本事件" icon={<AlertTriangle size={16} />} defaultOpen>
                  <ScriptIncidents />
                </CollapsibleSection>

                {/* 剧本速查 - 图片参考 */}
                <CollapsibleSection title="剧本图文速查" icon={<ImageIcon size={16} />} defaultOpen>
                  <ScriptReference />
                </CollapsibleSection>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-slate-700 p-3 bg-slate-900/80 text-xs text-slate-500 text-center">
                First Steps (FS-01) 初学者剧本
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ===== 补充内容面板（左下角）=====
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
                    {/* ── 主人公策略 ── */}
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

                    {/* ── 剧作家策略 ── */}
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
