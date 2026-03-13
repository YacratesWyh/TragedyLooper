'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX } from 'lucide-react';
import type { CardRef } from '../types';
import { MaigoCard } from './Card';
import { isAudioUnlocked } from '../audioUnlock';

const BAD_END_VIDEO_SRC = '/assets/maigo/gugugaga.m4s';
const BAD_END_AUDIO_SRC = '/assets/maigo/gugugaga%20audio.m4s';

interface BadEndOverlayProps {
  playerName: string;
  hand: CardRef[];
  description: string;
  onSkip: () => void;
}

export function BadEndOverlay({ playerName, hand, description, onSkip }: BadEndOverlayProps) {
  const [showBe, setShowBe] = useState(false);
  // 如果用户已交互（点击过开始游戏），默认开启声音
  const [muted, setMuted] = useState(() => !isAudioUnlocked());
  const [showUnmuteHint, setShowUnmuteHint] = useState(() => !isAudioUnlocked());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowBe(true), 500);
    return () => clearTimeout(t);
  }, []);

  const syncAudioToVideo = useCallback(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    audio.currentTime = video.currentTime;
    audio.playbackRate = video.playbackRate;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) return;
    void audio.play();
  }, [muted]);
  
  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((prev) => {
      const next = !prev;
      if (!next) setShowUnmuteHint(false);
      return next;
    });
  }, []);

  // 防止 hydration 不匹配
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 cursor-pointer"
      onClick={onSkip}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />

      {/* 右侧悬浮视频 */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute right-6 top-6 z-10 hidden w-[360px] overflow-hidden rounded-2xl border border-red-900/60 bg-black/40 shadow-2xl lg:block"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover"
          src={BAD_END_VIDEO_SRC}
          autoPlay
          loop
          playsInline
          muted
          preload="auto"
          onPlay={() => {
            syncAudioToVideo();
            if (!muted) {
              void audioRef.current?.play();
            }
          }}
          onPause={() => audioRef.current?.pause()}
          onSeeked={syncAudioToVideo}
          onRateChange={syncAudioToVideo}
        >
          <source src={BAD_END_VIDEO_SRC} type="video/mp4" />
        </video>
        <audio
          ref={audioRef}
          src={BAD_END_AUDIO_SRC}
          autoPlay
          loop
          preload="auto"
          muted={muted}
        >
          <source src={BAD_END_AUDIO_SRC} type="audio/mp4" />
        </audio>
        
        {/* 音量控制按钮 */}
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-110"
          title={muted ? '点击开启声音' : '点击静音'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* 开启声音提示 */}
        <AnimatePresence>
          {showUnmuteHint && muted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-3 left-3 z-20"
            >
              <button
                onClick={toggleMute}
                className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-red-500"
              >
                <Volume2 size={14} />
                点击开启声音
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
        <div className="mt-2 text-base text-red-300/85">
          {description}
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
