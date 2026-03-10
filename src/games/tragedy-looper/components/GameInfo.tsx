import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/games/tragedy-looper/store';
import { Calendar, RotateCcw, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IncidentType } from '@/games/tragedy-looper/types';

const INCIDENT_NAMES: Record<IncidentType, string> = {
  murder: '谋杀案',
  suicide: '自杀',
  hospital_incident: '医院的事件',
  faraway_murder: '远距离杀人',
  anxiety_spread: '不安扩散',
  foul_play: '邪气污染',
  missing_person: '行踪不明',
  butterfly_effect: '蝴蝶效应',
  gossip: '流传',
};

const INCIDENT_EFFECTS: Record<IncidentType, string> = {
  murder: '与当事人位于同一区域的另外1名角色死亡。',
  suicide: '当事人死亡。',
  hospital_incident: '医院有1枚以上【密谋】，位于医院的所有角色死亡。',
  faraway_murder: '任意1名角色身上有2枚或以上【密谋】的角色死亡。',
  anxiety_spread: '与当事人位于同一区域的所有角色各+1【不安】。',
  foul_play: '当事人所在区域+2【密谋】。',
  missing_person: '当事人从版图上移除（视为死亡，但不触发死亡关联效果）。',
  butterfly_effect: '与当事人位于同一区域的1名角色+1【友好】或+1【密谋】（剧作家选择）。',
  gossip: '当事人所在区域的所有角色各+1【不安】。',
};

function highlightTokens(text: string) {
  return text.split(/(\【[^】]+\】)/).map((part, i) => {
    if (part.startsWith('【') && part.endsWith('】')) {
      const token = part.slice(1, -1);
      const colorMap: Record<string, string> = {
        '密谋': 'text-slate-200 bg-slate-600',
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

function IncidentRow({
  day,
  type,
  description,
  isToday,
  isPast,
  forceOpen = false,
}: {
  day: number;
  type: IncidentType;
  description: string;
  isToday: boolean;
  isPast: boolean;
  forceOpen?: boolean;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const name = INCIDENT_NAMES[type] ?? type;
  const effect = INCIDENT_EFFECTS[type];
  const open = forceOpen || isToday || manualOpen;

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden transition-colors',
      isToday  ? 'border-amoris/60 bg-amoris/10'
               : isPast ? 'border-slate-700/40 bg-slate-800/20 opacity-50'
               : 'border-slate-700/50 bg-slate-800/30',
    )}>
      {/* 日程行（始终可见） */}
      <button
        onClick={() => setManualOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
      >
        <span className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          isToday ? 'bg-amoris text-white' : 'bg-slate-700 text-slate-400',
        )}>
          {day}
        </span>
        <span className={cn('font-medium text-sm flex-1', isToday ? 'text-amoris' : 'text-slate-300')}>
          {name}
        </span>
        {isToday && <span className="text-amoris text-xs animate-pulse shrink-0">今日!</span>}
        {open
          ? <ChevronDown size={13} className="text-slate-500 shrink-0" />
          : <ChevronRight size={13} className="text-slate-500 shrink-0" />}
      </button>

      {/* 折叠内容：效果描述 */}
      {open && (
        <div className="px-3 pb-2.5 space-y-1">
          {effect && (
            <p className="text-xs text-slate-300 leading-relaxed">
              {highlightTokens(effect)}
            </p>
          )}
          {description && description !== effect && (
            <p className="text-xs text-slate-500 italic">{description}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function GameInfo() {
  const { gameState } = useGameStore();
  const [scheduleExpanded, setScheduleExpanded] = useState(true);
  const [highlightIncidentSchedule, setHighlightIncidentSchedule] = useState(false);

  useEffect(() => {
    const syncFromBody = () => {
      const shouldHighlight = document.body.dataset.tutorialHighlight === 'incident-schedule';
      setHighlightIncidentSchedule(shouldHighlight);
      if (shouldHighlight) {
        setScheduleExpanded(true);
      }
    };

    syncFromBody();
    const observer = new MutationObserver(syncFromBody);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-tutorial-highlight'],
    });

    return () => observer.disconnect();
  }, []);

  if (!gameState) return null;

  const { currentLoop, currentDay, publicInfo } = gameState;

  return (
    <div className="flex flex-col gap-4 p-4 bg-transparent">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-timoris to-oblivionis">
          惨剧轮回
        </h1>
        <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Tragedy Looper</p>
      </div>

      <div className="h-px bg-slate-700 w-full" />

      {/* 轮回 / 天数 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <RotateCcw size={14} />
            <span>轮回</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {currentLoop} <span className="text-sm text-slate-500 font-normal">/ {publicInfo.loops}</span>
          </div>
        </div>

        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Calendar size={14} />
            <span>天数</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {currentDay} <span className="text-sm text-slate-500 font-normal">/ {publicInfo.days}</span>
          </div>
        </div>
      </div>

      {/* 附加规则（过滤掉主线/支线前缀，只显示额外规则） */}
      {(() => {
        const extraRules = publicInfo.specialRules.filter(
          r => !r.startsWith('主线：') && !r.startsWith('支线：')
        );
        if (extraRules.length === 0) return null;
        return (
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info size={12} />
              附加规则
            </h3>
            {extraRules.map((rule, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-doloris/10 border border-doloris/30 text-sm text-doloris font-medium">
                {rule}
              </div>
            ))}
          </div>
        );
      })()}

      {/* 事件表 */}
      <div
        data-tutorial-id="incident-schedule"
        className={cn(
          'flex-1 min-h-0 rounded-lg',
          highlightIncidentSchedule && 'bg-amber-200/10'
        )}
      >
        <button
          onClick={() => setScheduleExpanded(v => !v)}
          className="w-full flex items-center justify-between px-0.5 py-0.5"
        >
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">事件日程</h3>
          {scheduleExpanded
            ? <ChevronDown size={13} className="text-slate-500 shrink-0" />
            : <ChevronRight size={13} className="text-slate-500 shrink-0" />}
        </button>
        {scheduleExpanded && (
          <div className="space-y-1.5">
            {publicInfo.incidentSchedule.map((incident, idx) => (
              <IncidentRow
                key={idx}
                day={incident.day}
                type={incident.type as IncidentType}
                description={incident.description}
                isToday={incident.day === currentDay}
                isPast={incident.day < currentDay}
                forceOpen={highlightIncidentSchedule}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
