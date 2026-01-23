import React, { useState, useRef, useEffect } from 'react';
import { Heart, Zap, Eye, ChevronUp, ChevronDown } from 'lucide-react';
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

type IndicatorType = keyof Indicators;

export function IndicatorDisplay({ 
  indicators, 
  className, 
  editable = false,
  onChange 
}: IndicatorDisplayProps) {
  // 当前展开的指示物类型
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveIndicator(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 点击指示物：切换弹窗
  const handleClick = (type: IndicatorType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editable) return;
    setActiveIndicator(prev => prev === type ? null : type);
  };

  // 调整指示物值
  const handleAdjust = (type: IndicatorType, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onChange) return;
    onChange(type, delta);
  };

  const indicatorStyle = editable 
    ? "cursor-pointer hover:scale-105 active:scale-95 transition-transform select-none" 
    : "";

  // 渲染单个指示物（带弹窗）
  const renderIndicator = (
    type: IndicatorType,
    value: number,
    Icon: React.ElementType,
    colorClasses: { bg: string; text: string; border: string; hoverBg: string; hoverBorder: string }
  ) => {
    const isActive = activeIndicator === type;
    
    return (
      <div className="relative" key={type}>
        <div 
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full border",
            colorClasses.bg, colorClasses.text, colorClasses.border,
            indicatorStyle,
            editable && `${colorClasses.hoverBg} ${colorClasses.hoverBorder}`,
            isActive && "ring-2 ring-white/50"
          )}
          onClick={(e) => handleClick(type, e)}
          title={editable ? "点击调整" : undefined}
        >
          <Icon size={14} fill={type !== 'intrigue' ? "currentColor" : undefined} />
          <span className="text-xs font-bold">{value}</span>
        </div>

        {/* 弹出式调节器 */}
        {editable && isActive && (
          <div 
            className={cn(
              "absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full",
              "flex flex-col items-center gap-0.5 p-1 rounded-lg",
              "bg-slate-900/95 border border-slate-600 shadow-xl z-50"
            )}
          >
            <button
              onClick={(e) => handleAdjust(type, 1, e)}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded",
                "bg-green-600 hover:bg-green-500 text-white transition-colors",
                "active:scale-90"
              )}
              title="+1"
            >
              <ChevronUp size={18} strokeWidth={3} />
            </button>
            <div className={cn("text-xs font-bold py-0.5", colorClasses.text)}>
              {value}
            </div>
            <button
              onClick={(e) => handleAdjust(type, -1, e)}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded",
                "bg-red-600 hover:bg-red-500 text-white transition-colors",
                "active:scale-90",
                value <= 0 && "opacity-50 cursor-not-allowed"
              )}
              disabled={value <= 0}
              title="-1"
            >
              <ChevronDown size={18} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn("flex items-center gap-1 sm:gap-3 flex-wrap", className)}>
      {/* Goodwill - 友好 */}
      {renderIndicator('goodwill', indicators.goodwill, Heart, {
        bg: 'bg-pink-100/10',
        text: 'text-pink-400',
        border: 'border-pink-500/30',
        hoverBg: 'hover:bg-pink-500/20',
        hoverBorder: 'hover:border-pink-400',
      })}

      {/* Anxiety - 不安 */}
      {renderIndicator('anxiety', indicators.anxiety, Zap, {
        bg: 'bg-purple-100/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        hoverBg: 'hover:bg-purple-500/20',
        hoverBorder: 'hover:border-purple-400',
      })}

      {/* Intrigue - 密谋 */}
      {renderIndicator('intrigue', indicators.intrigue, Eye, {
        bg: 'bg-slate-100/10',
        text: 'text-slate-400',
        border: 'border-slate-500/30',
        hoverBg: 'hover:bg-slate-500/20',
        hoverBorder: 'hover:border-slate-400',
      })}
    </div>
  );
}
