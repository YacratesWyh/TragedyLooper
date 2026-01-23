/**
 * 开局设置 - 剧本选择组件
 * 仅剧作家可见，用于选择脚本和查看角色配置
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Users, Calendar, AlertTriangle, ChevronRight, 
  Check, X, Eye, Skull, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCRIPT_TEMPLATES, ALL_CHARACTERS, type ScriptTemplate } from '@/game/scripts/fs-01';
import { CHARACTER_NAMES, type CharacterId, type IncidentType } from '@/types/game';

interface ScriptSetupProps {
  onSelect: (script: ScriptTemplate) => void;
  onCancel?: () => void;
}

/** 事件类型显示名称 */
const INCIDENT_NAMES: Record<IncidentType, string> = {
  murder: '谋杀案',
  hospital_incident: '医院的事件',
  suicide: '自杀',
  faraway_murder: '远距离杀人',
};

/** 难度标签颜色 */
const DIFFICULTY_COLORS = {
  beginner: 'bg-green-900/50 text-green-300 border-green-700',
  intermediate: 'bg-amber-900/50 text-amber-300 border-amber-700',
  advanced: 'bg-red-900/50 text-red-300 border-red-700',
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
    className: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  },
  basic_tragedy: {
    name: 'Basic Tragedy X',
    shortName: 'BTX',
    className: 'bg-purple-900/50 text-purple-300 border-purple-700',
  },
};

export function ScriptSetup({ onSelect, onCancel }: ScriptSetupProps) {
  const [selectedScript, setSelectedScript] = useState<ScriptTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSet, setFilterSet] = useState<'all' | 'first_steps' | 'basic_tragedy'>('all');

  const handleConfirm = () => {
    if (selectedScript) {
      onSelect(selectedScript);
    }
  };

  // 根据选择的悲剧配置过滤脚本
  const filteredScripts = filterSet === 'all' 
    ? SCRIPT_TEMPLATES 
    : SCRIPT_TEMPLATES.filter(s => s.tragedySet === filterSet);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-purple-400" />
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
              ? "bg-emerald-800 text-emerald-200"
              : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/50"
          )}
        >
          First Steps ({SCRIPT_TEMPLATES.filter(s => s.tragedySet === 'first_steps').length})
        </button>
        <button
          onClick={() => setFilterSet('basic_tragedy')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
            filterSet === 'basic_tragedy'
              ? "bg-purple-800 text-purple-200"
              : "bg-purple-900/30 text-purple-400 hover:bg-purple-800/50"
          )}
        >
          Basic Tragedy X ({SCRIPT_TEMPLATES.filter(s => s.tragedySet === 'basic_tragedy').length})
        </button>
      </div>

      {/* 脚本列表 */}
      <div className="max-w-4xl mx-auto space-y-4">
        {filteredScripts.map((script, index) => {
          const isSelected = selectedScript?.id === script.id;
          const isExpanded = expandedId === script.id;
          
          return (
            <motion.div
              key={script.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-xl border-2 transition-all overflow-hidden",
                isSelected 
                  ? "border-purple-500 bg-purple-900/20 shadow-lg shadow-purple-500/20"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              )}
            >
              {/* 脚本头部 - 可点击选中 */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setSelectedScript(script)}
              >
                <div className="flex items-center gap-4">
                  {/* 选中指示器 */}
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected 
                      ? "border-purple-500 bg-purple-500" 
                      : "border-slate-600"
                  )}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  {/* 脚本基本信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-white">{script.name}</h3>
                      <span className="text-sm text-slate-500">{script.nameEn}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold border",
                        TRAGEDY_SET_STYLES[script.tragedySet].className
                      )}>
                        {TRAGEDY_SET_STYLES[script.tragedySet].shortName}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold border",
                        DIFFICULTY_COLORS[script.difficulty]
                      )}>
                        {DIFFICULTY_NAMES[script.difficulty]}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {script.days}天 × {script.loops}轮
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {script.characters.length}角色
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {script.incidents.length}事件
                      </span>
                    </div>
                  </div>

                  {/* 展开按钮 */}
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
                </div>

                {/* 主线/支线 */}
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="px-2 py-1 rounded bg-red-900/30 text-red-300 border border-red-800/50">
                    主线：{script.mainPlot}
                  </span>
                  {script.subPlot && (
                    <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-300 border border-blue-800/50">
                      支线：{script.subPlot}
                    </span>
                  )}
                </div>
              </div>

              {/* 展开详情 */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-700"
                  >
                    <div className="p-4 space-y-4 bg-slate-900/50">
                      {/* 登场角色 */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          登场角色
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {script.characters.map(charId => {
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
                          {script.incidents.map((inc, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-800/50"
                            >
                              <span className="w-6 h-6 rounded-full bg-red-800 text-red-200 text-xs font-bold flex items-center justify-center">
                                {inc.day}
                              </span>
                              <span className="text-red-200 text-sm">
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
                onClick={handleConfirm}
                className="px-8 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/25"
              >
                确认选择
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default ScriptSetup;
