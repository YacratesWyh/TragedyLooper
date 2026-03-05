'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePoisonStore } from '../store';
import type { Card, Cauldron, Player, PotionColor } from '../types';
import { ALL_COLORS, COLOR_CSS, COLOR_LABELS, POTION_COLORS } from '../types';
import { getTotalScores, getWinner } from '../engine';
import { ChevronDown, BookOpen, Users, Wifi, WifiOff, Plus, LogIn, ArrowLeft } from 'lucide-react';
import { usePoisonMultiplayer } from '../usePoisonMultiplayer';

// ─── Bilibili background ───

const DEFAULT_BVID = 'BV1iq1MBFEtG';
const BG_BVID_KEY = 'poison-bg-bvid';

function parseBilibiliBvid(input: string): string | null {
  const m = input.match(/BV[a-zA-Z0-9]+/);
  return m ? m[0] : null;
}

function buildBilibiliSrc(bvid: string, muted: boolean) {
  return `//player.bilibili.com/player.html?isOutside=true&bvid=${bvid}&p=1&autoplay=1&danmaku=0&loop=1&t=0${muted ? '&muted=1' : ''}`;
}

// ─── Rules Dropdown ───

function RulesDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          ${open ? 'bg-amber-600/30 border-amber-500 text-amber-300' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'}
          border`}
      >
        <BookOpen size={14} />
        <span>规则</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="fixed left-1/2 top-4 -translate-x-1/2 w-[460px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[9999] overflow-hidden"
              >
                <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-amber-900/30 to-slate-900">
                  <h3 className="font-bold text-amber-400 flex items-center gap-2">
                    <BookOpen size={16} />
                    Poison 规则速览
                  </h3>
                  <p className="mt-2 text-xs text-slate-400 italic leading-relaxed">你们是一群乖僻的魔女，围坐在沸腾的大锅旁竞相投入药水。只有独饮者才能获得真谛——但也有心存怨恨的家伙准备了毒药……</p>
                </div>
                <div className="p-4 space-y-3 text-sm text-slate-300 max-h-[60vh] overflow-y-auto leading-relaxed">
                  <RuleSection title="轮到你了！">
                    从手里<b className="text-white">挑一瓶药水</b>，丢进任意一口大锅。每口锅只容纳一种颜色——但<span className="text-emerald-400">毒药</span>例外，它可以偷偷混入任何锅。
                  </RuleSection>
                  <RuleSection title="小心炸锅！">
                    锅里的数字加起来<b className="text-red-400">超过 13</b> 就炸了！谁炸的谁<b className="text-white">喝掉锅里全部药水</b>。所以——往哪口锅丢，想清楚。
                  </RuleSection>
                  <RuleSection title="毒药">
                    <span className="text-emerald-400">毒药</span>是最危险的牌：可以丢进<b className="text-white">任何一口锅</b>，每瓶扣 <b className="text-amber-300">2 分</b>（普通药水只扣 1 分），而且<b className="text-red-400">不能被免罚</b>。
                  </RuleSection>
                  <RuleSection title="独饮真谛">
                    一轮结束，看<span className="text-red-400">红</span>/<span className="text-blue-400">蓝</span>/<span className="text-purple-400">紫</span>三种颜色：如果你收的某色<b className="text-white">比所有人都多且没人并列</b>，就算"独饮"成功。该色药水<b className="text-amber-300">全部免罚</b>。
                  </RuleSection>
                  <RuleSection title="怎么算分">
                    <b className="text-amber-300">罚分越少越好！</b>没免罚的药水每瓶扣 1 分，毒药每瓶扣 2 分。所有人打光手牌算一轮，总罚分最少的魔女赢。
                  </RuleSection>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function RuleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</div>
      <div>{children}</div>
    </div>
  );
}

// ─── Card Component ───

const CARD_IMAGES: Record<string, string> = {
  red: '/assets/poison/red.png',
  blue: '/assets/poison/blue.png',
  purple: '/assets/poison/purple.png',
  poison: '/assets/poison/poison.png',
};

function PoisonCard({
  card,
  selected,
  disabled,
  onClick,
  small,
}: {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  small?: boolean;
}) {
  const style = COLOR_CSS[card.color];
  const size = small ? 'w-10 h-14' : 'w-16 h-24';
  const Tag = disabled ? motion.div : motion.button;

  return (
    <Tag
      layout
      onClick={disabled ? undefined : onClick}
      {...(!disabled && { type: 'button' as const })}
      className={`${size} rounded-lg border-2 relative overflow-hidden
        ${style.border}
        ${selected ? 'ring-2 ring-yellow-400 -translate-y-3 scale-110 shadow-lg shadow-yellow-400/30' : ''}
        ${disabled ? 'opacity-50' : 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:brightness-110'}
        transition-all duration-150`}
      style={{ backgroundImage: `url(${CARD_IMAGES[card.color]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
    >
      <span className={`absolute inset-0 flex items-center justify-center font-black drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] text-white
        ${small ? 'text-base' : 'text-2xl'}`}>
        {card.value}
      </span>
    </Tag>
  );
}

// ─── Cauldron Component ───

function CauldronDisplay({
  cauldron,
  index,
  playable,
  onDrop,
  exploding,
  toast,
}: {
  cauldron: Cauldron;
  index: number;
  playable: boolean;
  onDrop: () => void;
  exploding: boolean;
  toast: { text: string; sub: string } | null;
}) {
  const colorStyle = cauldron.lockedColor ? COLOR_CSS[cauldron.lockedColor] : null;
  const borderColor = colorStyle ? colorStyle.border : 'border-slate-600';
  const bgColor = colorStyle ? colorStyle.bg.replace('/70', '/20') : 'bg-slate-800/30';

  const pct = Math.min(100, (cauldron.total / 13) * 100);
  const barColor = cauldron.total > 10 ? 'bg-red-500' : cauldron.total > 7 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <motion.button
      type="button"
      aria-label={`大锅 ${index + 1}${cauldron.lockedColor ? ` (${cauldron.lockedColor})` : ''}, 合计 ${cauldron.total}`}
      className={`relative flex flex-col items-center p-5 rounded-2xl border-2 w-[240px]
        ${bgColor} ${borderColor}
        ${playable ? 'ring-2 ring-yellow-400/60 cursor-pointer hover:bg-slate-700/40' : ''}
        transition-all`}
      onClick={playable ? onDrop : undefined}
      disabled={!playable}
      animate={exploding ? { x: [-6, 6, -6, 6, -3, 3, 0], transition: { duration: 0.5 } } : {}}
    >
      {/* Explosion overlay */}
      <AnimatePresence>
        {exploding && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-orange-500/30 pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.2, 1.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
        )}
      </AnimatePresence>

      {/* Explosion toast — anchored to this cauldron */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              className="text-3xl font-black text-orange-400 whitespace-nowrap"
              style={{ textShadow: '0 0 14px #f97316, 0 0 28px #ea580c, 0 3px 0 #7c2d12' }}
              initial={{ scale: 0.3, rotate: -12 }}
              animate={{ scale: 1, rotate: [0, 4, -4, 0] }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {toast.text}
            </motion.span>
            <motion.span
              className="mt-1 text-xs text-orange-200/90 font-medium whitespace-nowrap"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              {toast.sub}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pot image — large, centered */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <img src="/assets/poison/pot.png" alt="" className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-black tabular-nums drop-shadow-[0_2px_6px_rgba(0,0,0,1)] ${cauldron.total > 10 ? 'text-red-400' : 'text-white'}`}>
            {cauldron.total}
          </span>
          <span className="text-xs text-slate-300/80 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">/ 13</span>
        </div>
      </div>

      {/* Color tag + progress bar */}
      <div className="w-full flex items-center gap-2 mt-1">
        {cauldron.lockedColor ? (
          <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${COLOR_CSS[cauldron.lockedColor].bg} ${COLOR_CSS[cauldron.lockedColor].text}`}>
            {COLOR_LABELS[cauldron.lockedColor]}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-xs shrink-0 bg-slate-700/60 text-slate-500">
            {cauldron.cards.length > 0 ? '?' : '—'}
          </span>
        )}
        <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Cards in cauldron */}
      <div className="flex flex-wrap gap-1 justify-center mt-2 min-h-[50px]">
        <AnimatePresence>
          {cauldron.cards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ scale: 0, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PoisonCard card={card} small disabled />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {playable && (
        <div className="absolute bottom-2 text-xs text-yellow-400 animate-pulse font-medium">
          点击放入
        </div>
      )}
    </motion.button>
  );
}

// ─── Setup Screen ───

function SetupScreen({ onStart }: { onStart: (names: string[]) => void }) {
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState<string[]>(['', '', '', '', '', '']);

  const handleStart = () => {
    const trimmed = names.slice(0, playerCount).map((n, i) => n.trim() || `P${i + 1}`);
    onStart(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <h1 className="text-4xl font-bold">Poison</h1>
      <p className="text-slate-400">设置玩家人数和名称</p>

      <div className="flex gap-2">
        {[3, 4, 5, 6].map(n => (
          <button
            key={n}
            onClick={() => setPlayerCount(n)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              playerCount === n
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {n}人
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-64">
        {Array.from({ length: playerCount }, (_, i) => (
          <input
            key={i}
            type="text"
            placeholder={`玩家 ${i + 1}`}
            value={names[i]}
            onChange={e => {
              const next = [...names];
              next[i] = e.target.value;
              setNames(next);
            }}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200
              placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        ))}
      </div>

      <button
        onClick={handleStart}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl
          transition-all active:scale-95 text-lg"
      >
        开始游戏
      </button>
    </div>
  );
}

// ─── Mode Selection ───

function ModeSelectionScreen({ onSelect }: { onSelect: (mode: 'hotseat' | 'online') => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-10 p-8 bg-slate-950">
      <div className="text-center">
        <h1 className="text-5xl font-black mb-3 tracking-tight">Poison</h1>
        <p className="text-slate-400">ポイズン · Reiner Knizia</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => onSelect('hotseat')}
          className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl bg-slate-800 border border-slate-700
            hover:bg-slate-700 hover:border-slate-500 transition-all active:scale-95 min-w-[180px]"
        >
          <Users size={40} className="text-amber-400" />
          <span className="font-bold text-lg">热座模式</span>
          <span className="text-sm text-slate-400 text-center">所有玩家共用同一设备</span>
        </button>
        <button
          onClick={() => onSelect('online')}
          className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl bg-slate-800 border border-slate-700
            hover:bg-slate-700 hover:border-blue-500 transition-all active:scale-95 min-w-[180px]"
        >
          <Wifi size={40} className="text-blue-400" />
          <span className="font-bold text-lg">联机模式</span>
          <span className="text-sm text-slate-400 text-center">每人用自己的设备</span>
        </button>
      </div>
    </div>
  );
}

// ─── Online Lobby ───

function PoisonLobbyScreen({
  mp,
  onBack,
}: {
  mp: ReturnType<typeof usePoisonMultiplayer>;
  onBack: () => void;
}) {
  const [nameInput, setNameInput] = useState(mp.username ?? '');
  const [roomInput, setRoomInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [view, setView] = useState<'main' | 'create' | 'join'>('main');

  const handleConnect = () => {
    if (!nameInput.trim()) return;
    mp.setName(nameInput.trim());
    mp.connect();
  };

  const handleCreate = () => {
    if (!newRoomName.trim()) return;
    mp.createRoom(newRoomName.trim());
  };

  const handleJoin = (rid: string) => {
    mp.joinRoom(rid);
  };

  if (!mp.isConnected && !mp.isReconnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-slate-950">
        <button onClick={onBack} className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={18} /> 返回
        </button>
        <h2 className="text-2xl font-bold">联机 · Poison</h2>
        <div className="flex flex-col gap-3 w-72">
          <input
            type="text"
            placeholder="输入你的名字"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200
              placeholder-slate-500 focus:outline-none focus:border-blue-500 text-center font-medium"
          />
          <button
            onClick={handleConnect}
            disabled={!nameInput.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500
              text-white font-bold rounded-xl transition-all active:scale-95"
          >
            连接服务器
          </button>
        </div>
      </div>
    );
  }

  if (mp.isReconnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-950">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">正在连接服务器...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen gap-6 p-8 bg-slate-950">
      <div className="flex items-center justify-between w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={18} /> 返回
        </button>
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Wifi size={14} />
          <span>已连接 · {mp.username}</span>
        </div>
      </div>

      <h2 className="text-2xl font-bold">选择房间</h2>

      {/* 重连提示 */}
      {mp.pendingSession && (
        <div className="w-full max-w-md p-4 rounded-xl bg-amber-900/30 border border-amber-600/40 space-y-3">
          <p className="text-sm text-amber-300">
            你在房间 <span className="font-bold text-amber-200">{mp.pendingSession.roomName}</span> 有未完成的游戏
          </p>
          <div className="flex gap-3">
            <button
              onClick={mp.rejoinPending}
              className="flex-1 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all"
            >
              重连
            </button>
            <button
              onClick={mp.dismissPending}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-all"
            >
              不了
            </button>
          </div>
        </div>
      )}

      {view === 'main' && (
        <div className="flex flex-col gap-3 w-full max-w-md">
          <button
            onClick={() => setView('create')}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600/20 border border-blue-600/50
              hover:bg-blue-600/30 rounded-xl font-bold text-blue-300 transition-all"
          >
            <Plus size={20} /> 创建新房间
          </button>
          <button
            onClick={() => { mp.refreshRooms(); setView('join'); }}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 border border-slate-700
              hover:bg-slate-700 rounded-xl font-medium text-slate-300 transition-all"
          >
            <LogIn size={20} /> 加入已有房间
          </button>
        </div>
      )}

      {view === 'create' && (
        <div className="flex flex-col gap-3 w-full max-w-md">
          <button onClick={() => setView('main')} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm mb-2">
            <ArrowLeft size={14} /> 返回
          </button>
          <input
            type="text"
            placeholder="房间名称"
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200
              placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleCreate}
            disabled={!newRoomName.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500
              text-white font-bold rounded-xl transition-all active:scale-95"
          >
            创建房间
          </button>
        </div>
      )}

      {view === 'join' && (
        <div className="flex flex-col gap-3 w-full max-w-md">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setView('main')} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm">
              <ArrowLeft size={14} /> 返回
            </button>
            <button onClick={mp.refreshRooms} className="text-xs text-slate-500 hover:text-slate-300">刷新</button>
          </div>
          {mp.rooms.length === 0 ? (
            <p className="text-center text-slate-500 py-8">暂无房间</p>
          ) : (
            mp.rooms.map(r => (
              <button
                key={r.id}
                onClick={() => handleJoin(r.id)}
                className="flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700
                  hover:bg-slate-700 rounded-xl transition-all text-left"
              >
                <span className="font-medium">{r.name}</span>
                <span className="text-sm text-slate-400">{r.playerCount} 人</span>
              </button>
            ))
          )}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="直接输入房间 ID"
              value={roomInput}
              onChange={e => setRoomInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm
                placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => roomInput.trim() && handleJoin(roomInput.trim())}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-all"
            >
              加入
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Online Wait / Setup ───

function OnlineWaitScreen({
  mp,
  onStartGame,
}: {
  mp: ReturnType<typeof usePoisonMultiplayer>;
  onStartGame: (names: string[]) => void;
}) {
  const MAX_PLAYERS = 6;
  const canStart = mp.isHost && mp.connectedCount >= 2;
  const waitingForSlot = mp.myPlayerIndex === null && !mp.isSpectator;

  useEffect(() => {
    if (!waitingForSlot) return;
    if (mp.connectedCount >= MAX_PLAYERS) {
      mp.spectate();
    } else {
      mp.claimSlot();
    }
  }, [waitingForSlot, mp.connectedCount, mp.claimSlot, mp.spectate]);

  const handleStart = () => {
    const names = mp.playerNames.length > 0
      ? mp.playerNames
      : Array.from({ length: mp.connectedCount }, (_, i) => `玩家 ${i + 1}`);
    onStartGame(names);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8 bg-slate-950">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {mp.isSpectator ? '旁观中' : '等待玩家加入'}
        </h2>
        <p className="text-slate-400 text-sm">
          房间 · {mp.roomName}
          {mp.isHost && <span className="ml-2 px-2 py-0.5 bg-amber-600/30 text-amber-400 rounded text-xs">房主</span>}
          {mp.isSpectator && <span className="ml-2 px-2 py-0.5 bg-slate-600/30 text-slate-300 rounded text-xs">旁观</span>}
        </p>
      </div>

      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6">
        <p className="text-sm text-slate-400 mb-4">在线玩家 ({mp.connectedCount})</p>
        <div className="space-y-2">
          {mp.playerNames.length > 0 ? (
            mp.playerNames.map((name, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-800 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm font-medium">{name}</span>
                {i === mp.myPlayerIndex && (
                  <span className="ml-auto text-xs text-blue-400">你</span>
                )}
              </div>
            ))
          ) : (
            Array.from({ length: Math.max(mp.connectedCount, 1) }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-800 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${i < mp.connectedCount ? 'bg-green-400' : 'bg-slate-600'}`} />
                <span className="text-sm text-slate-400">
                  {i < mp.connectedCount ? `玩家 ${i + 1}` : '等待中...'}
                </span>
                {i === mp.myPlayerIndex && <span className="ml-auto text-xs text-blue-400">你</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {mp.isSpectator ? (
        <p className="text-slate-400 text-sm">正在旁观，等待游戏开始...</p>
      ) : mp.isHost ? (
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500
            text-white font-bold rounded-xl transition-all active:scale-95 text-lg"
        >
          {canStart ? '开始游戏' : `至少需要 2 人（当前 ${mp.connectedCount} 人）`}
        </button>
      ) : (
        <p className="text-slate-400 text-sm">等待房主开始游戏...</p>
      )}

      <button
        onClick={mp.leaveRoom}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
      >
        <WifiOff size={14} /> 离开房间
      </button>
    </div>
  );
}

// ─── Scoring Overlay ───

function ScoringOverlay({ onAction }: { onAction?: () => void }) {
  const { gameState, scoringResult, nextRound } = usePoisonStore();
  if (!gameState || !scoringResult) return null;

  const isGameOver = gameState.round >= gameState.totalRounds;
  const totals = getTotalScores(scoringResult.players);

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isGameOver ? '游戏结束' : `第 ${gameState.round} 轮结算`}
        </h2>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2">玩家</th>
              {POTION_COLORS.map(c => (
                <th key={c} className={`text-center py-2 ${COLOR_CSS[c].text}`}>{COLOR_LABELS[c]}</th>
              ))}
              <th className="text-center py-2 text-emerald-300">毒</th>
              <th className="text-center py-2 text-amber-400">本轮</th>
              {isGameOver && <th className="text-center py-2 text-yellow-300">总分</th>}
            </tr>
          </thead>
          <tbody>
            {scoringResult.players.map((p, i) => {
              const discardedIds = new Set((scoringResult.discards.get(p.id) ?? []).map(c => c.id));
              const colorCounts: Record<string, { total: number; discarded: number }> = {};
              for (const c of POTION_COLORS) {
                const all = p.collected.filter(card => card.color === c);
                const disc = all.filter(card => discardedIds.has(card.id));
                colorCounts[c] = { total: all.length, discarded: disc.length };
              }
              const poisonCount = p.collected.filter(card => card.color === 'poison').length;
              const roundScore = scoringResult.roundScores[i];

              return (
                <tr key={p.id} className="border-b border-slate-800">
                  <td className="py-2 font-medium">{p.name}</td>
                  {POTION_COLORS.map(c => (
                    <td key={c} className="text-center py-2">
                      {colorCounts[c].total > 0 ? (
                        <span>
                          {colorCounts[c].discarded > 0 ? (
                            <span className="line-through text-slate-500">{colorCounts[c].total}</span>
                          ) : (
                            colorCounts[c].total
                          )}
                        </span>
                      ) : '-'}
                    </td>
                  ))}
                  <td className="text-center py-2 text-emerald-400">{poisonCount || '-'}</td>
                  <td className="text-center py-2 font-bold text-amber-400">{roundScore}</td>
                  {isGameOver && <td className="text-center py-2 font-bold text-yellow-300">{totals[i]}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>

        {isGameOver && (
          <div className="text-center mb-4 text-lg">
            <span className="text-yellow-400 font-bold">{getWinner(scoringResult.players).name}</span>
            <span className="text-slate-300"> 获胜!</span>
          </div>
        )}

        <button
          onClick={() => {
            if (isGameOver) {
              usePoisonStore.getState().resetGame();
            } else {
              nextRound();
            }
            onAction?.();
          }}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl
            transition-all active:scale-95"
        >
          {isGameOver ? '返回' : '下一轮'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Game Board ───

export default function PoisonGameBoard() {
  const {
    gameState,
    selectedCardId,
    playableCauldrons,
    scoringResult,
    startGame,
    selectCard,
    playCard,
  } = usePoisonStore();

  const mp = usePoisonMultiplayer();
  const [mode, setMode] = useState<'hotseat' | 'online' | null>(null);

  const [explodingIdx, setExplodingIdx] = useState<number | null>(null);
  const [explosionToast, setExplosionToast] = useState<{ text: string; sub: string; cauldronIndex: number } | null>(null);
  const [bgMuted, setBgMuted] = useState(true);
  const [bgVisible, setBgVisible] = useState(true);
  const [bgBvid, setBgBvid] = useState(DEFAULT_BVID);
  const [showBgUrlEdit, setShowBgUrlEdit] = useState(false);
  const [bgUrlDraft, setBgUrlDraft] = useState('');
  const hasInteractedRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(BG_BVID_KEY);
    if (saved) setBgBvid(saved);
  }, []);

  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing') return;
    const unmute = () => {
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        setBgMuted(false);
      }
    };
    document.addEventListener('click', unmute, { once: true });
    return () => document.removeEventListener('click', unmute);
  }, [gameState?.phase]);

  const BOOM_GENERIC = [
    'BOOM!', '炸了!', '💥 KABOOM', '寄!', '完蛋!',
    '大锅炸裂!', '噗嗤——💀', 'OH NO!', '惨 惨 惨',
    '连锅端！', '💣💣💣', '渣都不剩!', '爽 喝 ！',
  ];
  const BOOM_POISON = ['毒の审判!', '中毒了啦!', '☠ TOXIC', '剧毒爆发!'];

  useEffect(() => {
    const exp = gameState?.lastExplosion;
    if (exp) {
      setExplodingIdx(exp.cauldronIndex);
      const pool = exp.hadPoison ? [...BOOM_GENERIC, ...BOOM_POISON] : BOOM_GENERIC;
      const line = pool[Math.floor(Math.random() * pool.length)];
      setExplosionToast({
        text: line,
        sub: `${exp.playerName} 收走 ${exp.cardsTaken} 张牌`,
        cauldronIndex: exp.cauldronIndex,
      });
      const t1 = setTimeout(() => setExplodingIdx(null), 700);
      const t2 = setTimeout(() => setExplosionToast(null), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [gameState?.lastExplosion?.timestamp]);

  const isOnline = mode === 'online';
  // 联机模式下只有轮到自己才能出牌
  const isMyTurn = !isOnline || mp.myPlayerIndex === gameState?.currentPlayerIndex;

  const handlePlayCard = useCallback((cauldronIndex: number) => {
    if (selectedCardId === null || !playableCauldrons[cauldronIndex]) return;
    if (!isMyTurn) return;
    playCard(cauldronIndex);
    if (isOnline) {
      // 等 store 的 setTimeout(300ms) 处理完评分后再同步
      setTimeout(() => {
        const state = usePoisonStore.getState().gameState;
        if (state) mp.syncGameState(state);
      }, 400);
    }
  }, [selectedCardId, playableCauldrons, playCard, isMyTurn, isOnline, mp]);

  // ─ 模式选择
  if (mode === null) {
    return <ModeSelectionScreen onSelect={(m) => {
      setMode(m);
      if (m === 'online') mp.connect();
    }} />;
  }

  // ─ 联机大厅
  if (isOnline && !mp.roomId) {
    return <PoisonLobbyScreen mp={mp} onBack={() => { mp.disconnect(); setMode(null); }} />;
  }

  // ─ 联机等待 / 房主配置
  if (isOnline && mp.roomId && !gameState) {
    return (
      <OnlineWaitScreen
        mp={mp}
        onStartGame={(names) => {
          startGame(names);
          setTimeout(() => {
            const state = usePoisonStore.getState().gameState;
            if (state) mp.syncGameState(state);
          }, 50);
        }}
      />
    );
  }

  // ─ 热座模式设置
  if (!isOnline && !gameState) {
    return <SetupScreen onStart={startGame} />;
  }

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const totals = getTotalScores(gameState.players);

  return (
    <div className="relative flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {/* Background video */}
      {bgVisible && (
        <iframe
          key={`${bgBvid}-${bgMuted ? 'm' : 'u'}`}
          src={buildBilibiliSrc(bgBvid, bgMuted)}
          scrolling="no"
          frameBorder="0"
          allow="autoplay"
          allowFullScreen
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          style={{ border: 'none', zIndex: 0 }}
        />
      )}

      {/* BGM control */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {showBgUrlEdit && (
          <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/50 shadow-xl w-80">
            <input
              type="text"
              value={bgUrlDraft}
              onChange={e => setBgUrlDraft(e.target.value)}
              placeholder="粘贴 B 站视频链接或 BV 号"
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const bvid = parseBilibiliBvid(bgUrlDraft);
                  if (bvid) {
                    setBgBvid(bvid);
                    localStorage.setItem(BG_BVID_KEY, bvid);
                    setShowBgUrlEdit(false);
                    setBgUrlDraft('');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const bvid = parseBilibiliBvid(bgUrlDraft);
                if (bvid) {
                  setBgBvid(bvid);
                  localStorage.setItem(BG_BVID_KEY, bvid);
                  setShowBgUrlEdit(false);
                  setBgUrlDraft('');
                }
              }}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors font-medium"
            >
              确认
            </button>
            {bgBvid !== DEFAULT_BVID && (
              <button
                type="button"
                onClick={() => {
                  setBgBvid(DEFAULT_BVID);
                  localStorage.removeItem(BG_BVID_KEY);
                  setShowBgUrlEdit(false);
                  setBgUrlDraft('');
                }}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors"
              >
                重置
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm rounded-full px-2 py-1 border border-slate-700/50">
          <button
            type="button"
            onClick={() => setBgMuted(m => !m)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm hover:bg-slate-700/60 transition-colors"
            title={bgMuted ? '取消静音' : '静音'}
          >
            {bgMuted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            onClick={() => setBgVisible(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm hover:bg-slate-700/60 transition-colors"
            title={bgVisible ? '关闭背景' : '开启背景'}
          >
            {bgVisible ? '🎬' : '⬛'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowBgUrlEdit(v => !v);
              if (!showBgUrlEdit) setBgUrlDraft('');
            }}
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm hover:bg-slate-700/60 transition-colors"
            title="替换背景视频"
          >
            🔗
          </button>
        </div>
      </div>
      {/* Scoring overlay */}
      {scoringResult && (
        <ScoringOverlay
          onAction={isOnline ? () => {
            setTimeout(() => {
              const state = usePoisonStore.getState().gameState;
              if (state) mp.syncGameState(state);
            }, 50);
          } : undefined}
        />
      )}

      {/* Top bar: scores */}
      <div className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <RulesDropdown />
          <span className="text-sm text-slate-500">|</span>
          <span className="text-sm text-slate-400">
            第 <span className="text-white font-bold">{gameState.round}</span> / {gameState.totalRounds} 轮
          </span>
          <span className="text-sm text-slate-500">|</span>
          <span className="text-sm text-slate-400">
            庄家: <span className="text-white font-medium">{gameState.players[gameState.dealerIndex].name}</span>
          </span>
          {(() => {
            const totalInPlay = gameState.players.reduce((s, p) => s + p.hand.length + p.collected.length, 0)
              + gameState.cauldrons.reduce((s, c) => s + c.cards.length, 0);
            const hidden = 50 - totalInPlay;
            return hidden > 0 ? (
              <>
                <span className="text-sm text-slate-500">|</span>
                <span className="text-sm text-slate-400">
                  底牌: <span className="text-slate-500 font-medium">{hidden} 瓶</span>
                </span>
              </>
            ) : null;
          })()}
        </div>
        <div className="flex gap-3">
          {gameState.players.map((p, i) => {
            const isCurrent = i === gameState.currentPlayerIndex;
            const colorCounts = ALL_COLORS.map(c => p.collected.filter(card => card.color === c).length);
            const hasAny = p.collected.length > 0;
            const pendingPenalty = p.collected.reduce(
              (sum, card) => sum + (card.color === 'poison' ? 2 : 1), 0,
            );
            const displayScore = totals[i] + pendingPenalty;

            return (
              <div
                key={p.id}
                className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                  isCurrent
                    ? 'bg-blue-600/30 border border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-800/50 text-slate-400'
                }`}
              >
                <span>{p.name}</span>
                {hasAny && (
                  <span className="flex items-center gap-1">
                    {ALL_COLORS.map((c, ci) => (
                      colorCounts[ci] > 0 && (
                        <span key={c} className="flex items-center gap-0.5">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${COLOR_CSS[c].dot}`} />
                          <span className="text-xs tabular-nums">{colorCounts[ci]}</span>
                        </span>
                      )
                    ))}
                  </span>
                )}
                <span className="text-xs tabular-nums font-mono">
                  {displayScore}<span className="text-slate-500">分</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cauldrons */}
      <div className="relative z-10 flex-1 flex items-center justify-center gap-6 p-6">
        {gameState.cauldrons.map((c, i) => (
          <CauldronDisplay
            key={i}
            cauldron={c}
            index={i}
            playable={playableCauldrons[i] && selectedCardId !== null && isMyTurn}
            onDrop={() => handlePlayCard(i)}
            exploding={explodingIdx === i}
            toast={explosionToast?.cauldronIndex === i ? explosionToast : null}
          />
        ))}
      </div>

      {/* Current player turn indicator + hand */}
      <div className={`relative z-10 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md transition-opacity ${!isMyTurn ? 'opacity-60' : ''}`}>
        <div className="text-center py-2 flex items-center justify-center gap-3">
          {isOnline && mp.isSpectator ? (
            <span className="text-sm text-slate-400">
              <span className="px-1.5 py-0.5 mr-2 bg-slate-700 rounded text-xs">旁观</span>
              <span className="text-blue-400 font-bold">{currentPlayer.name}</span> 正在出牌
            </span>
          ) : isOnline && !isMyTurn ? (
            <span className="text-sm text-amber-400 font-medium animate-pulse">
              等待 {currentPlayer.name} 出牌...
            </span>
          ) : (
            <span className="text-sm">
              <span className="text-blue-400 font-bold">{currentPlayer.name}</span>
              <span className="text-slate-400"> 的回合 — 选择一张牌放入大锅</span>
            </span>
          )}
          {currentPlayer.collected.length > 0 && (
            <span className="text-xs text-slate-500">
              已收集 {currentPlayer.collected.length} 张
            </span>
          )}
        </div>

        <div className="flex justify-center gap-2 pb-4 px-4 flex-wrap">
          <AnimatePresence>
            {[...currentPlayer.hand]
              .sort((a, b) => {
                if (a.color === b.color) return a.value - b.value;
                const order: Record<string, number> = { red: 0, blue: 1, purple: 2, poison: 3 };
                return order[a.color] - order[b.color];
              })
              .map(card => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ scale: 0, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <PoisonCard
                    card={card}
                    selected={selectedCardId === card.id}
                    disabled={!isMyTurn}
                    onClick={() => isMyTurn && selectCard(selectedCardId === card.id ? null : card.id)}
                  />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
