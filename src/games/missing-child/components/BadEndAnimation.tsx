'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MaigoCard } from './Card';
import type { CardRef, MissingChildGameState } from '../types';

interface BadEndAnimationProps {
  gameState: MissingChildGameState;
  onSkip: () => void;
}

const BAD_END_BVID = 'BV1XB6zBcEMu';

export function BadEndAnimation({ gameState, onSkip }: BadEndAnimationProps) {
  const [showBE, setShowBE] = useState(false);
  const animation = gameState.badEndAnimation;
  
  if (!animation) return null;
  
  const player = gameState.players[animation.playerIndex];
  const hand = animation.hand;

  useEffect(() => {
    // 2秒后显示 BE 标识
    const timer = setTimeout(() => setShowBE(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
      onClick={onSkip}
    >
      {/* 暗色遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
      
      {/* 内容区域 */}
      <div className="relative z-10 flex w-full max-w-6xl items-center justify-between gap-8 px-8">
        {/* 玩家信息 */}
        <div className="flex flex-1 flex-col items-center gap-8">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <p className="mb-2 text-3xl font-bold text-red-500">{player.name}</p>
            <p className="text-lg text-red-400/80">手牌仅剩迷子，Bad End 自爆</p>
          </motion.div>

          {/* 手牌展示 - 旋转动画 + 红色边框闪烁 */}
          <div className="flex max-w-4xl flex-wrap justify-center gap-4">
            {hand.map((card, index) => (
              <motion.div
                key={card.instanceId}
                initial={{ rotate: 0, scale: 0.8, opacity: 0 }}
                animate={{ 
                  rotate: [0, -5, 5, -5, 5, 0],
                  scale: 1, 
                  opacity: 1 
                }}
                transition={{
                  rotate: {
                    duration: 0.5,
                    delay: index * 0.1,
                    repeat: Infinity,
                    repeatDelay: 2,
                  },
                  scale: { duration: 0.3, delay: index * 0.1 },
                }}
                className="relative"
              >
                {/* 红色闪烁边框 */}
                <motion.div
                  className="absolute -inset-2 rounded-xl border-4 border-red-600"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    boxShadow: [
                      '0 0 10px rgba(220, 38, 38, 0.3)',
                      '0 0 30px rgba(220, 38, 38, 0.8)',
                      '0 0 10px rgba(220, 38, 38, 0.3)',
                    ],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                  }}
                />
                <MaigoCard card={card} faceUp width={120} />
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="pointer-events-none hidden w-[360px] shrink-0 overflow-hidden rounded-2xl border border-red-900/60 bg-black/40 shadow-2xl lg:block"
        >
          <iframe
            src={`https://player.bilibili.com/player.html?bvid=${BAD_END_BVID}&autoplay=1&muted=0`}
            className="pointer-events-none aspect-video w-full"
            allow="autoplay; fullscreen"
            style={{ border: 'none' }}
          />
        </motion.div>

        {/* BE 大标识 */}
        <AnimatePresence>
          {showBE && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="relative">
                <motion.div
                  className="text-[12rem] font-black text-red-600"
                  style={{ 
                    textShadow: '0 0 60px rgba(220, 38, 38, 0.8), 0 0 120px rgba(220, 38, 38, 0.4)',
                    WebkitTextStroke: '4px rgba(0,0,0,0.5)',
                  }}
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                  }}
                >
                  BE
                </motion.div>
                <motion.div
                  className="absolute inset-0 text-[12rem] font-black text-red-500/50"
                  style={{ 
                    WebkitTextStroke: '4px rgba(0,0,0,0.3)',
                    filter: 'blur(10px)',
                  }}
                  animate={{
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                  }}
                >
                  BE
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-stone-500"
        >
          点击屏幕任意位置跳过
        </motion.p>
      </div>
    </motion.div>
  );
}
