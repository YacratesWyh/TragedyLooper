'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMissingChildStore } from '../store';
import { MaigoCard } from './Card';
import type { CardRef, MissingChildGameState } from '../types';
import { isMaigo, isBright } from '../types';

interface EffectPanelProps {
  gameState: MissingChildGameState;
  currentPlayerIndex: number;
}

// ── 通用样式 ──────────────────────────────────────────────
const PANEL_CLS = 'rounded-xl border border-amber-500/30 bg-stone-900/95 p-4';
const TITLE_CLS = 'text-sm font-medium text-amber-200/90 mb-3';
const BTN_PLAYER = 'px-3 py-2 rounded-lg text-sm bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 disabled:bg-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed';
const BTN_SKIP = 'text-xs text-stone-500 hover:text-stone-300';

// ── 明亮的街道 3/4/5 ──────────────────────────────────────
function BrightStreetPanel({ gameState }: { gameState: MissingChildGameState }) {
  const { brightStreetReturn } = useMissingChildStore();
  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>明亮的街道：手牌中只剩迷子，要将此牌取回手牌吗？</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => brightStreetReturn(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium">
          取回手牌
        </button>
        <button type="button" onClick={() => brightStreetReturn(false)}
          className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm">
          放弃
        </button>
      </div>
    </div>
  );
}

// ── 派出所 12 ───────────────────────────────────────────────
function PoliceStationPanel({ gameState }: { gameState: MissingChildGameState }) {
  const { policeStationSelect, cancelEffect } = useMissingChildStore();
  const { triggeredBy } = gameState.pendingEffect!;
  const maigos = gameState.players[triggeredBy].hand.filter(c => isMaigo(c.cardId));

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>派出所：选择一张迷子放回牌库顶（可选择不放回）</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {maigos.map(card => (
          <MaigoCard key={card.instanceId} card={card} faceUp width={80}
            onClick={() => policeStationSelect(card.instanceId)} />
        ))}
      </div>
      <button type="button" onClick={() => cancelEffect()} className={BTN_SKIP}>
        不放回
      </button>
    </div>
  );
}

// ── 护身符 8 ────────────────────────────────────────────────
function AmuletProtectPanel({ gameState }: { gameState: MissingChildGameState }) {
  const { amuletProtectSelect, cancelEffect } = useMissingChildStore();
  const { triggeredBy } = gameState.pendingEffect!;
  const hand = gameState.players[triggeredBy].hand;

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>护身符：选择一张手牌，下家无法抽取该牌</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {hand.map(card => (
          <MaigoCard key={card.instanceId} card={card} faceUp width={80}
            onClick={() => amuletProtectSelect(card.instanceId)} />
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>
        跳过效果
      </button>
    </div>
  );
}

// ── 灯塔 16 ─────────────────────────────────────────────────
function LighthousePanel({ gameState }: { gameState: MissingChildGameState }) {
  const { lighthouseDesignateSelect, cancelEffect } = useMissingChildStore();
  const { triggeredBy } = gameState.pendingEffect!;
  const hand = gameState.players[triggeredBy].hand;

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>灯塔：选择一张手牌，下家只能抽取该牌</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {hand.map(card => (
          <MaigoCard key={card.instanceId} card={card} faceUp width={80}
            onClick={() => lighthouseDesignateSelect(card.instanceId)} />
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>
        跳过效果
      </button>
    </div>
  );
}

// ── 传闻 7/31 ───────────────────────────────────────────────
function RumorPickPanel({ gameState }: { gameState: MissingChildGameState }) {
  const { rumorPickSelect } = useMissingChildStore();
  const effect = gameState.pendingEffect!;
  const deckCards = effect.tempCards ?? [];
  const maigoCards = deckCards.filter(c => isMaigo(c.cardId));

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>传闻：牌库有 {maigoCards.length} 张迷子，要将一张置于牌库顶吗？</p>
      <p className="text-xs text-stone-500 mb-3">选择后牌库洗混，该迷子放回牌库顶</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {maigoCards.map(card => (
          <MaigoCard key={card.instanceId} card={card} faceUp width={80}
            onClick={() => rumorPickSelect(card.instanceId)} />
        ))}
      </div>
      <button type="button" onClick={() => rumorPickSelect(null)}
        className="text-xs text-stone-500 hover:text-stone-300">
        跳过，直接洗牌（迷子置顶）
      </button>
    </div>
  );
}

// ── 回头 9 ──────────────────────────────────────────────────
function DiscardToHandPanel({ gameState }: { gameState: MissingChildGameState }) {
  const { selectFromDiscard, cancelEffect } = useMissingChildStore();

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>回头：从弃牌堆选择一张加入手牌</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {gameState.discard.map(card => (
          <MaigoCard key={card.instanceId} card={card} faceUp width={80}
            onClick={() => selectFromDiscard(card.instanceId)} />
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
    </div>
  );
}

// ── 水族馆 11 ───────────────────────────────────────────────
function AquariumPanel({ gameState }: EffectPanelProps) {
  const { aquariumSelect, cancelEffect } = useMissingChildStore();
  const effect = gameState.pendingEffect!;

  const waitingPlayers = gameState.players
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => p.alive && effect.selections?.[i] === undefined);

  if (waitingPlayers.length === 0) {
    return <div className={PANEL_CLS}><p className="text-stone-300">效果执行中...</p></div>;
  }

  const current = waitingPlayers[0];
  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>水族馆：所有玩家选一张牌打乱后重新分发</p>
      <p className="text-xs text-amber-200/60 mb-3">
        当前为 {current.p.name} 选择（{waitingPlayers.length} 人待选）
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {current.p.hand.map(card => (
          <MaigoCard key={card.instanceId} card={card} faceUp width={80}
            onClick={() => aquariumSelect(current.i, card.instanceId)} />
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
    </div>
  );
}

// ── 电话亭 14 ───────────────────────────────────────────────
function PhoneBoothPanel({ gameState }: { gameState: MissingChildGameState }) {
  const { phoneBoothSelect, cancelEffect } = useMissingChildStore();

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>电话亭：选择一名玩家，让其从牌堆抽两张</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {gameState.players.map((p, i) => (
          <button key={p.id} type="button" onClick={() => phoneBoothSelect(i)}
            disabled={!p.alive} className={BTN_PLAYER}>
            {p.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
    </div>
  );
}

// ── 投币洗衣机 15 ───────────────────────────────────────────
function LaundromatPanel({ gameState }: EffectPanelProps) {
  const { laundromatSelectPlayer, laundromatSelectCard, cancelEffect } = useMissingChildStore();
  const effect = gameState.pendingEffect!;
  const step = effect.step ?? 1;

  // 第1步：选玩家
  if (step === 1) {
    return (
      <div className={PANEL_CLS}>
        <p className={TITLE_CLS}>投币洗衣机：选择一名玩家，让其手牌与牌库顶交换</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {gameState.players.map((p, i) => (
            <button key={p.id} type="button" onClick={() => laundromatSelectPlayer(i)}
              disabled={!p.alive || p.hand.length === 0} className={BTN_PLAYER}>
              {p.name}
            </button>
          ))}
        </div>
        <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
      </div>
    );
  }

  // 第2步：目标玩家选手牌
  const target = gameState.players[effect.targetPlayer!];
  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>投币洗衣机：{target.name}，选择一张手牌与牌库顶交换</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {target.hand.map(card => (
          <MaigoCard key={card.instanceId} card={card} faceUp width={80}
            onClick={() => laundromatSelectCard(card.instanceId)} />
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
    </div>
  );
}

// ── 便利店 17 ───────────────────────────────────────────────
function ConvenienceStorePanel({ gameState }: { gameState: MissingChildGameState }) {
  const { convenienceStoreSelect, convenienceStoreArrange, cancelEffect } = useMissingChildStore();
  const effect = gameState.pendingEffect!;
  const { step = 1, tempCards = [] } = effect;

  // 第1步：从3张中选1张
  if (step === 1) {
    return (
      <div className={PANEL_CLS}>
        <p className={TITLE_CLS}>便利店：查看牌库顶 {tempCards.length} 张，选一张加入手牌</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {tempCards.map(card => (
            <MaigoCard key={card.instanceId} card={card} faceUp width={80}
              onClick={() => convenienceStoreSelect(card.instanceId)} />
          ))}
        </div>
        <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
      </div>
    );
  }

  // 第2步：安排剩余两张放回顺序
  return <ConvenienceStoreArrangeStep cards={tempCards} onConfirm={convenienceStoreArrange} onSkip={cancelEffect} />;
}

function ConvenienceStoreArrangeStep({
  cards,
  onConfirm,
  onSkip,
}: {
  cards: CardRef[];
  onConfirm: (ordered: CardRef[]) => void;
  onSkip: () => void;
}) {
  const [order, setOrder] = useState<CardRef[]>(cards);

  const swap = () => setOrder(o => [o[1], o[0]]);

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>便利店：安排剩余 {cards.length} 张放回牌库顶的顺序</p>
      <p className="text-xs text-stone-500 mb-3">右边的牌在牌库顶（下一张抽到）</p>
      <div className="flex items-center gap-4 mb-4">
        {order.map((card, i) => (
          <div key={card.instanceId} className="flex flex-col items-center gap-1">
            <span className="text-xs text-stone-500">{i === 0 ? '下方' : '顶部'}</span>
            <MaigoCard card={card} faceUp width={80} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={swap}
          className="px-3 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm">
          交换顺序
        </button>
        <button type="button" onClick={() => onConfirm(order)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium">
          确认放回
        </button>
        <button type="button" onClick={onSkip} className={`${BTN_SKIP} ml-2`}>跳过</button>
      </div>
    </div>
  );
}

// ── 分岔路 27 ───────────────────────────────────────────────
function ForkRoadPanel({ gameState }: { gameState: MissingChildGameState }) {
  const { forkRoadSelect, cancelEffect } = useMissingChildStore();

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>分岔路：选择一名玩家让其抽一张，然后你也抽一张</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {gameState.players.map((p, i) => (
          <button key={p.id} type="button" onClick={() => forkRoadSelect(i)}
            disabled={!p.alive} className={BTN_PLAYER}>
            {p.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
    </div>
  );
}

// ── 隧道 28 ─────────────────────────────────────────────────
function TunnelDiscardPanel({ gameState }: { gameState: MissingChildGameState }) {
  const { tunnelDiscardSelect, cancelEffect } = useMissingChildStore();
  const effect = gameState.pendingEffect!;
  const { step = 0, affectedPlayers = [] } = effect;
  const currentAffectedId = affectedPlayers[step];
  const player = gameState.players[currentAffectedId];
  const brightCards = player?.hand.filter(c => isBright(c.cardId)) ?? [];

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>
        隧道：{player?.name} 有 {brightCards.length} 张亮牌，弃置一张（{step + 1}/{affectedPlayers.length}）
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {brightCards.map(card => (
          <MaigoCard key={card.instanceId} card={card} faceUp width={80}
            onClick={() => tunnelDiscardSelect(card.instanceId)} />
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
    </div>
  );
}

// ── 神社 29 ─────────────────────────────────────────────────
function ShrinePanel({ gameState }: { gameState: MissingChildGameState }) {
  const { shrineSelectTarget, cancelEffect } = useMissingChildStore();
  const effect = gameState.pendingEffect!;
  const candidates = effect.affectedPlayers ?? [];

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>神社：并列手牌最多，选择一名玩家接收所有人的迷子</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {gameState.players.map((p, i) => {
          const isCandidate = candidates.includes(i);
          return (
            <button key={p.id} type="button" onClick={() => shrineSelectTarget(i)}
              disabled={!isCandidate} className={BTN_PLAYER}>
              {p.name} ({p.hand.length}张)
            </button>
          );
        })}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
    </div>
  );
}

// ── 小黑崎 33 ───────────────────────────────────────────────
function KurosakiPanel({ gameState }: { gameState: MissingChildGameState }) {
  const { kurosakiSelect, cancelEffect } = useMissingChildStore();
  const { triggeredBy = 0 } = gameState.pendingEffect ?? {};
  const maigoCount = gameState.players[triggeredBy]?.hand.filter(c => isMaigo(c.cardId)).length ?? 0;

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>小黑崎：选择一名玩家，将你的 {maigoCount} 张迷子交给他</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {gameState.players.map((p, i) => (
          <button key={p.id} type="button" onClick={() => kurosakiSelect(i)}
            disabled={!p.alive} className={BTN_PLAYER}>
            {p.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
    </div>
  );
}

// ── 河 24 ───────────────────────────────────────────────────
function RiverPanel({ gameState }: EffectPanelProps) {
  const { riverSelect, cancelEffect } = useMissingChildStore();
  const effect = gameState.pendingEffect!;

  const waitingPlayers = gameState.players
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => p.alive && effect.selections?.[i] === undefined);

  if (waitingPlayers.length === 0) {
    return <div className={PANEL_CLS}><p className="text-stone-300">效果执行中...</p></div>;
  }

  const current = waitingPlayers[0];
  const leftIdx = (current.i - 1 + gameState.players.length) % gameState.players.length;
  const leftPlayer = gameState.players[leftIdx];

  return (
    <div className={PANEL_CLS}>
      <p className={TITLE_CLS}>河：所有玩家选一张牌交给左手边玩家</p>
      <p className="text-xs text-amber-200/60 mb-3">
        当前 {current.p.name} 选择，传给 {leftPlayer.name}（{waitingPlayers.length} 人待选）
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {current.p.hand.map(card => (
          <MaigoCard key={card.instanceId} card={card} faceUp width={80}
            onClick={() => riverSelect(current.i, card.instanceId)} />
        ))}
      </div>
      <button type="button" onClick={cancelEffect} className={BTN_SKIP}>跳过效果</button>
    </div>
  );
}

// ── 主 EffectPanel ───────────────────────────────────────────
export function EffectPanel({ gameState, currentPlayerIndex }: EffectPanelProps) {
  if (!gameState.pendingEffect) return null;

  const { type } = gameState.pendingEffect;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-lg w-full"
      >
        {type === 'bright_street_return' && <BrightStreetPanel gameState={gameState} />}
        {type === 'police_station' && <PoliceStationPanel gameState={gameState} />}
        {type === 'amulet_protect' && <AmuletProtectPanel gameState={gameState} />}
        {type === 'lighthouse_designate' && <LighthousePanel gameState={gameState} />}
        {type === 'rumor_pick' && <RumorPickPanel gameState={gameState} />}
        {type === 'tunnel_discard' && <TunnelDiscardPanel gameState={gameState} />}
        {type === 'discard_to_hand' && <DiscardToHandPanel gameState={gameState} />}
        {type === 'aquarium_pick' && <AquariumPanel gameState={gameState} currentPlayerIndex={currentPlayerIndex} />}
        {type === 'pick_player_draw2' && <PhoneBoothPanel gameState={gameState} />}
        {type === 'pick_player_swap_top' && <LaundromatPanel gameState={gameState} currentPlayerIndex={currentPlayerIndex} />}
        {type === 'convenience_store' && <ConvenienceStorePanel gameState={gameState} />}
        {type === 'pick_player_draw1' && <ForkRoadPanel gameState={gameState} />}
        {type === 'shrine_pick_target' && <ShrinePanel gameState={gameState} />}
        {type === 'transfer_all_maigo' && <KurosakiPanel gameState={gameState} />}
        {type === 'river_pick' && <RiverPanel gameState={gameState} currentPlayerIndex={currentPlayerIndex} />}
      </motion.div>
    </motion.div>
  );
}
