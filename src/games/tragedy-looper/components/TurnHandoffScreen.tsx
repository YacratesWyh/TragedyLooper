'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerRole, GamePhase } from '@/games/tragedy-looper/types';
import { PHASE_NAMES } from '@/games/tragedy-looper/types';

interface TurnHandoffScreenProps {
  targetRole: PlayerRole;
  phase: GamePhase;
  onConfirm: () => void;
}

const ROLE_CONFIG: Record<PlayerRole, {
  label: string;
  icon: string;
  gradient: string;
  border: string;
  btnBg: string;
  btnHover: string;
  textColor: string;
  glowColor: string;
}> = {
  mastermind: {
    label: '剧作家',
    icon: '🎭',
    gradient: 'from-red-950 via-slate-950 to-red-950',
    border: 'border-red-700',
    btnBg: 'bg-red-700',
    btnHover: 'hover:bg-red-600',
    textColor: 'text-red-400',
    glowColor: 'shadow-red-500/30',
  },
  protagonist: {
    label: '主人公',
    icon: '🦸',
    gradient: 'from-blue-950 via-slate-950 to-blue-950',
    border: 'border-blue-700',
    btnBg: 'bg-blue-700',
    btnHover: 'hover:bg-blue-600',
    textColor: 'text-blue-400',
    glowColor: 'shadow-blue-500/30',
  },
};

const PHASE_HINTS: Partial<Record<GamePhase, string>> = {
  mastermind_action: '请暗置最多 3 张行动牌到角色或地点上',
  protagonist_action: '请暗置最多 3 张行动牌到角色或地点上',
  mastermind_ability: '发动身份能力，手动调整指示物',
  protagonist_ability: '发动友好能力，手动调整指示物',
  incident: '检查事件触发条件',
  night: '发动夜晚能力（杀手等）',
  dawn: '新的一天从黎明阶段开始',
};

export function TurnHandoffScreen({ targetRole, phase, onConfirm }: TurnHandoffScreenProps) {
  const [confirmed, setConfirmed] = useState(false);
  const config = ROLE_CONFIG[targetRole];
  const hint = PHASE_HINTS[phase] || PHASE_NAMES[phase];

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(onConfirm, 300);
  };

  return (
    <AnimatePresence>
      {!confirmed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br ${config.gradient}`}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 20 }}
            className="flex flex-col items-center gap-8 max-w-md mx-auto px-8"
          >
            {/* 警告横幅 */}
            <div className="w-full text-center py-3 px-6 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-400 text-sm">
              请将设备交给对应玩家后再点击确认
            </div>

            {/* 角色图标 */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-8xl select-none"
            >
              {config.icon}
            </motion.div>

            {/* 角色名 */}
            <div className="text-center">
              <h1 className={`text-4xl font-black ${config.textColor}`}>
                {config.label}的回合
              </h1>
              <p className="mt-3 text-lg text-slate-400">
                {hint}
              </p>
            </div>

            {/* 确认按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirm}
              className={`px-10 py-4 rounded-xl ${config.btnBg} ${config.btnHover} text-white text-lg font-bold 
                shadow-xl ${config.glowColor} transition-all border-2 ${config.border}`}
            >
              我是{config.label}，准备好了
            </motion.button>

            {/* 隐私提醒 */}
            <p className="text-xs text-slate-600 text-center max-w-xs">
              {targetRole === 'mastermind' 
                ? '确认后将以剧作家视角进入，可查看私密信息'
                : '确认后将以主人公视角进入，私密信息已隐藏'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
