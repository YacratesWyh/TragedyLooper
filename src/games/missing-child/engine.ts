/**
 * 迷子 (Missing Child) 游戏引擎 — 纯函数，零副作用
 * 流程：发牌 → 每轮当前玩家从上家抽一张 → 出牌（一张或多张坏掉的街道）→ 死亡判定 → 下一家
 */

import type { CardRef, MissingChildGameState, Player } from './types';
import { CARD_DEFS, getCardDef, isBright, isMaigo, canPlayToField } from './types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 原作：牌库仅含 id 0–31（每 id 一张），最后两张特殊牌（32 小神白、33 小黑崎）不放入牌库 */
const DECK_CARD_COUNT = 32;

function buildDeck(startInstanceId: number): CardRef[] {
  const refs: CardRef[] = [];
  let next = startInstanceId;
  for (let i = 0; i < DECK_CARD_COUNT; i++) {
    refs.push({ cardId: i, instanceId: next++ });
  }
  return refs;
}

/** Bad End 判定：手牌僅剩「迷子」或「迷子與黑暗卡」（無光亮牌） */
export function badEndCheck(hand: CardRef[]): boolean {
  if (hand.length === 0) return false;
  return !hand.some(c => isBright(c.cardId));
}

/** Happy End 判定：手牌為 0 */
export function happyEndCheck(hand: CardRef[]): boolean {
  return hand.length === 0;
}

const HP_CAP = 7;

/**
 * 抽牌／被抽牌／出牌後檢查：手牌 0 → Happy End（+2 血，上限 7，暫時退出）；
 * 手牌僅迷子或迷子+黑暗 → Bad End（-3 血，退出）。
 */
function applyEndCheck(players: Player[]): Player[] {
  return players.map(p => {
    if (p.hand.length === 0) {
      return { ...p, alive: false, hp: Math.min(HP_CAP, p.hp + 2) };
    }
    if (badEndCheck(p.hand)) {
      return { ...p, alive: false, hp: Math.max(0, p.hp - 3) };
    }
    return p;
  });
}

export function createInitialState(playerNames: string[]): MissingChildGameState {
  const n = playerNames.length;
  if (n < 2 || n > 4) throw new Error('迷子需要 2 至 4 名玩家');

  const deck = shuffle(buildDeck(0));
  const hands: CardRef[][] = Array.from({ length: n }, () => []);
  const cardsPerPlayer = n === 2 ? 6 : 5;
  let idx = 0;
  for (let i = 0; i < n * cardsPerPlayer; i++) {
    hands[i % n].push(deck[idx++]);
  }
  const remainingDeck = deck.slice(n * cardsPerPlayer);

  const players: Player[] = playerNames.map((name, i) => ({
    id: i,
    name,
    hand: hands[i],
    alive: true,
    hp: 7,
    drawnCard: null,
    actionEnd: false,
  }));

  const withDeath = applyEndCheck(players);
  const nextInstanceId = DECK_CARD_COUNT;

  return {
    phase: 'playing',
    players: withDeath,
    deck: remainingDeck,
    discard: [],
    currentPlayerIndex: 0,
    round: 0,
    playsLeft: 1,
    nextInstanceId,
    endReason: null,
  };
}

/** 从左到右的下一个存活玩家索引 */
function nextAliveIndex(players: Player[], from: number): number {
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (players[i].alive) return i;
  }
  return from;
}

/** 从左到右的上一个存活玩家索引 */
function prevAliveIndex(players: Player[], from: number): number {
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + n - k) % n;
    if (players[i].alive) return i;
  }
  return from;
}

/** 存活人数 */
function aliveCount(players: Player[]): number {
  return players.filter(p => p.alive).length;
}

/** 从牌堆顶抽 n 张加入某玩家手牌（不设 drawnCard），返回新 players 与 deck */
function drawFromDeckToPlayer(
  state: MissingChildGameState,
  playerIndex: number,
  n: number,
): { players: Player[]; deck: CardRef[] } {
  if (state.deck.length < n) return { players: state.players, deck: state.deck };
  const taken = state.deck.slice(-n);
  const newDeck = state.deck.slice(0, -n);
  const p = state.players[playerIndex];
  const newPlayers = state.players.map((pl, i) =>
    i === playerIndex ? { ...pl, hand: [...pl.hand, ...taken] } : pl,
  );
  return { players: newPlayers, deck: newDeck };
}

/**
 * 執行單張打出卡牌的效果（僅處理無需選擇的自動效果）。
 * 需選擇的效果（回頭、傳聞、電話亭等）暫不處理，等同無效果。
 */
function resolveCardEffect(
  state: MissingChildGameState,
  cardId: number,
  playedBy: number,
): MissingChildGameState {
  const n = state.players.length;
  let st = state;

  // 小道 26：从牌堆抽 2 张加入手牌
  if (cardId === 26) {
    const { players, deck } = drawFromDeckToPlayer(st, playedBy, 2);
    st = { ...st, players: applyEndCheck(players), deck };
  }
  // 公园 30：从牌堆抽 1 张加入手牌
  else if (cardId === 30) {
    const { players, deck } = drawFromDeckToPlayer(st, playedBy, 1);
    st = { ...st, players: applyEndCheck(players), deck };
  }
  // 来电 10：左手边玩家从牌堆抽 1 张
  else if (cardId === 10) {
    const left = prevAliveIndex(st.players, playedBy);
    const { players, deck } = drawFromDeckToPlayer(st, left, 1);
    st = { ...st, players: applyEndCheck(players), deck };
  }
  // 雨 23：所有玩家按序（从当前玩家左侧起）从牌库各抽 1 张
  else if (cardId === 23) {
    let players = [...st.players];
    let deck = [...st.deck];
    for (let k = 1; k <= n; k++) {
      const i = (playedBy + k) % n;
      if (!players[i].alive) continue;
      if (deck.length < 1) break;
      const { players: nextP, deck: nextD } = drawFromDeckToPlayer(
        { ...st, players, deck },
        i,
        1,
      );
      players = nextP;
      deck = nextD;
    }
    st = { ...st, players: applyEndCheck(players), deck };
  }
  // 人行横道 13：手牌中有迷子的玩家按顺序（从当前起向左）各从牌库抽 1 张
  else if (cardId === 13) {
    let players = [...st.players];
    let deck = [...st.deck];
    for (let k = 0; k < n; k++) {
      const i = (playedBy + k) % n;
      if (!players[i].alive || deck.length < 1) continue;
      const hasMaigo = players[i].hand.some(c => isMaigo(c.cardId));
      if (!hasMaigo) continue;
      const { players: nextP, deck: nextD } = drawFromDeckToPlayer(
        { ...st, players, deck },
        i,
        1,
      );
      players = nextP;
      deck = nextD;
    }
    st = { ...st, players: applyEndCheck(players), deck };
  }
  // 平交道 6：从牌堆抽 1 张；若抽到迷子则当前玩家进入 BRIGHTADEND（视为自爆 -3 血）
  else if (cardId === 6) {
    const { players, deck } = drawFromDeckToPlayer(st, playedBy, 1);
    let nextPlayers = applyEndCheck(players);
    const cur = nextPlayers[playedBy];
    const drawnCard = cur.hand[cur.hand.length - 1];
    if (drawnCard && isMaigo(drawnCard.cardId)) {
      nextPlayers = nextPlayers.map((p, i) =>
        i === playedBy
          ? { ...p, alive: false, hp: Math.max(0, p.hp - 3) }
          : p,
      );
    }
    st = { ...st, players: nextPlayers, deck };
  }
  // 海 25：所有手牌放入牌堆洗混，再各抽回原数量
  else if (cardId === 25) {
    const counts = st.players.map(p => p.hand.length);
    const allCards: CardRef[] = [];
    st.players.forEach(p => {
      allCards.push(...p.hand);
    });
    const newDeck = shuffle([...allCards, ...st.deck]);
    const newPlayers = st.players.map((p, i) => {
      const take = counts[i];
      const hand = newDeck.splice(-take, take);
      return { ...p, hand };
    });
    st = { ...st, players: applyEndCheck(newPlayers), deck: newDeck };
  }
  // 小神白 32、坏掉的街道 18–22：无效果
  // 其余需选择的效果（回头、传闻、电话亭等）暂不执行
  return st;
}

/**
 * 当前玩家从上家手牌抽一张牌（看背面，以 instanceId 指定唯一牌）。
 * 全局每张牌 instanceId 唯一，抽他人牌仅能通过牌背选择对应 id。
 */
export function drawFromLeft(
  state: MissingChildGameState,
  fromHandIndex: number,
): MissingChildGameState {
  if (state.phase !== 'playing') return state;
  const cur = state.currentPlayerIndex;
  const prev = prevAliveIndex(state.players, cur);
  const prevPlayer = state.players[prev];
  if (prevPlayer.hand.length <= fromHandIndex) return state;

  const drawn = prevPlayer.hand[fromHandIndex];
  const newPrevHand = prevPlayer.hand.filter((_, i) => i !== fromHandIndex);
  const curPlayer = state.players[cur];
  const newCurHand = [...curPlayer.hand, drawn];

  let newPlayers = state.players.map((p, i) => {
    if (i === prev) return { ...p, hand: newPrevHand };
    if (i === cur) return { ...p, hand: newCurHand, drawnCard: drawn };
    return p;
  });
  newPlayers = applyEndCheck(newPlayers);

  const prevAlive = newPrevHand.length > 0;
  if (!prevAlive && aliveCount(newPlayers) <= 1) {
    return {
      ...state,
      players: newPlayers,
      phase: 'game_end',
      endReason: 'Normal',
    };
  }

  return { ...state, players: newPlayers };
}

/** 按牌的 instanceId 从上家手牌中抽走该张（看背面抽 id，保证唯一） */
export function drawFromLeftByInstanceId(
  state: MissingChildGameState,
  instanceId: number,
): MissingChildGameState {
  const prev = prevAliveIndex(state.players, state.currentPlayerIndex);
  const prevPlayer = state.players[prev];
  const idx = prevPlayer.hand.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return state;
  return drawFromLeft(state, idx);
}

/**
 * 当前玩家从牌库顶抽一张牌（玩家点击牌库时调用）
 */
export function drawFromDeckTop(state: MissingChildGameState): MissingChildGameState | null {
  if (state.phase !== 'playing' || state.deck.length === 0) return null;
  const cur = state.currentPlayerIndex;
  const curPlayer = state.players[cur];
  if (!curPlayer.alive || curPlayer.drawnCard !== null) return null;

  const topCard = state.deck[state.deck.length - 1];
  const newDeck = state.deck.slice(0, -1);
  const newHand = [...curPlayer.hand, topCard];
  const newPlayers = state.players.map((p, i) =>
    i === cur ? { ...p, hand: newHand, drawnCard: topCard } : p,
  );
  const withDeath = applyEndCheck(newPlayers);
  return {
    ...state,
    deck: newDeck,
    players: withDeath,
  };
}

/**
 * 出牌：将手牌中选中的牌移到弃牌堆。
 * 迷子不能打出；坏掉的街道可多选一起打出；其余一次一张。
 */
export function playCards(
  state: MissingChildGameState,
  playerIndex: number,
  instanceIds: number[],
): MissingChildGameState {
  if (state.phase !== 'playing') return state;
  if (playerIndex !== state.currentPlayerIndex) return state;

  const player = state.players[playerIndex];
  const toPlay = instanceIds.filter(id =>
    player.hand.some(c => c.instanceId === id),
  );
  if (toPlay.length === 0) return state;

  const cards = player.hand.filter(c => toPlay.includes(c.instanceId));
  const allCanPlay = cards.every(c => canPlayToField(c.cardId));
  if (!allCanPlay) return state;

  const defs = cards.map(c => getCardDef(c.cardId)).filter(Boolean);
  const darkStreet = defs.every(d => d!.id >= 18 && d!.id <= 22);
  const singleOrDarkStreet =
    toPlay.length === 1 || (toPlay.length >= 2 && darkStreet);
  if (!singleOrDarkStreet) return state;

  const extraSum = cards.reduce(
    (s, c) => s + (getCardDef(c.cardId)?.extra_round ?? 0),
    0,
  );
  const newPlaysLeft = (state.playsLeft ?? 1) - 1 + extraSum;

  const newHand = player.hand.filter(c => !toPlay.includes(c.instanceId));
  const newDiscard = [...state.discard, ...cards];
  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? {
          ...p,
          hand: newHand,
          drawnCard: null,
          actionEnd: newPlaysLeft <= 0,
        }
      : p,
  );

  let afterPlay = { ...state, players: newPlayers, discard: newDiscard };
  for (const card of cards) {
    afterPlay = resolveCardEffect(afterPlay, card.cardId, playerIndex);
  }
  const withDeath = applyEndCheck(afterPlay.players);
  const alive = aliveCount(withDeath);
  const deckAfterEffects = afterPlay.deck;

  // 牌打光（全員手牌為 0）：遊戲結束，Happy End 的 +2 血已在 applyEndCheck 中加上
  if (deckAfterEffects.length === 0 && withDeath.every((p) => p.hand.length === 0)) {
    return {
      ...state,
      players: withDeath,
      discard: newDiscard,
      deck: deckAfterEffects,
      phase: 'game_end',
      endReason: 'Good',
    };
  }

  // Normal End：最后一人存活，非胜者 -1 血
  if (alive <= 1) {
    const afterNormal = withDeath.map((p) =>
      p.alive ? p : { ...p, hp: Math.max(0, p.hp - 1) },
    );
    return {
      ...state,
      players: afterNormal,
      discard: newDiscard,
      deck: deckAfterEffects,
      phase: 'game_end',
      endReason: 'Normal',
    };
  }

  // 行动+1/+2：还有剩余出牌次数则本回合不结束
  if (newPlaysLeft > 0) {
    return {
      ...state,
      players: withDeath,
      discard: newDiscard,
      deck: deckAfterEffects,
      playsLeft: newPlaysLeft,
    };
  }

  const next = nextAliveIndex(withDeath, state.currentPlayerIndex);

  // 轮次结束：回到 0 号位即完成一轮；满 3 轮则按血量判胜（不再每轮 +1 血）
  if (next === 0) {
    const newRound = state.round + 1;
    if (newRound >= 3) {
      return {
        ...state,
        players: withDeath,
        discard: newDiscard,
        deck: deckAfterEffects,
        round: newRound,
        playsLeft: 1,
        phase: 'game_end',
        endReason: 'RoundsComplete',
      };
    }
    return {
      ...state,
      players: withDeath,
      discard: newDiscard,
      deck: deckAfterEffects,
      round: newRound,
      currentPlayerIndex: next,
      playsLeft: 1,
    };
  }

  return {
    ...state,
    players: withDeath,
    discard: newDiscard,
    deck: deckAfterEffects,
    currentPlayerIndex: next,
    playsLeft: 1,
  };
}

/** 重置当前玩家回合状态（抽牌前调用：清空 drawnCard、actionEnd） */
export function refreshCurrentPlayer(state: MissingChildGameState): MissingChildGameState {
  if (state.phase !== 'playing') return state;
  const cur = state.currentPlayerIndex;
  const p = state.players[cur];
  if (!p.alive) return state;

  return {
    ...state,
    players: state.players.map((pl, i) =>
      i === cur ? { ...pl, drawnCard: null, actionEnd: false } : pl,
    ),
  };
}

/** 当前玩家是否可出某张牌（迷子不可出；其余可出；多张仅限坏掉的街道） */
export function getPlayableInstanceIds(
  state: MissingChildGameState,
  selectedInstanceIds: number[],
): number[] {
  const player = state.players[state.currentPlayerIndex];
  if (!player?.alive) return [];

  const playable = player.hand.filter(c => canPlayToField(c.cardId));
  if (selectedInstanceIds.length === 0) {
    return playable.map(c => c.instanceId);
  }
  const selected = player.hand.filter(c =>
    selectedInstanceIds.includes(c.instanceId),
  );
  const allDarkStreet = selected.every(c => {
    const d = getCardDef(c.cardId);
    return d && d.id >= 18 && d.id <= 22;
  });
  if (selected.length >= 2 && allDarkStreet) {
    return selected.map(c => c.instanceId);
  }
  return playable.map(c => c.instanceId);
}

/** 上家（左侧）玩家在当前状态下的索引 */
export function getLeftPlayerIndex(state: MissingChildGameState): number {
  return prevAliveIndex(state.players, state.currentPlayerIndex);
}

/** 3 轮结束后按血量取获胜者（血量最高且 >0 的玩家，可能并列） */
export function getWinnersByHp(players: Player[]): Player[] {
  const maxHp = Math.max(...players.map((p) => p.hp));
  if (maxHp <= 0) return [];
  return players.filter((p) => p.hp === maxHp);
}

/** 当前玩家是否有可出的牌（非迷子） */
export function hasPlayableCard(state: MissingChildGameState): boolean {
  const player = state.players[state.currentPlayerIndex];
  if (!player?.alive) return false;
  return player.hand.some(c => canPlayToField(c.cardId));
}

/**
 * 无法出牌时结束回合并推进到下一家（手中仅有迷子时调用）
 */
export function advanceTurnWhenNoPlayable(state: MissingChildGameState): MissingChildGameState | null {
  if (state.phase !== 'playing' || hasPlayableCard(state)) return null;

  const cur = state.currentPlayerIndex;
  const newPlayers = state.players.map((p, i) =>
    i === cur ? { ...p, drawnCard: null, actionEnd: true } : p,
  );
  const withDeath = applyEndCheck(newPlayers);
  if (aliveCount(withDeath) <= 1) {
    return {
      ...state,
      players: withDeath,
      phase: 'game_end',
      endReason: 'Normal',
    };
  }
  const next = nextAliveIndex(withDeath, cur);

  if (next === 0) {
    const newRound = state.round + 1;
    if (newRound >= 3) {
      return {
        ...state,
        players: withDeath,
        round: newRound,
        playsLeft: 1,
        phase: 'game_end',
        endReason: 'RoundsComplete',
      };
    }
    return {
      ...state,
      players: withDeath,
      round: newRound,
      currentPlayerIndex: next,
      playsLeft: 1,
    };
  }
  return {
    ...state,
    players: withDeath,
    currentPlayerIndex: next,
    playsLeft: 1,
  };
}
