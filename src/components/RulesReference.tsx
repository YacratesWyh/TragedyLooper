'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  BookOpen, X, ChevronDown, ChevronRight,
  Skull, Users, Zap, Heart, Eye, AlertTriangle,
  Image as ImageIcon, Maximize2, Lock
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { FS01_BEGINNER_PUBLIC } from '@/game/scripts/fs-01';
import type { PlayerRole } from '@/types/game';

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
    timing: '任意能力：回合结束阶段',
    effect: '同一区域1名关键人物身上有2枚或以上【密谋】→那名关键人物死亡。'
  },
  {
    id: 'brain',
    name: '主犯',
    ignoreGoodwill: true,
    timing: '任意能力：作家能力阶段',
    effect: '对同一区域中任意1名角色身上，或者该角色所在的版图上放置1枚【密谋】。'
  },
  {
    id: 'cultist',
    name: '邪教徒',
    alwaysIgnore: true,
    timing: '任意能力：行动结算阶段',
    effect: '可以无效化同一区域中任意角色身上和该角色所在版图上放置的禁止密谋。'
  },
  {
    id: 'conspiracy_theorist',
    name: '传谣人',
    limit: 1,
    timing: '任意能力：作家能力阶段',
    effect: '对同一区域中任意1名角色身上放置1枚【不安】。'
  },
  {
    id: 'serial_killer',
    name: '杀人狂',
    timing: '强制：回合结束阶段',
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
    name: '杀放',
    effect: '与当事人位于同一区域的另外1名角色死亡。'
  },
  {
    id: 'anxiety_spread',
    name: '不安张贴',
    effect: '往任意1名角色身上放置2枚【不安】，随后往另外1名角色身上放置1枚【密谋】。'
  },
  {
    id: 'suicide',
    name: '自杀',
    effect: '当事人死亡。'
  },
  {
    id: 'hospital_incident',
    name: '医院事故',
    effect: '医院有1枚以上【密谋】，位于医院的所有角色死亡。'
  },
  {
    id: 'faraway_murder',
    name: '远距离杀人',
    effect: '任意1名角色身上有2枚或以上【密谋】的角色死亡。'
  },
  {
    id: 'missing',
    name: '失踪',
    effect: '将当事人移动至任意版图，随后往当事人所在版图放置1枚【密谋】。'
  },
  {
    id: 'transfer',
    name: '流动',
    effect: '从任意1名角色身上移除2枚【友好】，随后往另外1名角色身上放置2枚【友好】。'
  },
];

// ===== 角色数据 =====
interface CharacterInfo {
  id: string;
  name: string;
  anxietyLimit: number;
  goodwillAbility: string;
  goodwillRequired: number;
}

const CHARACTERS: CharacterInfo[] = [
  {
    id: 'boy_student',
    name: '男学生',
    anxietyLimit: 2,
    goodwillRequired: 2,
    goodwillAbility: '可以获取别的学生（女学生、巫女、偶像）来减少他/她的不安指示物。'
  },
  {
    id: 'girl_student',
    name: '女学生',
    anxietyLimit: 3,
    goodwillRequired: 2,
    goodwillAbility: '可以获取别的学生（男学生、巫女、偶像）来减少他/她的不安指示物，需要避免引发事件时或许用得上。'
  },
  {
    id: 'shrine_maiden',
    name: '巫女',
    anxietyLimit: 2,
    goodwillRequired: 5,
    goodwillAbility: '可以借助神力来直接揭露角色的身份，其效果非常强大，十分推荐使用。但是每轮只有3天，所以最多到5（只能+2,+2,+1）这很难达成，需注意。'
  },
  {
    id: 'office_worker',
    name: '职员',
    anxietyLimit: 2,
    goodwillRequired: 3,
    goodwillAbility: '随后说出自己的身份，触发条件较为轻松，而且基本都能接得有效讯息，因此也比较推荐。'
  },
  {
    id: 'idol',
    name: '偶像',
    anxietyLimit: 2,
    goodwillRequired: 3,
    goodwillAbility: '可以移除别人的不安指示物。友好度为4时可以让别人身上放置友好指示物。'
  },
  {
    id: 'doctor',
    name: '医生',
    anxietyLimit: 2,
    goodwillRequired: 2,
    goodwillAbility: '可以置信息，以此来除险或者增加别人的不安，但作家或许并非通过你们的做法都不是家所用，在确认他值得信赖之前，暂且不要放置友好指示物吧。'
  },
];

// ===== 手牌数据 =====
interface HandCardInfo {
  type: 'movement' | 'goodwill' | 'anxiety' | 'intrigue';
  name: string;
  effect: string;
  count?: number;
  oncePerLoop?: boolean;
}

const MASTERMIND_HAND: HandCardInfo[] = [
  { type: 'movement', name: '移动↑', effect: '纵向移动', count: 1 },
  { type: 'movement', name: '移动→', effect: '横向移动', count: 1 },
  { type: 'movement', name: '斜向移动', effect: '斜向移动', oncePerLoop: true },
  { type: 'anxiety', name: '不安+1', effect: '目标角色不安+1', count: 2 },
  { type: 'anxiety', name: '不安-1', effect: '目标角色不安-1', count: 1 },
  { type: 'anxiety', name: '禁止不安', effect: '抵消对方不安牌效果', count: 1 },
  { type: 'goodwill', name: '禁止友好', effect: '抵消对方友好牌效果', count: 1 },
  { type: 'intrigue', name: '密谋+1', effect: '目标密谋+1', count: 1 },
  { type: 'intrigue', name: '密谋+2', effect: '目标密谋+2', oncePerLoop: true },
];

const PROTAGONIST_HAND: HandCardInfo[] = [
  { type: 'movement', name: '移动↑', effect: '纵向移动', count: 1 },
  { type: 'movement', name: '移动→', effect: '横向移动', count: 1 },
  { type: 'movement', name: '禁止移动', effect: '抵消对方移动牌效果', oncePerLoop: true },
  { type: 'goodwill', name: '友好+1', effect: '目标角色友好+1', count: 1 },
  { type: 'goodwill', name: '友好+2', effect: '目标角色友好+2', oncePerLoop: true },
  { type: 'anxiety', name: '不安+1', effect: '目标角色不安+1', count: 1 },
  { type: 'anxiety', name: '不安-1', effect: '目标角色不安-1', oncePerLoop: true },
  { type: 'intrigue', name: '禁止密谋', effect: '抵消对方密谋牌效果', count: 1 },
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
                    ? "border-red-700/50 hover:border-red-500" 
                    : "border-blue-700/50 hover:border-blue-500"
                  : "border-slate-700 hover:border-amber-500/50"
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
                    ? "bg-red-900/80 text-red-200" 
                    : "bg-blue-900/80 text-blue-200"
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
        <span className="text-amber-400">{icon}</span>
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
        '不安': 'text-purple-300 bg-purple-900/50',
        '友好': 'text-pink-300 bg-pink-900/50',
      };
      return (
        <span key={i} className={cn('px-1 rounded text-xs font-bold', colorMap[token] || 'text-amber-300')}>
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
                  isToday && "bg-red-900/40 border border-red-700",
                  isPast && "opacity-50",
                  !isToday && !isPast && "bg-slate-700/30"
                )}
              >
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isToday ? "bg-red-600 text-white" : "bg-slate-700 text-slate-400"
                )}>
                  {schedule.day}
                </span>
                <span className="font-medium">{incidentInfo?.name || schedule.type}</span>
                {isToday && <span className="ml-auto text-red-400 text-xs animate-pulse">今日!</span>}
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
                <AlertTriangle size={14} className="text-amber-400" />
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

function HandTable({ cards, title }: { cards: HandCardInfo[]; title: string }) {
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-700">
            <th className="pb-2">牌名</th>
            <th className="pb-2">效果</th>
            <th className="pb-2 text-center">数量</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card, i) => (
            <tr key={i} className="border-b border-slate-800 last:border-b-0">
              <td className="py-2">
                <span className={cn(
                  'inline-flex items-center gap-1',
                  card.type === 'movement' && 'text-blue-400',
                  card.type === 'goodwill' && 'text-pink-400',
                  card.type === 'anxiety' && 'text-purple-400',
                  card.type === 'intrigue' && 'text-slate-300',
                )}>
                  {card.name}
                </span>
              </td>
              <td className="py-2 text-slate-400">{card.effect}</td>
              <td className="py-2 text-center">
                {card.oncePerLoop ? (
                  <span className="text-amber-400">1*</span>
                ) : (
                  card.count
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 mt-2">
        <span className="text-amber-400">*</span> = 每轮限一次
      </p>
    </div>
  );
}

export function RulesReference() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button - Fixed on left side */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 px-2 py-3 bg-slate-800 border border-slate-700 border-l-0 rounded-r-lg hover:bg-slate-700 transition-colors flex flex-col items-center gap-1"
        title="规则速查"
      >
        <BookOpen size={16} className="text-amber-400" />
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
              className="fixed inset-0 bg-black/60 z-40"
            />
            
            {/* Panel Content */}
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              className="fixed top-0 left-0 h-full w-96 bg-slate-900 border-r border-slate-700 z-50 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-900/50 to-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-amber-400" size={24} />
                  <div>
                    <h3 className="font-bold text-lg">First Steps 速查表</h3>
                    <p className="text-sm text-slate-400">规则、身份、事件</p>
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
                {/* 身份速查 */}
                <CollapsibleSection title="身份能力" icon={<Skull size={16} />} defaultOpen>
                  <div className="space-y-3">
                    {ROLES.map(role => (
                      <div key={role.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-white">{role.name}</span>
                          {role.limit && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                              上限+{role.limit}
                            </span>
                          )}
                          {role.ignoreGoodwill && (
                            <span className="text-xs px-1.5 py-0.5 bg-pink-900/50 text-pink-300 rounded">
                              无视友好
                            </span>
                          )}
                          {role.alwaysIgnore && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-900/50 text-red-300 rounded">
                              必定无视友好
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-amber-400 mb-1">{role.timing}</div>
                        <div className="text-sm text-slate-300 leading-relaxed">
                          {highlightTokens(role.effect)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* 事件速查 - 只显示当前剧本的事件 */}
                <CollapsibleSection title="本剧本事件" icon={<AlertTriangle size={16} />} defaultOpen>
                  <ScriptIncidents />
                </CollapsibleSection>

                {/* 剧本速查 - 图片参考 */}
                <CollapsibleSection title="剧本图文速查" icon={<ImageIcon size={16} />} defaultOpen>
                  <ScriptReference />
                </CollapsibleSection>

                {/* 角色速查 */}
                <CollapsibleSection title="角色能力" icon={<Users size={16} />}>
                  <div className="space-y-2">
                    {CHARACTERS.map(char => (
                      <div key={char.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-white">{char.name}</span>
                          <div className="flex gap-2 text-xs">
                            <span className="px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                              不安上限 {char.anxietyLimit}
                            </span>
                            <span className="px-1.5 py-0.5 bg-pink-900/50 text-pink-300 rounded">
                              友好≥{char.goodwillRequired}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-slate-400 leading-relaxed">
                          {char.goodwillAbility}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* 剧作家手牌 */}
                <CollapsibleSection title="剧作家手牌 (红)" icon={<Eye size={16} />}>
                  <HandTable cards={MASTERMIND_HAND} title="剧作家" />
                </CollapsibleSection>

                {/* 主人公手牌 */}
                <CollapsibleSection title="主人公手牌 (蓝)" icon={<Heart size={16} />}>
                  <HandTable cards={PROTAGONIST_HAND} title="主人公" />
                  <p className="text-xs text-slate-500 mt-2">
                    主人公方1-3人各有一套牌
                  </p>
                </CollapsibleSection>

                {/* 事件触发条件 */}
                <CollapsibleSection title="事件触发条件" icon={<Zap size={16} />}>
                  <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 text-sm space-y-2">
                    <p className="text-red-300 font-bold">事件发生必须同时满足：</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300">
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
                </CollapsibleSection>

                {/* 友好指示物说明 */}
                <CollapsibleSection title="指示物说明" icon={<Heart size={16} />}>
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
