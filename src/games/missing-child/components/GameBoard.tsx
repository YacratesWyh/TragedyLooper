'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMissingChildStore } from '../store';
import { getCardDef, isMaigo } from '../types';
import { getLeftPlayerIndex, hasPlayableCard, getWinnersByHp } from '../engine';
import { MaigoCard, DeckPile } from './Card';

const MAIGO_BG_BVID = 'BV1sN4y1T72q';
const RULE_IMAGE = '/assets/maigo/rule.png';

function buildBilibiliSrc(bvid: string, muted: boolean) {
  return `//player.bilibili.com/player.html?isOutside=true&bvid=${bvid}&p=1&autoplay=1&danmaku=0&loop=1&t=0${muted ? '&muted=1' : ''}`;
}

function SetupScreen({
  onStart,
  onShowRules,
}: {
  onStart: (names: string[]) => void;
  onShowRules: () => void;
}) {
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState<string[]>(['', '', '', '']);

  const handleStart = () => {
    const trimmed = names.slice(0, playerCount).map((name, i) => (name.trim() || `玩家${i + 1}`));
    onStart(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8 bg-stone-950/80 text-stone-200">
      <h1 className="text-4xl font-bold">迷子</h1>

      <div
        className="w-full max-w-lg rounded-xl border border-stone-700/80 p-5 text-left"
        style={{
          backgroundColor: 'rgba(20,12,8,0.85)',
          backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(60,30,20,0.2), transparent)',
        }}
      >
        <p className="text-red-400/95 text-sm leading-relaxed">
          抽鬼牌的恐怖变体。每回合从上家或牌库抽一张、再打出一张；「迷子」不能打出，手牌里只剩迷子的人出局，被带往彼端。最后留下的人，才能回到这边的世界。
        </p>
      </div>

      <p className="text-stone-400">2～4 人 · 从上家或牌库抽一张再出一张，别让手里只剩迷子</p>

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
          <input
            key={i}
            type="text"
            placeholder={`玩家 ${i + 1}`}
            value={names[i] ?? ''}
            onChange={(e) => {
              const next = [...names];
              next[i] = e.target.value;
              setNames(next);
            }}
            className="px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleStart}
        className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all active:scale-95"
      >
        开始游戏
      </button>

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

function RuleCardPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed right-4 top-4 bottom-4 z-[9999] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-stone-600 bg-stone-900/95 shadow-2xl backdrop-blur-sm"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'tween', duration: 0.2 }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-stone-700 px-3 py-2">
            <span className="text-sm font-medium text-stone-400">规则速查</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-800 hover:text-stone-200"
            >
              關閉
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <img
              src={RULE_IMAGE}
              alt="迷子 回合流程與 END 條件速查"
              className="w-full object-contain"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default function MissingChildGameBoard() {
  const {
    gameState,
    selectedInstanceIds,
    startGame,
    drawFromLeftByInstanceId,
    drawFromDeck,
    toggleSelect,
    playSelected,
    skipTurnNoPlayable,
    resetGame,
  } = useMissingChildStore();

  const [bgMuted, setBgMuted] = useState(true);
  const [showRuleCard, setShowRuleCard] = useState(false);

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
          <span className="text-amber-400 font-bold">{lastAlive.name}</span> 最后一人存活获胜
        </p>
      ) : (
        <p className="text-stone-400">无人存活</p>
      );
    } else if (reason === 'RoundsComplete') {
      title = '3 轮结束';
      message =
        winnersByHp.length > 0 ? (
          <p className="text-stone-400">
            血量最多：{' '}
            {winnersByHp.map((p, i) => (
              <span key={p.id}>
                {i > 0 && '、'}
                <span className="text-amber-400 font-bold">{p.name}</span>
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
          <span className="text-amber-400 font-bold">{lastAlive.name}</span> 获胜
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
              {p.name} —{' '}
              {p.alive
                ? `血量 ${p.hp}`
                : p.hand.length === 0
                  ? `Happy End（+2 血） 最終 ${p.hp}`
                  : 'Bad End（自爆）'}
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
    const leftIdx = getLeftPlayerIndex(gameState);
    const leftPlayer = gameState.players[leftIdx];
    const needDraw = cur.alive && cur.drawnCard === null;
    const playsLeft = gameState.playsLeft ?? 1;
    const canPlay =
      cur.alive &&
      !cur.actionEnd &&
      selectedInstanceIds.length > 0 &&
      (cur.drawnCard !== null || playsLeft > 0);
    const noPlayable =
      cur.alive &&
      cur.drawnCard !== null &&
      !cur.actionEnd &&
      !hasPlayableCard(gameState);

    content = (
      <div className="flex flex-col min-h-screen bg-stone-950/80 text-stone-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-900/80">
        <span className="text-sm text-stone-400">
          第 <span className="font-bold text-stone-200">{gameState.round + 1}</span>/3 轮
          <span className="mx-2 text-stone-600">·</span>
          当前：<span className="font-bold text-amber-400">{cur.name}</span>
          {playsLeft > 1 && (
            <span className="ml-2 text-amber-300">可再出牌 {playsLeft} 次</span>
          )}
          {!cur.alive && <span className="ml-2 text-red-400">（自爆）</span>}
        </span>
        <div className="flex items-center gap-2">
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

      <div className="flex-1 p-4 space-y-6">
        {/* 抽牌阶段：从上家手牌（牌背）选一张，或点牌库抽一张 */}
        {needDraw && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4"
          >
            <p className="text-sm font-medium text-amber-200/90 mb-3">
              抽一张牌：点击上家手牌中的一张，或点击牌库顶
            </p>
            <div className="flex flex-wrap items-end gap-4">
              {leftPlayer.hand.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-stone-500">
                    {leftPlayer.name} 的手牌（看背面点一张抽取）
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {leftPlayer.hand.map((card) => (
                      <MaigoCard
                        key={card.instanceId}
                        faceUp={false}
                        width={96}
                        onClick={() => drawFromLeftByInstanceId(card.instanceId)}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-stone-500">牌库（点牌库顶抽取）</span>
                <DeckPile
                  count={gameState.deck.length}
                  width={96}
                  onClick={gameState.deck.length > 0 ? drawFromDeck : undefined}
                />
              </div>
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

        {/* 手牌：卡牌正面，可多选坏掉的街道 */}
        {cur.hand.length > 0 && (
          <section>
            <p className="text-xs text-stone-500 mb-2">
              手牌（迷子不能打出；可多选「坏掉的街道」一起打出）
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
                        if (cur.actionEnd) return;
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
      </div>

      <div className="p-4 border-t border-stone-800 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <DeckPile count={gameState.deck.length} width={56} />
          <span className="text-xs text-stone-500">牌库</span>
        </div>
        <span className="text-xs text-stone-500">
          弃牌 {gameState.discard.length} 张
        </span>
        <div className="flex flex-wrap gap-2">
          {gameState.players.map((p) => (
            <span
              key={p.id}
              className={`px-2 py-1 rounded text-sm ${
                p.alive
                  ? 'bg-stone-800 text-stone-300'
                  : 'bg-red-900/30 text-red-300 line-through'
              } ${p.id === gameState.currentPlayerIndex ? 'ring-1 ring-amber-500' : ''}`}
            >
              {p.name} 血{p.hp} · {p.hand.length}张
            </span>
          ))}
        </div>
      </div>
    </div>
    );
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
      <button
        type="button"
        onClick={() => setBgMuted((m) => !m)}
        className="fixed bottom-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-stone-900/80 border border-stone-700 text-sm hover:bg-stone-800 transition-colors"
        title={bgMuted ? '取消静音' : '静音'}
      >
        {bgMuted ? '🔇' : '🔊'}
      </button>
      <RuleCardPanel open={showRuleCard} onClose={() => setShowRuleCard(false)} />
    </div>
  );
}
