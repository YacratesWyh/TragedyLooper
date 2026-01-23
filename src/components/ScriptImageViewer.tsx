'use client';

/**
 * 剧本图文速查 - 独立浮动组件
 * 直接显示在屏幕边缘，点击展开大图
 * 支持加载公共图片 + 剧本专属图片
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, Lock, Image as ImageIcon } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayer } from '@/lib/useMultiplayer';
import type { PlayerRole } from '@/types/game';

interface ScriptImage {
  id: string;
  title: string;
  path: string;
  basePath: string; // 图片所在的基础路径
  visibleTo?: PlayerRole;
}

interface ScriptConfig {
  images: Array<{
    id: string;
    title: string;
    path: string;
    visibleTo?: PlayerRole;
  }>;
}

// 根据剧本名称获取对应的资源目录
function getScriptAssetPath(scriptName: string): string {
  if (scriptName.includes('Basic Tragedy') || scriptName.includes('基本悲剧')) {
    return 'btx';
  }
  // 默认使用 First Steps
  return 'fs';
}

export function ScriptImageViewer() {
  const [commonConfig, setCommonConfig] = useState<ScriptConfig | null>(null);
  const [scriptConfig, setScriptConfig] = useState<ScriptConfig | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const { myRole: multiplayerRole } = useMultiplayer();
  const localRole = useGameStore((s) => s.playerRole);
  const gameState = useGameStore((s) => s.gameState);
  const currentRole = multiplayerRole || localRole;
  
  // 确定当前剧本的资源路径
  const scriptAssetPath = useMemo(() => {
    if (gameState?.publicInfo?.scriptName) {
      return getScriptAssetPath(gameState.publicInfo.scriptName);
    }
    return 'fs'; // 默认
  }, [gameState?.publicInfo?.scriptName]);

  // 加载公共配置
  useEffect(() => {
    fetch('/assets/common/config.json')
      .then(res => res.json())
      .then(data => setCommonConfig(data))
      .catch(err => console.error('Failed to load common config:', err));
  }, []);

  // 加载剧本专属配置
  useEffect(() => {
    fetch(`/assets/${scriptAssetPath}/config.json`)
      .then(res => res.json())
      .then(data => setScriptConfig(data))
      .catch(err => console.error('Failed to load script config:', err));
  }, [scriptAssetPath]);

  // 合并所有图片配置
  const allImages: ScriptImage[] = useMemo(() => {
    const images: ScriptImage[] = [];
    
    // 添加剧本专属图片
    if (scriptConfig?.images) {
      scriptConfig.images.forEach(img => {
        images.push({
          ...img,
          basePath: `/assets/${scriptAssetPath}`,
        });
      });
    }
    
    // 添加公共图片
    if (commonConfig?.images) {
      commonConfig.images.forEach(img => {
        images.push({
          ...img,
          basePath: '/assets/common',
        });
      });
    }
    
    return images;
  }, [commonConfig, scriptConfig, scriptAssetPath]);

  if (allImages.length === 0) {
    return null;
  }

  // 根据角色过滤可见图片
  const visibleImages = allImages.filter(img => {
    if (!img.visibleTo) return true;
    return img.visibleTo === currentRole;
  });

  if (visibleImages.length === 0) return null;

  const currentImage = visibleImages[currentIndex];
  const hasMultiple = visibleImages.length > 1;
  
  // 获取图片完整路径
  const getImagePath = (img: ScriptImage) => `${img.basePath}/${img.path}`;

  const nextImage = () => {
    setCurrentIndex((i) => (i + 1) % visibleImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((i) => (i - 1 + visibleImages.length) % visibleImages.length);
  };

  return (
    <>
      {/* 收起状态 - 右下角小缩略图 */}
      <div 
        className={cn(
          "fixed bottom-28 right-4 z-[90] transition-all duration-300",
          isExpanded ? "opacity-0 pointer-events-none scale-75" : "opacity-100"
        )}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="group relative w-20 h-28 rounded-lg overflow-hidden border-2 border-amber-500/50 hover:border-amber-400 shadow-xl bg-slate-800 transition-all hover:scale-105"
          title="展开剧本速查"
        >
          <img 
            src={getImagePath(currentImage)}
            alt={currentImage.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-1 left-1 right-1 text-[9px] text-white font-bold text-center truncate">
            {currentImage.title}
          </div>
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500/90 flex items-center justify-center">
            <ImageIcon size={10} className="text-white" />
          </div>
          {hasMultiple && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] bg-slate-900/80 text-slate-300 font-bold">
              {currentIndex + 1}/{visibleImages.length}
            </div>
          )}
        </button>
      </div>

      {/* 展开状态 - 右侧面板 */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* 半透明背景 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/40 z-[110]"
            />

            {/* 主面板 */}
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 z-[120] shadow-2xl flex flex-col"
            >
              {/* 顶部标题 */}
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-amber-400" />
                  <span className="font-bold text-white">剧本图文速查</span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* 图片区域 */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {visibleImages.map((img, idx) => (
                    <div 
                      key={img.id} 
                      className={cn(
                        "relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all group",
                        idx === currentIndex 
                          ? "border-amber-500 shadow-lg shadow-amber-500/20"
                          : "border-slate-700 hover:border-slate-500"
                      )}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setZoomedImage(getImagePath(img));
                      }}
                    >
                      <div className="aspect-[4/3] bg-slate-800">
                        <img 
                          src={getImagePath(img)}
                          alt={img.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      
                      {/* 角色专属标记 */}
                      {img.visibleTo && (
                        <div className={cn(
                          "absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold",
                          img.visibleTo === 'mastermind' 
                            ? "bg-red-900/90 text-red-200" 
                            : "bg-blue-900/90 text-blue-200"
                        )}>
                          {img.visibleTo === 'mastermind' ? '剧作家' : '主人公'}
                        </div>
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                        <p className="text-xs text-white font-medium truncate">{img.title}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 隐藏数量提示 */}
                {allImages.length > visibleImages.length && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 px-2 py-1.5 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <Lock size={12} />
                    <span>还有 {allImages.length - visibleImages.length} 张对方阵营专属</span>
                  </div>
                )}
              </div>

              {/* 底部提示 */}
              <div className="shrink-0 px-4 py-2 border-t border-slate-700 bg-slate-800/30 text-xs text-slate-500 text-center">
                点击图片查看大图
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 放大查看弹窗 */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <X size={24} />
            </button>
            
            {/* 左右切换 */}
            {hasMultiple && (
              <>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const prevIdx = (currentIndex - 1 + visibleImages.length) % visibleImages.length;
                    prevImage(); 
                    setZoomedImage(getImagePath(visibleImages[prevIdx])); 
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const nextIdx = (currentIndex + 1) % visibleImages.length;
                    nextImage(); 
                    setZoomedImage(getImagePath(visibleImages[nextIdx])); 
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <motion.img
              key={zoomedImage}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={zoomedImage}
              alt="Zoomed reference"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* 图片标题 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 rounded-full text-white font-medium">
              {visibleImages[currentIndex]?.title}
              {hasMultiple && <span className="text-slate-400 ml-2">({currentIndex + 1}/{visibleImages.length})</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
