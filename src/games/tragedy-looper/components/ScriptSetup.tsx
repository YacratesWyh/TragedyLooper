/**
 * 开局设置 - 剧本选择组件
 * 仅剧作家可见，用于选择脚本和查看角色配置
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Users, Calendar, AlertTriangle, ChevronRight,
  Check, Plus, Trash2, Sparkles, ArrowLeft, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCRIPT_TEMPLATES, type ScriptTemplate } from '@/games/tragedy-looper/scripts/registry';
import { ALL_CHARACTERS } from '@/games/tragedy-looper/scripts/characters';
import { CHARACTER_NAMES, type CharacterId, type IncidentType } from '@/games/tragedy-looper/types';

interface ScriptSetupProps {
  onSelect: (script: ScriptTemplate) => void;
  onCancel?: () => void;
}

/** 事件类型显示名称 */
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

/** 难度标签颜色 */
const DIFFICULTY_COLORS = {
  beginner: 'bg-mortis/10 text-mortis border-mortis/30',
  intermediate: 'bg-doloris/10 text-doloris border-doloris/30',
  advanced: 'bg-amoris/10 text-amoris border-amoris/30',
};

const DIFFICULTY_NAMES = {
  beginner: '入门',
  intermediate: '中级',
  advanced: '高级',
};

/** 悲剧配置标签 */
const TRAGEDY_SET_STYLES = {
  first_steps: {
    name: 'First Steps',
    shortName: 'FS',
    className: 'bg-mortis/10 text-mortis border-mortis/30',
  },
  basic_tragedy: {
    name: 'Basic Tragedy X',
    shortName: 'BTX',
    className: 'bg-timoris/10 text-timoris border-timoris/30',
  },
};

interface CustomIncidentConfig {
  day: number;
  type: IncidentType;
}

interface CustomScriptForm {
  tragedySet: 'first_steps' | 'basic_tragedy';
  loops: number;
  days: number;
  characters: CharacterId[];
  incidents: CustomIncidentConfig[];
}

const DEFAULT_CUSTOM_SCRIPT: CustomScriptForm = {
  tragedySet: 'first_steps',
  loops: 3,
  days: 4,
  characters: ['boy_student', 'girl_student', 'shrine_maiden', 'detective', 'office_worker', 'doctor'],
  incidents: [{ day: 2, type: 'murder' }],
};

const INCIDENT_OPTIONS: Array<{ value: IncidentType; label: string }> = [
  { value: 'murder', label: '谋杀案' },
  { value: 'suicide', label: '自杀' },
  { value: 'hospital_incident', label: '医院的事件' },
  { value: 'faraway_murder', label: '远距离杀人' },
  { value: 'anxiety_spread', label: '不安扩散' },
  { value: 'foul_play', label: '邪气污染' },
  { value: 'missing_person', label: '行踪不明' },
  { value: 'butterfly_effect', label: '蝴蝶效应' },
  { value: 'gossip', label: '流传' },
];

type Step = 'list' | 'customConfig';

export function ScriptSetup({ onSelect, onCancel }: ScriptSetupProps) {
  const [step, setStep] = useState<Step>('list');
  const [selectedScript, setSelectedScript] = useState<ScriptTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSet, setFilterSet] = useState<'all' | 'first_steps' | 'basic_tragedy'>('all');
  const [customScript, setCustomScript] = useState<CustomScriptForm>(DEFAULT_CUSTOM_SCRIPT);

  // ── 列表步骤：确认按钮 ──────────────────────────────────────────
  const handleListConfirm = () => {
    if (!selectedScript) return;
    if (selectedScript.isCustom) {
      setStep('customConfig');
    } else {
      onSelect(selectedScript);
    }
  };

  // ── 自定义配置步骤：生成剧本 ────────────────────────────────────
  const handleGenerateCustom = () => {
    if (!selectedScript) return;
    if (customScript.characters.length === 0) {
      alert('请至少选择 1 名登场角色');
      return;
    }
    const loops = Math.max(1, Math.min(8, customScript.loops));
    const days = Math.max(1, Math.min(14, customScript.days));
    const sortedIncidents = customScript.incidents
      .map(inc => ({ day: Math.max(1, Math.min(days, inc.day)), type: inc.type }))
      .sort((a, b) => a.day - b.day);

    onSelect({
      ...selectedScript,
      name: `自定义自由剧本 (${customScript.tragedySet === 'first_steps' ? 'FS' : 'BTX'})`,
      nameEn: `Custom Freeplay (${customScript.tragedySet === 'first_steps' ? 'FS' : 'BTX'})`,
      tragedySet: customScript.tragedySet,
      loops: String(loops),
      days,
      characters: customScript.characters,
      incidents: sortedIncidents,
      mainPlot: customScript.tragedySet === 'first_steps' ? 'FS 自由配置' : 'BTX 自由配置',
      subPlot: '自由游玩',
      specialRules: ['自定义剧本：角色/轮回/天数/事件日程由你决定'],
    });
  };

  const toggleCharacter = (characterId: CharacterId) => {
    setCustomScript(prev => {
      const exists = prev.characters.includes(characterId);
      return {
        ...prev,
        characters: exists
          ? prev.characters.filter(id => id !== characterId)
          : [...prev.characters, characterId],
      };
    });
  };

  const updateIncident = (index: number, patch: Partial<CustomIncidentConfig>) => {
    setCustomScript(prev => ({
      ...prev,
      incidents: prev.incidents.map((inc, i) => (i === index ? { ...inc, ...patch } : inc)),
    }));
  };

  const addIncident = () => {
    setCustomScript(prev => ({
      ...prev,
      incidents: [...prev.incidents, { day: prev.days, type: 'murder' }],
    }));
  };

  const removeIncident = (index: number) => {
    setCustomScript(prev => ({
      ...prev,
      incidents: prev.incidents.filter((_, i) => i !== index),
    }));
  };

  // 根据选择的悲剧配置过滤脚本
  const filteredScripts = filterSet === 'all'
    ? SCRIPT_TEMPLATES
    : SCRIPT_TEMPLATES.filter(s => s.isCustom || s.tragedySet === filterSet);

  // ══════════════════════════════════════════════════════════════
  //  步骤二：自定义剧本配置界面
  // ══════════════════════════════════════════════════════════════
  if (step === 'customConfig') {
    const setLabel = customScript.tragedySet === 'first_steps' ? 'FS' : 'BTX';
    return (
      <div className="min-h-screen rendered-dark-bg">
        {/* 顶部导航栏 */}
        <div className="sticky top-0 z-10 bg-shell-bg/90 backdrop-blur border-b border-border-soft px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setStep('list')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">返回选择</span>
            </button>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-px h-5 bg-border-soft" />
              <Sparkles className="w-5 h-5 text-oblivionis" />
              <h1 className="text-lg font-black text-white">自定义剧本配置</h1>
            </div>
            <button
              onClick={handleGenerateCustom}
              disabled={customScript.characters.length === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-white font-bold transition-all shadow-lg',
                customScript.characters.length === 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-oblivionis hover:bg-oblivionis/85 shadow-oblivionis/25'
              )}
            >
              <Wand2 className="w-4 h-4" />
              生成剧本
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8 pb-24">

          {/* ── 区域 1：基础参数 ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">基础参数</h2>
            <div className="grid grid-cols-3 gap-4">
              {/* 悲剧配置 */}
              <div className="col-span-1 bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">悲剧配置</label>
                <div className="flex flex-col gap-2 mt-1">
                  {(['first_steps', 'basic_tragedy'] as const).map(set => (
                    <button
                      key={set}
                      type="button"
                      onClick={() => setCustomScript(prev => ({ ...prev, tragedySet: set }))}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm font-bold transition-all text-left',
                        customScript.tragedySet === set
                          ? set === 'first_steps'
                            ? 'bg-mortis/20 border-mortis/60 text-mortis'
                            : 'bg-timoris/20 border-timoris/60 text-timoris'
                          : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-500'
                      )}
                    >
                      {set === 'first_steps' ? 'First Steps (FS)' : 'Basic Tragedy X (BTX)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 轮回数 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2 flex flex-col">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">轮回数</label>
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="text-5xl font-black text-oblivionis">{customScript.loops}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomScript(prev => ({ ...prev, loops: Math.max(1, prev.loops - 1) }))}
                      className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg transition-colors"
                    >−</button>
                    <button
                      type="button"
                      onClick={() => setCustomScript(prev => ({ ...prev, loops: Math.min(8, prev.loops + 1) }))}
                      className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg transition-colors"
                    >+</button>
                  </div>
                  <span className="text-xs text-slate-500">1 – 8 轮</span>
                </div>
              </div>

              {/* 天数 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2 flex flex-col">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">每轮天数</label>
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="text-5xl font-black text-oblivionis">{customScript.days}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomScript(prev => ({
                        ...prev,
                        days: Math.max(1, prev.days - 1),
                        incidents: prev.incidents.map(inc => ({ ...inc, day: Math.min(inc.day, Math.max(1, prev.days - 1)) })),
                      }))}
                      className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg transition-colors"
                    >−</button>
                    <button
                      type="button"
                      onClick={() => setCustomScript(prev => ({ ...prev, days: Math.min(14, prev.days + 1) }))}
                      className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg transition-colors"
                    >+</button>
                  </div>
                  <span className="text-xs text-slate-500">1 – 14 天</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ── 区域 2：登场角色 ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">登场角色</h2>
              <span className={cn(
                'text-sm font-bold px-3 py-1 rounded-full border',
                customScript.characters.length === 0
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-oblivionis/10 text-oblivionis border-oblivionis/40'
              )}>
                已选 {customScript.characters.length} 名
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {(Object.keys(ALL_CHARACTERS) as CharacterId[]).map(charId => {
                const isPicked = customScript.characters.includes(charId);
                return (
                  <button
                    type="button"
                    key={charId}
                    onClick={() => toggleCharacter(charId)}
                    className={cn(
                      'relative px-3 py-3 rounded-xl border text-left text-sm transition-all',
                      isPicked
                        ? 'bg-oblivionis/15 border-oblivionis/60 text-white shadow-sm shadow-oblivionis/10'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
                    )}
                  >
                    {isPicked && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-oblivionis flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    <div className="font-bold">{CHARACTER_NAMES[charId]}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      不安上限 {ALL_CHARACTERS[charId].anxietyLimit}
                    </div>
                  </button>
                );
              })}
            </div>
            {customScript.characters.length === 0 && (
              <p className="mt-3 text-sm text-red-400">请至少选择 1 名登场角色</p>
            )}
          </motion.section>

          {/* ── 区域 3：事件日程 ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">事件日程</h2>
              <button
                type="button"
                onClick={addIncident}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-oblivionis/20 text-oblivionis border border-oblivionis/50 hover:bg-oblivionis/30 transition-colors"
              >
                <Plus size={12} />
                新增事件
              </button>
            </div>

            {/* 天数时间轴提示 */}
            <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
              {Array.from({ length: customScript.days }, (_, i) => i + 1).map(d => {
                const eventsOnDay = customScript.incidents.filter(inc => inc.day === d);
                return (
                  <div
                    key={d}
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-lg border text-xs font-bold flex items-center justify-center transition-colors',
                      eventsOnDay.length > 0
                        ? 'bg-amoris/20 border-amoris/50 text-amoris'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    )}
                    title={eventsOnDay.map(e => INCIDENT_NAMES[e.type]).join(', ')}
                  >
                    {d}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              {customScript.incidents.map((incident, idx) => (
                <div
                  key={`${incident.type}-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700"
                >
                  <span className="w-6 h-6 rounded-full bg-amoris/30 border border-amoris/40 text-amoris text-xs font-bold flex items-center justify-center shrink-0">
                    {incident.day}
                  </span>
                  <select
                    value={incident.type}
                    onChange={(e) => updateIncident(idx, { type: e.target.value as IncidentType })}
                    className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-oblivionis"
                  >
                    {INCIDENT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-slate-500">第</span>
                    <input
                      type="number"
                      min={1}
                      max={customScript.days}
                      value={incident.day}
                      onChange={(e) => {
                        const d = Math.max(1, Math.min(customScript.days, Number(e.target.value) || 1));
                        updateIncident(idx, { day: d });
                      }}
                      className="w-14 rounded-lg bg-slate-900 border border-slate-700 px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-oblivionis"
                    />
                    <span className="text-xs text-slate-500">天</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIncident(idx)}
                    disabled={customScript.incidents.length <= 1}
                    className={cn(
                      'p-2 rounded-lg border text-sm shrink-0 transition-colors',
                      customScript.incidents.length <= 1
                        ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                        : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                    )}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── 预览摘要 ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-oblivionis/5 border border-oblivionis/20 flex flex-wrap gap-4 text-sm"
          >
            <span className="text-slate-400">
              来源：<span className="text-white font-bold">{setLabel}</span>
            </span>
            <span className="text-slate-400">
              <span className="text-white font-bold">{customScript.loops}</span> 轮 ×{' '}
              <span className="text-white font-bold">{customScript.days}</span> 天
            </span>
            <span className="text-slate-400">
              <span className="text-white font-bold">{customScript.characters.length}</span> 名角色
            </span>
            <span className="text-slate-400">
              <span className="text-white font-bold">{customScript.incidents.length}</span> 个事件
            </span>
          </motion.div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  步骤一：剧本列表
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen rendered-dark-bg p-8">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-timoris" />
          <h1 className="text-3xl font-black text-white">选择剧本</h1>
        </div>
        <p className="text-slate-400">作为剧作家，选择要使用的剧本</p>
      </motion.div>

      {/* 悲剧配置筛选 */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-center gap-3">
        <button
          onClick={() => setFilterSet('all')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
            filterSet === 'all'
              ? "bg-slate-700 text-white"
              : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50"
          )}
        >
          全部 ({SCRIPT_TEMPLATES.length})
        </button>
        <button
          onClick={() => setFilterSet('first_steps')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
            filterSet === 'first_steps'
              ? "bg-mortis/80 text-white"
              : "bg-mortis/10 text-mortis hover:bg-mortis/20"
          )}
        >
          First Steps ({SCRIPT_TEMPLATES.filter(s => !s.isCustom && s.tragedySet === 'first_steps').length})
        </button>
        <button
          onClick={() => setFilterSet('basic_tragedy')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
            filterSet === 'basic_tragedy'
              ? "bg-timoris/80 text-white"
              : "bg-timoris/10 text-timoris hover:bg-timoris/20"
          )}
        >
          Basic Tragedy X ({SCRIPT_TEMPLATES.filter(s => !s.isCustom && s.tragedySet === 'basic_tragedy').length})
        </button>
      </div>

      {/* 脚本列表 */}
      <div className="max-w-4xl mx-auto space-y-4 pb-28">
        {filteredScripts.map((script, index) => {
          const isSelected = selectedScript?.id === script.id;
          const isExpanded = expandedId === script.id;
          const displayTragedySet = script.isCustom ? customScript.tragedySet : script.tragedySet;
          const displayLoops = script.isCustom ? String(customScript.loops) : script.loops;
          const displayDays = script.isCustom ? customScript.days : script.days;
          const displayCharacters = script.isCustom ? customScript.characters : script.characters;
          const displayIncidents = script.isCustom ? customScript.incidents : script.incidents;

          return (
            <motion.div
              key={script.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-xl border-2 transition-all overflow-hidden",
                script.isCustom && isSelected
                  ? "border-oblivionis bg-oblivionis/10 shadow-lg shadow-oblivionis/20"
                  : isSelected
                  ? "border-timoris bg-timoris/10 shadow-lg shadow-timoris/20"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              )}
            >
              {/* 自定义剧本彩色顶栏 */}
              {script.isCustom && (
                <div className="px-4 py-2 bg-gradient-to-r from-oblivionis via-amoris to-doloris flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-white/90" />
                  <span className="text-sm font-extrabold text-white tracking-wide">自定义剧本</span>
                  <span className="ml-auto text-xs text-white/70">角色 · 轮回 · 事件 · 天数 均可自由配置</span>
                </div>
              )}

              {/* 脚本头部 */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setSelectedScript(script)}
              >
                <div className="flex items-center gap-4">
                  {/* 选中指示器 */}
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                    script.isCustom && isSelected
                      ? "border-oblivionis bg-oblivionis"
                      : isSelected
                      ? "border-timoris bg-timoris"
                      : "border-slate-600"
                  )}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  {/* 脚本基本信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className={cn(
                        "text-lg font-bold",
                        script.isCustom ? "text-oblivionis" : "text-white"
                      )}>{script.name}</h3>
                      <span className="text-sm text-slate-500">{script.nameEn}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold border",
                        script.isCustom
                          ? 'bg-oblivionis/10 text-oblivionis border-oblivionis/40'
                          : TRAGEDY_SET_STYLES[displayTragedySet].className
                      )}>
                        {script.isCustom ? '自定义' : TRAGEDY_SET_STYLES[displayTragedySet].shortName}
                      </span>
                      {!script.isCustom && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold border",
                          DIFFICULTY_COLORS[script.difficulty]
                        )}>
                          {DIFFICULTY_NAMES[script.difficulty]}
                        </span>
                      )}
                      {script.isTutorial && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border bg-oblivionis/20 text-oblivionis border-oblivionis/40"
                        >
                          <span className="text-sm leading-none">🐧</span>
                          教学剧本
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {displayDays}天 × {displayLoops}轮
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {displayCharacters.length}角色
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {displayIncidents.length}事件
                      </span>
                    </div>
                  </div>

                  {/* 展开按钮（自定义剧本不展开，点选直接高亮） */}
                  {!script.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : script.id);
                      }}
                      className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <ChevronRight className={cn(
                        "w-5 h-5 text-slate-400 transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    </button>
                  )}

                  {/* 自定义剧本：进入配置箭头提示 */}
                  {script.isCustom && (
                    <div className="flex items-center gap-1 text-xs text-oblivionis/70 shrink-0">
                      <span>选择后进入配置</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* 主线/支线（非自定义才显示） */}
                {!script.isCustom && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-2 py-1 rounded bg-amoris/10 text-amoris border border-amoris/30">
                      主线：{script.mainPlot}
                    </span>
                    {script.subPlot && (
                      <span className="px-2 py-1 rounded bg-oblivionis/10 text-oblivionis border border-oblivionis/30">
                        支线：{script.subPlot}
                      </span>
                    )}
                    {script.specialRules?.map((rule, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-doloris/10 text-doloris border border-doloris/30 font-bold">
                        {rule}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 展开详情（仅非自定义剧本） */}
              <AnimatePresence>
                {isExpanded && !script.isCustom && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-700"
                  >
                    <div className="p-4 space-y-4 bg-slate-900/50">
                      {/* 教学剧本横幅 */}
                      {script.isTutorial && (
                        <div
                          className="flex items-start gap-3 p-3 rounded-lg border bg-oblivionis/15 border-oblivionis/30"
                        >
                          <span className="text-xl shrink-0 mt-0.5">🐧</span>
                          <div className="text-sm">
                            <p className="font-bold mb-1 text-oblivionis">萌新剧本 · 全程引导教学</p>
                            <p className="text-slate-300">游戏进行中将在每个阶段弹出针对性提示，带领新手了解每一步该做什么。剧作家和主人公各有独立的引导内容。</p>
                          </div>
                        </div>
                      )}
                      {/* 登场角色 */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          登场角色
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {displayCharacters.map(charId => {
                            const char = ALL_CHARACTERS[charId];
                            return (
                              <div
                                key={charId}
                                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                              >
                                <div className="font-medium text-white">
                                  {CHARACTER_NAMES[charId] || charId}
                                </div>
                                <div className="text-xs text-slate-500">
                                  不安上限: {char?.anxietyLimit || '?'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 事件日程 */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          事件日程
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {displayIncidents.map((inc, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amoris/10 border border-amoris/30"
                            >
                              <span className="w-6 h-6 rounded-full bg-amoris/40 text-amoris/80 text-xs font-bold flex items-center justify-center">
                                {inc.day}
                              </span>
                              <span className="text-amoris/80 text-sm">
                                {INCIDENT_NAMES[inc.type] || inc.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* 底部操作栏 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              返回
            </button>
          )}

          <div className="flex-1" />

          {selectedScript && (
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                已选择: <span className="text-white font-bold">{selectedScript.name}</span>
              </span>
              <button
                onClick={handleListConfirm}
                className={cn(
                  'px-8 py-3 rounded-xl text-white font-bold transition-colors shadow-lg flex items-center gap-2',
                  selectedScript.isCustom
                    ? 'bg-oblivionis hover:bg-oblivionis/85 shadow-oblivionis/25'
                    : 'bg-timoris hover:bg-timoris/80 shadow-timoris/25'
                )}
              >
                {selectedScript.isCustom ? (
                  <>
                    <Wand2 className="w-4 h-4" />
                    进入配置
                  </>
                ) : '确认选择'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default ScriptSetup;
