'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { CardRef } from '../types';
import { MaigoCard } from './Card';

const BAD_END_BVID = 'BV1XB6zBcEMu';

interface BadEndOverlayProps {
  playerName: string;
  hand: CardRef[];
  onSkip: () => void;
}

export function BadEndOverlay({ playerName, hand, onSkip }: BadEndOverlayProps) {
  const [showBe, setShowBe] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setShowBe(true), 500);
    return () => clearTimeout(t);
  }, []);

  // 防止 hydration 不匹配
  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 cursor-pointer"
      onClick={onSkip}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />

      {/* 右侧悬浮视频，不参与交互 */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="pointer-events-none absolute right-6 top-6 z-10 hidden w-[360px] overflow-hidden rounded-2xl border border-red-900/60 bg-black/40 shadow-2xl lg:block"
      >
        <iframe
          src={`//player.bilibili.com/player.html?bvid=${BAD_END_BVID}&autoplay=1&muted=1&danmaku=0`}
          className="pointer-events-none aspect-video w-full"
          style={{ border: 'none' }}
          allow="autoplay"
        />
      </motion.div>

      {/* 标题：玩家自爆 */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-20 left-0 right-0 text-center pointer-events-none"
      >
        <div className="text-3xl font-bold text-red-500">
          💥 {playerName} 自爆了！
        </div>
      </motion.div>

      {/* 手牌展示 - 旋转+红色边框闪烁 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex gap-4">
          {hand.map((card, i) => (
            <motion.div
              key={card.instanceId}
              initial={{ rotate: 0, scale: 0, opacity: 0 }}
              animate={{
                rotate: [0, -15, 15, -10, 10, -5, 5, 0],
                scale: 1,
                opacity: 1,
                x: (i - hand.length / 2) * 80,
              }}
              transition={{
                rotate: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
                scale: { delay: i * 0.15, duration: 0.3 },
                opacity: { delay: i * 0.15, duration: 0.3 },
                x: { delay: i * 0.15, duration: 0.3 },
              }}
            >
              <div className="animate-pulse">
                <div className="ring-4 ring-red-600 ring-offset-2 ring-offset-black rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.8)]">
                  <MaigoCard card={card} faceUp width={120} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* BE标识 */}
      <AnimatePresence>
        {showBe && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-9xl font-black text-red-600 drop-shadow-[0_0_50px_rgba(220,38,38,1)] animate-pulse">
              💀 BE
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 跳过提示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-0 right-0 text-center pointer-events-none"
      >
        <div className="text-white/50 text-sm">点击任意位置跳过</div>
      </motion.div>
    </div>,
    document.body,
  );
}
