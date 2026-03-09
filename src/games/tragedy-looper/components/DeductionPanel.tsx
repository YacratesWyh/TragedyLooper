/**
 * 剧情猜测面板（主人公专用）
 * 选择 Y 主线 + X1/X2 支线，自动推算所需身份及路人数量
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/games/tragedy-looper/store';
import { ROLE_NAMES } from '@/games/tragedy-looper/types';
import {
  getPlotsForSet,
  mergeRequiredRoles,
  type PlotDef,
} from '@/games/tragedy-looper/data/plotRoles';

interface DeductionPanelProps {
  onClose: () => void;
}

export function DeductionPanel({ onClose }: DeductionPanelProps) {
  const { gameState } = useGameStore();
  const tragedySet = gameState?.publicInfo.tragedySet ?? 'first_steps';
  const characterCount = gameState?.publicInfo.characters.length ?? 0;

  const { main: mainPlots, sub: subPlots } = getPlotsForSet(tragedySet);

  const [guessY, setGuessY] = useState<string>('');
  const [guessX1, setGuessX1] = useState<string>('');
  const [guessX2, setGuessX2] = useState<string>('');

  // 收集已选剧情对象
  const selectedPlots: PlotDef[] = [];
  const yPlot = mainPlots.find(p => p.id === guessY);
  const x1Plot = subPlots.find(p => p.id === guessX1);
  const x2Plot = subPlots.find(p => p.id === guessX2);
  if (yPlot) selectedPlots.push(yPlot);
  if (x1Plot) selectedPlots.push(x1Plot);
  if (x2Plot) selectedPlots.push(x2Plot);

  const requiredRoles = mergeRequiredRoles(selectedPlots);
  const requiredTotal = requiredRoles.reduce((sum, r) => sum + r.count, 0);
  const civilianCount = Math.max(0, characterCount - requiredTotal);

  const hasSelection = guessY || guessX1;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-4 top-14 z-[100] w-96 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden"
    >
      {/* 顶栏 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-900/60 to-slate-900/60 border-b border-slate-700">
        <Search className="w-4 h-4 text-violet-400 shrink-0" />
        <span className="text-sm font-bold text-violet-200 flex-1">剧情猜测</span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Y 主线选择 */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            主线 Y
          </label>
          <select
            value={guessY}
            onChange={e => setGuessY(e.target.value)}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-400"
          >
            <option value="">— 选择主线 —</option>
            {mainPlots.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* X1 支线选择 */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            支线 X1
          </label>
          <select
            value={guessX1}
            onChange={e => {
              setGuessX1(e.target.value);
              if (e.target.value === guessX2) setGuessX2('');
            }}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-400"
          >
            <option value="">— 选择支线 1 —</option>
            {subPlots.map(p => (
              <option key={p.id} value={p.id} disabled={p.id === guessX2}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* X2 支线选择（可为空） */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            支线 X2
            <span className="ml-1 text-slate-600 font-normal normal-case">（可不选）</span>
          </label>
          <select
            value={guessX2}
            onChange={e => {
              setGuessX2(e.target.value);
              if (e.target.value === guessX1) setGuessX1('');
            }}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-400"
          >
            <option value="">— 无第二支线 —</option>
            {subPlots.map(p => (
              <option key={p.id} value={p.id} disabled={p.id === guessX1}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-slate-700/60" />

        {/* 角色组合结果 */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
            所需身份组合
          </div>

          {!hasSelection ? (
            <p className="text-xs text-slate-600 italic">请先选择主线或支线</p>
          ) : (
            <div className="space-y-1.5">
              {requiredRoles.map(({ roleId, count }) => (
                <div
                  key={roleId}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700"
                >
                  <span className="text-sm text-white font-medium">
                    {ROLE_NAMES[roleId] ?? roleId}
                  </span>
                  <span className="text-sm font-bold text-violet-300">×{count}</span>
                </div>
              ))}

              {/* 路人行 */}
              <div
                className={cn(
                  'flex items-center justify-between px-3 py-1.5 rounded-lg border',
                  civilianCount > 0
                    ? 'bg-slate-800/50 border-slate-700'
                    : 'bg-red-900/20 border-red-800/40'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  civilianCount > 0 ? 'text-slate-400' : 'text-red-400'
                )}>
                  路人
                </span>
                <span className={cn(
                  'text-sm font-bold',
                  civilianCount > 0 ? 'text-slate-400' : 'text-red-400'
                )}>
                  ×{civilianCount}
                </span>
              </div>

              {/* 合计校验 */}
              <div className="flex items-center justify-between px-3 py-1 text-xs text-slate-500">
                <span>合计</span>
                <span className={cn(
                  requiredTotal + civilianCount === characterCount
                    ? 'text-slate-500'
                    : 'text-yellow-500 font-bold'
                )}>
                  {requiredTotal + civilianCount} / {characterCount} 名角色
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
