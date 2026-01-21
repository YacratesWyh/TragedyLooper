import React from 'react';
import { Heart, Zap, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Indicators } from '@/types/game';

interface IndicatorDisplayProps {
  indicators: Indicators;
  className?: string;
}

export function IndicatorDisplay({ indicators, className }: IndicatorDisplayProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Goodwill - 友好 */}
      <div className="flex items-center gap-1 bg-pink-100/10 text-pink-400 px-2 py-1 rounded-full border border-pink-500/30">
        <Heart size={14} fill="currentColor" />
        <span className="text-xs font-bold">{indicators.goodwill}</span>
      </div>

      {/* Anxiety - 不安 */}
      <div className="flex items-center gap-1 bg-purple-100/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
        <Zap size={14} fill="currentColor" />
        <span className="text-xs font-bold">{indicators.anxiety}</span>
      </div>

      {/* Intrigue - 密谋 */}
      <div className="flex items-center gap-1 bg-slate-100/10 text-slate-400 px-2 py-1 rounded-full border border-slate-500/30">
        <Eye size={14} />
        <span className="text-xs font-bold">{indicators.intrigue}</span>
      </div>
    </div>
  );
}
