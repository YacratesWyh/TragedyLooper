'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMissingChildStore } from '../store';
import { getCardDef, getDefaultMissingChildPlayerName, getMissingChildPlayerTheme, isMaigo } from '../types';
import type { CardRef } from '../types';
import { getDrawSourcePlayerIndex, hasPlayableCard, getWinnersByHp } from '../engine';
import { MaigoCard, DeckPile, DiscardPile } from './Card';
import { EffectPanel } from './EffectPanel';
import { BadEndOverlay } from './BadEndOverlay';
import { WaitingIndicator, MiniWaitingIndicator } from './WaitingIndicator';
import { LogPanel } from './LogPanel';
import { TestMode } from './TestMode';

const MAIGO_BG_BVID = 'BV1sN4y1T72q';
const RULE_IMAGE = '/assets/maigo/rule.png';
const MAIGO_SFX = '/assets/maigo/gugugaga.mp3';
const TOMORI_COLOR = '#77BBDD';
const DEFAULT_PLAYER_NAMES = Array.from({ length: 4 }, (_, index) => getDefaultMissingChildPlayerName(index));

let lastSfxTime = 0;
function playMaigoSfx() {
  const now = Date.now();
  if (now - lastSfxTime < 2000) return;
  lastSfxTime = now;
  const audio = new Audio(MAIGO_SFX);
  audio.play().catch(() => {});
}

import { unlockAudio } from '../audioUnlock';

function buildBilibiliSrc(bvid: string, muted: boolean) {
  return `//player.bilibili.com/player.html?isOutside=true&bvid=${bvid}&p=1&autoplay=1&danmaku=0&loop=1&t=0${muted ? '&muted=1' : ''}`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function SetupScreen({
  onStart,
  onShowRules,
}: {
  onStart: (names: string[]) => void;
  onShowRules: () => void;
}) {
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState<string[]>(DEFAULT_PLAYER_NAMES);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'ready' | 'blocked'>('idle');

  const primeAudio = useCallback(() => {
    void unlockAudio().then((ok) => {
      setAudioStatus(ok ? 'ready' : 'blocked');
    });
  }, []);

  const handleStart = async () => {
    const unlocked = await unlockAudio();
    setAudioStatus(unlocked ? 'ready' : 'blocked');
    const trimmed = names
      .slice(0, playerCount)
      .map((name, i) => (name.trim() || getDefaultMissingChildPlayerName(i)));
    onStart(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8 bg-stone-950/80 text-stone-200">
      <h1 className="text-4xl font-bold tracking-wider">
        <span className="text-red-400">迷</span>子
      </h1>

      <div
        className="w-full max-w-lg rounded-xl border border-stone-700/80 p-5 text-left space-y-3"
        style={{
          backgroundColor: 'rgba(20,12,8,0.85)',
          backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(60,30,20,0.2), transparent)',
        }}
      >
        <p className="text-sm leading-relaxed font-medium" style={{ color: TOMORI_COLOR }}>
          「迷子でもいい…迷子でも進め！！」——可高松灯没告诉你的是，企鹅病毒已经在街道上扩散。
        </p>
        <p className="text-stone-400 text-sm leading-relaxed">
          三只高松灯企鹅潜伏在 32 张牌里。它们不能打出、不能丢弃、只会在你手牌里越攒越多。每回合你必须从上家手中盲抽一张——也许是救命的街灯，也许是又一只咕咕嘎嘎的企鹅。
        </p>
        <p className="text-stone-400 text-sm leading-relaxed">
          当手牌里有企鹅、却一张光亮牌都没有时，你会永远只听到它们的叫声——<span style={{ color: TOMORI_COLOR }}>-3 SAN</span>，被拖入成为迷子的一员。全 3 轮打完，SAN 最高的人获胜。
        </p>
        <p className="text-stone-500 text-xs leading-relaxed italic">
          牌越少，越容易和企鹅独处，就更危险……如果打光全部牌……企鹅会暂时消失，这名玩家<span style={{ color: TOMORI_COLOR }}>+2 SAN</span>，Happy End。但别高兴太早——牌会重新发，企鹅还会回来。撑过 3 轮，SAN 最高的人才算真正赢了。
        </p>
      </div>

      <p className="text-stone-500 text-sm">2～4 人 · 抽鬼牌の恐怖变体 · 企鹅在看着你</p>

      <div className="flex gap-2">
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPlayerCount(n)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              playerCount === n
                ? 'bg-amber-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {n} 人
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-56">
        {Array.from({ length: playerCount }, (_, i) => (
          (() => {
            const theme = getMissingChildPlayerTheme(i);
            return (
              <input
                key={i}
                type="text"
                placeholder={getDefaultMissingChildPlayerName(i)}
                value={names[i] ?? ''}
                onChange={(e) => {
                  const next = [...names];
                  next[i] = e.target.value;
                  setNames(next);
                }}
                className="px-4 py-2 bg-stone-800 border rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none"
                style={{
                  borderColor: hexToRgba(theme.color, 0.45),
                  color: theme.color,
                }}
              />
            );
          })()
        ))}
      </div>

      <button
        type="button"
        onPointerDown={primeAudio}
        onClick={handleStart}
        className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all active:scale-95"
      >
        开始游戏并启用声音
      </button>

      <p className="text-xs text-stone-500">
        {audioStatus === 'ready' && '声音已解锁，后续音效会尽量自动播放'}
        {audioStatus === 'blocked' && '浏览器拦截了自动播放；开始后可再点一次相关按钮启用声音'}
        {audioStatus === 'idle' && '点击开始时会一并请求浏览器启用声音'}
      </p>

      <button
        type="button"
        onClick={onShowRules}
        className="text-sm text-stone-500 hover:text-amber-400 transition-colors"
      >
        规则速查
      </button>
    </div>
  );
}

/**
 * 抽牌动画覆盖层：卡背滑入 → 翻转正面 → 调用 onDone
 */
function DrawRevealOverlay({
  card,
  title,
  subtitle,
  onDone,
  requireClickToDone = false,
  doneHint,
}: {
  card: CardRef;
  title: string;
  subtitle?: string;
  onDone: () => void;
  requireClickToDone?: boolean;
  doneHint?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const doneCalledRef = useRef(false);

  const finish = () => {
    if (!doneCalledRef.current) {
      doneCalledRef.current = true;
      onDone();
    }
  };

  useEffect(() => {
    const t1 = setTimeout(() => {
      setRevealed(true);
      if (isMaigo(card.cardId)) playMaigoSfx();
    }, 500);
    const t2 = requireClickToDone
      ? undefined
      : setTimeout(() => {
          finish();
        }, 1400);
    return () => {
      clearTimeout(t1);
      if (t2 !== undefined) clearTimeout(t2);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <motion.div
      className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm ${requireClickToDone && revealed ? 'cursor-pointer' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={requireClickToDone && revealed ? finish : undefined}
    >
      <motion.p
        className="text-stone-300 text-sm mb-2 font-medium"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {title}
      </motion.p>
      {subtitle && (
        <motion.p
          className="text-stone-500 text-xs mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {subtitle}
        </motion.p>
      )}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.05 }}
      >
        <MaigoCard
          card={revealed ? card : undefined}
          faceUp={revealed}
          width={160}
          backVariant="normal"
        />
      </motion.div>
      {revealed && (
        <motion.p
          className="mt-6 text-xs text-stone-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {requireClickToDone ? (doneHint ?? '点击继续') : '结算中…'}
        </motion.p>
      )}
    </motion.div>,
    document.body,
  );
}

function EndingQuickRef({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[9996]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-12 right-4 z-[9997] w-72 rounded-xl border border-stone-700/80 p-4 text-left"
            style={{
              backgroundColor: 'rgba(12,10,8,0.96)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs font-bold text-stone-300 mb-3 tracking-wide">结局速查</p>
            <div className="space-y-2.5 text-xs leading-relaxed">
              <div>
                <span className="text-red-400 font-bold">Bad End</span>
                <span className="text-stone-500 mx-1">·</span>
                <span className="text-stone-400">手里有企鹅且没有光亮牌 → 自爆 <span className="text-red-300">-3 SAN</span>，永久出局</span>
              </div>
              <div>
                <span className="text-amber-400 font-bold">Happy End</span>
                <span className="text-stone-500 mx-1">·</span>
                <span className="text-stone-400">所有牌打光（牌库+手牌=0）→ 全员 <span className="text-amber-300">+2 SAN</span>，重新发牌进入下一轮</span>
              </div>
              <div>
                <span className="text-stone-300 font-bold">Normal End</span>
                <span className="text-stone-500 mx-1">·</span>
                <span className="text-stone-400">其他人全部自爆，仅剩最后 1 人 → <span className="text-stone-200">游戏结束</span>，该玩家获胜</span>
              </div>
              <div>
                <span className="text-purple-400 font-bold">3 轮结算</span>
                <span className="text-stone-500 mx-1">·</span>
                <span className="text-stone-400">3 轮打满仍未决出胜者 → SAN 最高者获胜（初始 7 / 上限 7）</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-800 text-[10px] text-stone-600 leading-relaxed space-y-1">
              <p>每回合：从上家盲抽 1 张 → 打出 1 张（企鹅不能打出）→ 下一家</p>
              <p>无论别人是自爆还是打光牌，最后活着的那个人进入 Normal End</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function RuleCardPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => {
    setScale(1);
    onClose();
  }, [onClose]);
  
  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.5), 3));
  }, []);
  
  if (typeof document === 'undefined') return null;
  
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            className="fixed inset-0 z-[9998] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          {/* 图片容器 - 支持滚轮缩放，点击任意位置关闭 */}
          <motion.div
            ref={containerRef}
            className="fixed inset-4 z-[9999] flex items-center justify-center overflow-hidden cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onWheel={handleWheel}
            onClick={handleClose}
          >
            <img
              src={RULE_IMAGE}
              alt="迷子 回合流程與 END 條件速查"
              className="max-w-none pointer-events-none"
              style={{ 
                transform: `scale(${scale})`,
                transition: 'transform 0.1s ease-out',
              }}
              draggable={false}
            />
          </motion.div>
          {/* 关闭按钮和缩放提示 */}
          <motion.div
            className="fixed top-4 right-4 z-[10000] flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-xs text-stone-400 bg-stone-900/80 px-2 py-1 rounded">
              滚轮缩放 {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-3 py-1 text-sm bg-stone-800 text-stone-300 hover:bg-stone-700"
            >
              关闭
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default function MissingChildGameBoard() {
  const {
    gameState,
    selectedInstanceIds,
    extraGained,
    pendingDraw,
    aquariumReveal,
    startGame,
    drawFromLeftByInstanceId,
    commitPendingDraw,
    toggleSelect,
    playSelected,
    skipTurnNoPlayable,
    confirmTurnEnd,
    confirmGameEnd,
    triggerNormalEndFromDraw,
    clearExtraGained,
    clearAquariumReveal,
    crossroadDrawDone,
    resetGame,
    skipBadEndAnimation,
  } = useMissingChildStore();

  const [bgMuted, setBgMuted] = useState(true);
  const [showRuleCard, setShowRuleCard] = useState(false);
  const [showEndingRef, setShowEndingRef] = useState(false);

  // crossroad_draw 自动结算：展示 pendingEffect.card 后触发 crossroadDrawDone
  const crossroadEffect = gameState?.pendingEffect?.type === 'crossroad_draw'
    ? gameState.pendingEffect
    : null;

  // 抽牌阶段：找第一个有手牌的上家；如果是自己则触发 Normal End
  const drawSourceIdx = gameState?.phase === 'playing'
    ? getDrawSourcePlayerIndex(gameState)
    : -1;

  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing') return;
    if (pendingDraw) return;
    if (gameState.gameEndPending || gameState.pendingEffect) return;
    const cur = gameState.players[gameState.currentPlayerIndex];
    
    // 当前玩家已死亡（HE/BE），自动进入下一位
    if (!cur.alive) {
      confirmTurnEnd();
      return;
    }
    
    if (gameState.turnEndPending || cur.drawnCard !== null) return;
    if (drawSourceIdx === gameState.currentPlayerIndex) {
      triggerNormalEndFromDraw();
    }
  }, [confirmTurnEnd, drawSourceIdx, gameState, pendingDraw, triggerNormalEndFromDraw]);

  const prevLogCountRef = useRef(0);
  useEffect(() => {
    if (!gameState) return;
    const logs = gameState.logs;
    if (logs.length > prevLogCountRef.current) {
      const newLogs = logs.slice(prevLogCountRef.current);
      if (newLogs.some(l => l.type === 'bad_end')) playMaigoSfx();
      prevLogCountRef.current = logs.length;
    }
  }, [gameState]);

  useEffect(() => {
    if (extraGained > 0) {
      const t = setTimeout(() => clearExtraGained(), 1200);
      return () => clearTimeout(t);
    }
  }, [extraGained, clearExtraGained]);

  let content: React.ReactNode;
  if (!gameState) {
    content = (
      <SetupScreen onStart={startGame} onShowRules={() => setShowRuleCard(true)} />
    );
  } else if (gameState.phase === 'game_end') {
    const reason = gameState.endReason;
    const winnersByHp = getWinnersByHp(gameState.players);
    const lastAlive = gameState.players.find((p) => p.alive);

    let title = '游戏结束';
    let message: React.ReactNode = null;
    if (reason === 'Good') {
      title = 'Happy End';
      message = <p className="text-amber-300">牌打光，大家平安离开。</p>;
    } else if (reason === 'Normal') {
      title = 'Normal End';
      message = lastAlive ? (
        <p className="text-stone-400">
          <span className="font-bold" style={{ color: getMissingChildPlayerTheme(lastAlive.id).color }}>{lastAlive.name}</span> 最后一人存活获胜
        </p>
      ) : (
        <p className="text-stone-400">无人存活</p>
      );
    } else if (reason === 'RoundsComplete') {
      title = '3 轮结束';
      message =
        winnersByHp.length > 0 ? (
          <p className="text-stone-400">
            SAN 最高：{' '}
            {winnersByHp.map((p, i) => (
              <span key={p.id}>
                {i > 0 && '、'}
                <span className="font-bold" style={{ color: getMissingChildPlayerTheme(p.id).color }}>{p.name}</span>
              </span>
            ))}
            {winnersByHp.length > 1 && '（并列）'}
          </p>
        ) : (
          <p className="text-stone-400">无人存活</p>
        );
    } else {
      message = lastAlive ? (
        <p className="text-stone-400">
          <span className="font-bold" style={{ color: getMissingChildPlayerTheme(lastAlive.id).color }}>{lastAlive.name}</span> 获胜
        </p>
      ) : (
        <p className="text-stone-400">无人存活</p>
      );
    }

    content = (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-stone-950/80 text-stone-200">
        <h2 className="text-2xl font-bold">{title}</h2>
        {message}
        <div className="flex flex-col gap-1 text-sm text-stone-500">
          {gameState.players.map((p) => (
            <span key={p.id}>
              <span className="mc-player-list-font" style={{ color: getMissingChildPlayerTheme(p.id).color }}>{p.name}</span> —{' '}
              {p.badEnded
                ? `💀 Bad End（-3SAN）最终 ${p.hp} SAN`
                : p.happyEnded
                  ? `🌟 Happy End（+2SAN）最终 ${p.hp} SAN`
                  : `${p.hp} SAN`}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={resetGame}
          className="px-6 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
        >
          返回
        </button>
      </div>
    );
  } else {
    const cur = gameState.players[gameState.currentPlayerIndex];
    // 防御：当前玩家不存在时显示错误
    if (!cur) {
      content = (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-stone-950/80 text-stone-200">
          <h2 className="text-2xl font-bold">游戏状态错误</h2>
          <p className="text-stone-400">当前玩家不存在，请重新开始游戏</p>
          <button
            type="button"
            onClick={resetGame}
            className="px-6 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
          >
            返回
          </button>
        </div>
      );
    } else {
    const currentTheme = getMissingChildPlayerTheme(cur.id);
    const leftPlayer = gameState.players[drawSourceIdx];
    const turnEndPending = !!gameState.turnEndPending;
    const needDraw =
      !turnEndPending &&
      !gameState.gameEndPending &&
      cur.alive &&
      cur.drawnCard === null &&
      !pendingDraw &&
      drawSourceIdx !== gameState.currentPlayerIndex;
    const playsLeft = gameState.playsLeft ?? 1;
    const canPlay =
      !turnEndPending &&
      cur.alive &&
      !cur.actionEnd &&
      cur.drawnCard !== null &&
      selectedInstanceIds.length > 0 &&
      playsLeft > 0;
    const noPlayable =
      !turnEndPending &&
      cur.alive &&
      cur.drawnCard !== null &&
      !cur.actionEnd &&
      !hasPlayableCard(gameState);
    
    // 热座模式下当前玩家就是当前回合玩家
    const currentPlayerIndex = gameState.currentPlayerIndex;

    content = (
      <div className="flex flex-col min-h-screen bg-stone-950/80 text-stone-200 lg:pr-80">
      {/* 日志面板 */}
      <LogPanel gameState={gameState} currentPlayerIndex={currentPlayerIndex} />
      
      {/* 效果选择面板 */}
      <EffectPanel gameState={gameState} currentPlayerIndex={currentPlayerIndex} />
      
      {/* 等待指示器 */}
      <WaitingIndicator gameState={gameState} currentPlayerIndex={currentPlayerIndex} />
      
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-900/80">
        <span className="text-sm text-stone-400 flex items-center gap-2">
          <span>第 <span className="font-bold text-stone-200">{gameState.round + 1}</span>/3 轮</span>
          <span className="text-stone-600">·</span>
          <span>第 <span className="font-bold text-stone-200">{gameState.turn ?? 1}</span> 回合</span>
          <span className="text-stone-600">·</span>
          <span>当前：<span className="font-bold" style={{ color: currentTheme.color }}>{cur.name}</span></span>
          <span className="text-amber-300">剩余行动 {playsLeft}</span>
          <span className="text-stone-500">每回合：抽牌 → 行动</span>
          {cur.badEnded && <span className="text-red-400">（自爆）</span>}
          {cur.happyEnded && <span style={{ color: '#00CCAA' }}>（逃离）</span>}
          {gameState.protectedDraw && (
            <span className="text-purple-400">
              {gameState.protectedDraw.source === 'amulet' ? '🔮 护身符' : '⚡ 灯塔'}生效中
            </span>
          )}
          <MiniWaitingIndicator gameState={gameState} currentPlayerIndex={currentPlayerIndex} />
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEndingRef(v => !v)}
            className="text-xs text-stone-500 hover:text-amber-400 transition-colors"
          >
            结局速查
          </button>
          <button
            type="button"
            onClick={() => setShowRuleCard(true)}
            className="text-xs text-stone-500 hover:text-amber-400 transition-colors"
          >
            规则速查
          </button>
          <button
            type="button"
            onClick={resetGame}
            className="text-xs text-stone-500 hover:text-stone-300"
          >
            结束游戏
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6 relative">
        {/* 获得额外行动时的浮现动画 */}
        <AnimatePresence>
          {extraGained > 0 && (
            <motion.div
              key="extra-gained"
              className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <motion.div
                className="rounded-xl bg-amber-500/95 px-8 py-4 text-2xl font-bold text-amber-950 shadow-xl"
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.1, opacity: 0, y: -30 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }}
              >
                行动+{extraGained}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Normal End：等待玩家确认进入终局结算 */}
        {gameState.gameEndPending && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-red-500/50 bg-red-950/30 p-6 text-center"
          >
            <p className="text-red-200/90 mb-2 font-bold text-lg">游戏结束 — Normal End</p>
            <p className="text-stone-400 text-sm mb-4">
              {gameState.players.find(p => p.alive)?.name ?? '无人'} 最后一人存活
            </p>
            <button
              type="button"
              onClick={confirmGameEnd}
              className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
            >
              确认进入结算
            </button>
          </motion.section>
        )}

        {/* 本回合已结束，等待当前玩家确认后进入下一位 */}
        {turnEndPending && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-amber-500/50 bg-amber-950/30 p-6 text-center"
          >
            <p className="text-amber-200/90 mb-4">本回合已结束</p>
            <button
              type="button"
              onClick={confirmTurnEnd}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-amber-950 font-bold rounded-xl transition-colors"
            >
              确认结束回合
            </button>
          </motion.section>
        )}

        {/* 抽牌阶段：从上家手牌选一张 */}
        {needDraw && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4"
          >
            <p className="text-sm font-medium text-amber-200/90 mb-3">
              抽一张牌：{gameState.protectedDraw 
                ? `${gameState.players[gameState.protectedDraw.pickedBy].name} 使用${gameState.protectedDraw.source === 'amulet' ? '护身符' : '灯塔'}，请为 ${leftPlayer.name} 挑选一张牌` 
                : `点击上家手牌中的一张抽取`}
            </p>
            <div className="flex flex-wrap items-end gap-4">
              {leftPlayer.hand.length > 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-stone-500">
                    {leftPlayer.name} 的手牌（{gameState.protectedDraw ? '正面选择' : '看背面点一张抽取'}）
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {leftPlayer.hand.map((card) => {
                      // 护身符/灯塔约束：判断该牌是否可被选中
                      let isDisabled = false;
                      let isHighlighted = false;
                      if (gameState.protectedDraw && leftPlayer.hand.length > 1) {
                        const { source, instanceId: markedId } = gameState.protectedDraw;
                        if (source === 'amulet' && card.instanceId === markedId) {
                          isDisabled = true; // 护身符：被保护的牌不能选
                        }
                        if (source === 'lighthouse' && card.instanceId !== markedId) {
                          isDisabled = true; // 灯塔：只能选被指定的牌
                        }
                        if (source === 'lighthouse' && card.instanceId === markedId) {
                          isHighlighted = true; // 灯塔：高亮被指定的牌
                        }
                      }
                      
                      return (
                        <div key={card.instanceId} className="relative">
                          <MaigoCard
                            card={gameState.protectedDraw ? card : undefined}
                            faceUp={!!gameState.protectedDraw}
                            width={96}
                            backVariant="normal"
                            onClick={isDisabled ? undefined : () => drawFromLeftByInstanceId(card.instanceId)}
                            className={isDisabled ? 'opacity-30 grayscale' : isHighlighted ? 'ring-2 ring-amber-400' : ''}
                          />
                          {isDisabled && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-2xl">🚫</span>
                            </div>
                          )}
                          {isHighlighted && (
                            <div className="absolute -top-2 -right-2 bg-amber-500 text-amber-950 text-xs font-bold px-2 py-0.5 rounded-full">
                              必须抽
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-stone-500 text-sm">上家手牌为空，无法抽牌</p>
              )}
            </div>
          </motion.section>
        )}

        {/* 本回合抽到的牌 */}
        {cur.drawnCard !== null && (
          <section>
            <p className="text-xs text-stone-500 mb-2">本回合抽到的牌</p>
            <MaigoCard card={cur.drawnCard} faceUp width={100} />
          </section>
        )}

        {/* 手牌：卡牌正面，可多选坏掉的街灯 */}
        {cur.hand.length > 0 && (
          <section className={needDraw ? 'opacity-40' : ''}>
            <p className="text-xs text-stone-500 mb-2">
              手牌（迷子不能打出；可多选「坏掉的街灯」一起打出）
            </p>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {cur.hand.map((c) => (
                  <motion.div
                    key={c.instanceId}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <MaigoCard
                      card={c}
                      faceUp
                      width={100}
                      selected={selectedInstanceIds.includes(c.instanceId)}
                      onClick={() => {
                        if (cur.drawnCard === null || cur.actionEnd) return;
                        const def = getCardDef(c.cardId);
                        if (def && (def.id >= 18 && def.id <= 22)) {
                          toggleSelect(c.instanceId);
                        } else if (!isMaigo(c.cardId)) {
                          toggleSelect(c.instanceId);
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {canPlay && (
          <button
            type="button"
            onClick={playSelected}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium"
          >
            打出选中
          </button>
        )}
        {noPlayable && (
          <p className="text-sm text-stone-500">
            手中仅有迷子，无法出牌 ·{' '}
            <button
              type="button"
              onClick={skipTurnNoPlayable}
              className="text-amber-400 hover:underline"
            >
              跳过回合
            </button>
          </p>
        )}

        {gameState.gameEndPending && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/20 px-4 py-3">
            <p className="text-sm text-red-200">
              已触发 <span className="font-bold">Normal End</span> · 点击上方按钮进入结算
            </p>
          </div>
        )}
      </div>

      {/* mb-20 为左下角路由按钮留出空间 */}
      <div className="p-4 border-t border-stone-800 space-y-3 mb-20">
        {/* 弃牌堆展示 */}
        <DiscardPile discard={gameState.discard} />
        
        {/* 牌库和玩家状态 */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {/* 牌库尺寸加大 */}
            <DeckPile count={gameState.deck.length} width={60} topIsMaigo={gameState.deckTopIsMaigo} />
            <span className="text-xs text-stone-500">牌库</span>
            {gameState.deckTopIsMaigo && <span className="text-[10px] text-red-400">迷子在顶!</span>}
          </div>
          <span className="text-xs text-stone-500">
            弃牌 {gameState.discard.length} 张
          </span>
          <div className="flex flex-wrap gap-2">
            {gameState.players.map((p) => {
              const isHE = Boolean(p.happyEnded);
              const isBE = Boolean(p.badEnded);
              const theme = getMissingChildPlayerTheme(p.id);

              return (
                <span
                  key={p.id}
                  className="px-2 py-1 rounded text-sm"
                  style={{
                    backgroundColor: isBE
                      ? 'rgba(127, 29, 29, 0.3)'
                      : isHE
                        ? 'rgba(120, 53, 15, 0.3)'
                        : hexToRgba(theme.color, 0.16),
                    color: isBE ? '#fca5a5' : isHE ? '#fcd34d' : theme.color,
                    border: `1px solid ${p.id === gameState.currentPlayerIndex ? theme.color : hexToRgba(theme.color, 0.35)}`,
                    boxShadow: p.id === gameState.currentPlayerIndex ? `0 0 0 1px ${hexToRgba(theme.color, 0.35)}` : undefined,
                  }}
                >
                  <span className="mc-player-list-font">{p.name}</span> SAN{p.hp} · {p.hand.length}张
                  {isBE && <span className="ml-1 text-red-400">💀BE</span>}
                  {isHE && <span className="ml-1 text-amber-400">🌟HE</span>}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    );
  }
  }

  return (
    <div className="relative min-h-screen">
      <iframe
        title="Bilibili 背景"
        src={buildBilibiliSrc(MAIGO_BG_BVID, bgMuted)}
        className="fixed inset-0 w-full h-full pointer-events-none opacity-20 z-0"
        style={{ border: 'none' }}
        allow="autoplay"
        allowFullScreen
      />
      <div className="relative z-10 flex flex-col min-h-screen">
        {content}
      </div>

      {/* 回合开始抽牌动画 */}
      <AnimatePresence>
        {pendingDraw && (
          <DrawRevealOverlay
            key={pendingDraw.animKey}
            card={pendingDraw.card}
            title={`从 ${pendingDraw.fromPlayerName} 的手牌中抽取`}
            onDone={commitPendingDraw}
          />
        )}
      </AnimatePresence>

      {/* 平交道抽牌动画（crossroad_draw） */}
      <AnimatePresence>
        {crossroadEffect?.card && (
          <DrawRevealOverlay
            key={`crossroad-${crossroadEffect.card.instanceId}`}
            card={crossroadEffect.card}
            title={isMaigo(crossroadEffect.card.cardId) ? '平交道：当前自爆的牌' : '平交道：从牌库顶抽取'}
            subtitle={isMaigo(crossroadEffect.card.cardId) ? '抽到了迷子，点击进入下一位' : undefined}
            requireClickToDone={isMaigo(crossroadEffect.card.cardId)}
            doneHint={isMaigo(crossroadEffect.card.cardId) ? '点击进入下一位' : undefined}
            onDone={crossroadDrawDone}
          />
        )}
      </AnimatePresence>

      {/* 水族馆：展示当前玩家收到的牌 */}
      <AnimatePresence>
        {aquariumReveal && (
          <DrawRevealOverlay
            key={`aquarium-${aquariumReveal.receivedCard.instanceId}`}
            card={aquariumReveal.receivedCard}
            title={`水族馆：${aquariumReveal.playerName} 收到了`}
            subtitle={isMaigo(aquariumReveal.receivedCard.cardId) ? '是迷子…' : undefined}
            onDone={clearAquariumReveal}
          />
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setBgMuted((m) => !m)}
        className="fixed bottom-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-stone-900/80 border border-stone-700 text-sm hover:bg-stone-800 transition-colors"
        title={bgMuted ? '取消静音' : '静音'}
      >
        {bgMuted ? '🔇' : '🔊'}
      </button>
      <RuleCardPanel open={showRuleCard} onClose={() => setShowRuleCard(false)} />
      <EndingQuickRef open={showEndingRef} onClose={() => setShowEndingRef(false)} />
      
      {/* 测试模式（开发调试用） */}
      <TestMode />

      {/* BE动画覆盖层 */}
      {gameState?.badEndAnimation && (
        <BadEndOverlay
          playerName={gameState.players[gameState.badEndAnimation.playerIndex].name}
          hand={gameState.badEndAnimation.hand}
          description={gameState.badEndAnimation.description}
          onSkip={skipBadEndAnimation}
        />
      )}
    </div>
  );
}
