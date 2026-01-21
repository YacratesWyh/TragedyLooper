import React from 'react';
import { Heart, Zap, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Indicators } from '@/types/game';

interface IndicatorDisplayProps {
  indicators: Indicators;
  className?: string;
  /** 是否可编辑（启用点击调整） */
  editable?: boolean;
  /** 指示物变化回调 */
  onChange?: (type: keyof Indicators, delta: number) => void;
}

export function IndicatorDisplay({ 
  indicators, 
  className, 
  editable = false,
  onChange 
}: IndicatorDisplayProps) {
  
  // 处理点击（左键+1，右键-1）
  const handleClick = (type: keyof Indicators, e: React.MouseEvent) => {
    if (!editable || !onChange) return;
    e.preventDefault();
    onChange(type, 1);
  };
  
  const handleContextMenu = (type: keyof Indicators, e: React.MouseEvent) => {
    if (!editable || !onChange) return;
    e.preventDefault();
    onChange(type, -1);
  };

  const indicatorStyle = editable 
    ? "cursor-pointer hover:scale-110 active:scale-95 transition-transform select-none" 
    : "";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Goodwill - 友好 */}
      <div 
        className={cn(
          "flex items-center gap-1 bg-pink-100/10 text-pink-400 px-2 py-1 rounded-full border border-pink-500/30",
          indicatorStyle,
          editable && "hover:bg-pink-500/20 hover:border-pink-400"
        )}
        onClick={(e) => handleClick('goodwill', e)}
        onContextMenu={(e) => handleContextMenu('goodwill', e)}
        title={editable ? "左键+1 / 右键-1" : undefined}
      >
        <Heart size={14} fill="currentColor" />
        <span className="text-xs font-bold">{indicators.goodwill}</span>
      </div>

      {/* Anxiety - 不安 */}
      <div 
        className={cn(
          "flex items-center gap-1 bg-purple-100/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30",
          indicatorStyle,
          editable && "hover:bg-purple-500/20 hover:border-purple-400"
        )}
        onClick={(e) => handleClick('anxiety', e)}
        onContextMenu={(e) => handleContextMenu('anxiety', e)}
        title={editable ? "左键+1 / 右键-1" : undefined}
      >
        <Zap size={14} fill="currentColor" />
        <span className="text-xs font-bold">{indicators.anxiety}</span>
      </div>

      {/* Intrigue - 密谋 */}
      <div 
        className={cn(
          "flex items-center gap-1 bg-slate-100/10 text-slate-400 px-2 py-1 rounded-full border border-slate-500/30",
          indicatorStyle,
          editable && "hover:bg-slate-500/20 hover:border-slate-400"
        )}
        onClick={(e) => handleClick('intrigue', e)}
        onContextMenu={(e) => handleContextMenu('intrigue', e)}
        title={editable ? "左键+1 / 右键-1" : undefined}
      >
        <Eye size={14} />
        <span className="text-xs font-bold">{indicators.intrigue}</span>
      </div>
    </div>
  );
}
