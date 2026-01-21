import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Calendar, RotateCcw, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GameInfo() {
  const { gameState, playerRole } = useGameStore();

  if (!gameState) return null;

  const { currentLoop, currentDay, publicInfo } = gameState;

  return (
    <div className="flex flex-col gap-4 p-4 bg-transparent">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-600">
          惨剧轮回
        </h1>
        <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Tragedy Looper</p>
      </div>

      <div className="h-px bg-slate-700 w-full my-2" />

      {/* Stats */}
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

      <div className="mt-4 p-3 rounded-lg bg-indigo-900/30 border border-indigo-500/30">
        <div className="flex items-center gap-2 text-indigo-300 mb-2">
            <User size={16} />
            <span className="text-sm font-bold">当前身份</span>
        </div>
        <div className="text-xl font-bold text-white">
            {playerRole === 'mastermind' ? '剧作家' : '主人公'}
        </div>
      </div>

      {/* Incident Schedule */}
      <div className="mt-4 flex-1 overflow-y-auto">
        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">事件表</h3>
        <div className="space-y-2">
            {publicInfo.incidentSchedule.map((incident, idx) => (
                <div 
                    key={idx} 
                    className={cn(
                        "p-2 rounded text-sm border-l-2",
                        incident.day === currentDay ? "bg-red-500/20 border-red-500 text-red-200" : "bg-slate-800/50 border-slate-600 text-slate-500"
                    )}
                >
                    <div className="flex justify-between">
                        <span className="font-bold">Day {incident.day}</span>
                        <span className="text-xs opacity-70">{incident.type}</span>
                    </div>
                    <div className="mt-1">{incident.description}</div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
