/**
 * 迷子 (Missing Child) 游戏引擎 — 纯函数，零副作用
 * 流程：发牌 → 每轮当前玩家从上家抽一张 → 出牌（一张或多张坏掉的街灯）→ 死亡判定 → 下一家
 */

import type { CardRef, MissingChildGameState, Player, LogEntry } from './types';
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

/** Bad End 判定：手牌中有迷子，且没有任何光亮牌（纯黑暗牌不会 Bad End） */
export function badEndCheck(hand: CardRef[]): boolean {
  if (hand.length === 0) return false;
  const hasMaigo = hand.some(c => isMaigo(c.cardId));
  if (!hasMaigo) return false;
  return !hand.some(c => isBright(c.cardId));
}

/** Happy End 判定：手牌為 0 */
export function happyEndCheck(hand: CardRef[]): boolean {
  return hand.length === 0;
}

const HP_CAP = 7;

function getRandomBadEndDescription(playerName: string): string {
  const descriptions = [
    `${playerName} 变得只会咕咕嘎嘎了。`,
    `${playerName} 被企鹅包围，彻底迷失在夜色里。`,
    `${playerName} 的理智被迷子一点点啄碎了。`,
    `${playerName} 看见的最后一盏灯，也熄灭了。`,
    `${playerName} 再也分不清街道和深渊的边界。`,
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)] ?? descriptions[0];
}

/**
 * 每次结算时检查个人结局：
 * - 手牌为空且存活 → 个人 Happy End（+2 SAN，happyEnded=true，出局）
 * - 有迷子且无光亮牌（仅迷子/迷子+黑暗）→ Bad End（-3 SAN，alive=false，badEnded=true）
 */
function applyEndCheck(players: Player[]): Player[] {
  return players.map(p => {
    if (!p.alive || p.happyEnded) return p;
    if (p.hand.length === 0) {
      return { ...p, alive: false, hp: Math.min(HP_CAP, p.hp + 2), happyEnded: true };
    }
    if (badEndCheck(p.hand)) {
      return { ...p, alive: false, hp: Math.max(0, p.hp - 3), badEnded: true };
    }
    return p;
  });
}

/**
 * 牌打光后重置并开始新一轮：收集所有牌洗混，重新发牌给未 badEnded 的玩家。
 * +2 HP（HE 奖励）在调用本函数前已由 Good End 路径处理；此处仅重置手牌与进行状态。
 */
function resetRound(st: MissingChildGameState, newRound: number): MissingChildGameState {
  const activePlayers = st.players.filter(p => !p.badEnded);
  const n = activePlayers.length;
  const cardsPerPlayer = n === 2 ? 6 : 5;

  const allCards = shuffle([...st.deck, ...st.discard]);

  let idx = 0;
  const newPlayers = st.players.map(p => {
    if (p.badEnded) return p;
    const hand = allCards.slice(idx, idx + cardsPerPlayer);
    idx += cardsPerPlayer;
    return { ...p, alive: true, hand, drawnCard: null, actionEnd: false, happyEnded: false };
  });

  const newDeck = allCards.slice(idx);
  const firstActive = newPlayers.findIndex(p => !p.badEnded);
  const withDeath = applyEndCheck(newPlayers);
  const deckTopIsMaigo = newDeck.length > 0 && isMaigo(newDeck[newDeck.length - 1].cardId);

  return {
    ...st,
    players: withDeath,
    deck: newDeck,
    discard: [],
    currentPlayerIndex: firstActive >= 0 ? firstActive : 0,
    round: newRound,
    playsLeft: 1,
    endReason: null,
    turnEndPending: false,
    pendingNextPlayerIndex: undefined,
    pendingRound: undefined,
    pendingEffect: undefined,
    protectedDraw: undefined,
    deckTopIsMaigo,
    logs: [
      ...(st.logs ?? []),
      {
        id: `log-${Date.now()}-newround-${newRound}`,
        type: 'turn_start' as const,
        round: newRound,
        turn: (st.turn ?? 1) + 1,
        playerIndex: firstActive >= 0 ? firstActive : 0,
        timestamp: Date.now(),
        message: `第 ${newRound + 1} 轮开始，重新发牌`,
      },
    ],
  };
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
    turn: 1,
    playsLeft: 1,
    nextInstanceId,
    endReason: null,
    logs: [],
  };
}

/** 下一个"活跃"玩家（alive 且未 happyEnded）的索引 */
function nextAliveIndex(players: Player[], from: number): number {
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (players[i].alive && !players[i].happyEnded) return i;
  }
  return from;
}

/** 上一个"活跃"玩家（alive 且未 happyEnded）的索引（即"左手边"） */
function prevAliveIndex(players: Player[], from: number): number {
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + n - k) % n;
    if (players[i].alive && !players[i].happyEnded) return i;
  }
  return from;
}

/** 活跃人数（alive 且未 happyEnded） */
function aliveCount(players: Player[]): number {
  return players.filter(p => p.alive && !p.happyEnded).length;
}

/** 从牌堆顶抽 count 张加入某玩家手牌（不设 drawnCard），返回新 players 与 deck */
function drawFromDeckToPlayer(
  state: MissingChildGameState,
  playerIndex: number,
  count: number,
): { players: Player[]; deck: CardRef[] } {
  const actual = Math.min(count, state.deck.length);
  if (actual === 0) return { players: state.players, deck: state.deck };
  const taken = state.deck.slice(-actual);
  const newDeck = state.deck.slice(0, -actual);
  const newPlayers = state.players.map((pl, i) =>
    i === playerIndex ? { ...pl, hand: [...pl.hand, ...taken] } : pl,
  );
  return { players: newPlayers, deck: newDeck };
}

/**
 * 执行单张打出卡牌的效果。
 * 自动效果直接修改状态并返回；需选择的效果设置 pendingEffect 后立即返回，
 * 后续由 store 通过 resolvePendingEffect 完成。
 */
function resolveCardEffect(
  state: MissingChildGameState,
  cardId: number,
  playedBy: number,
): MissingChildGameState {
  const n = state.players.length;
  let st = state;

  switch (cardId) {
    // 明亮的街道 3/4/5：打出后若手牌中只剩迷子，可将此牌取回
    case 3: case 4: case 5: {
      const p = st.players[playedBy];
      const onlyMaigo = p.hand.length > 0 && p.hand.every(c => isMaigo(c.cardId));
      if (onlyMaigo) {
        return { ...st, pendingEffect: { type: 'bright_street_return', triggeredBy: playedBy } };
      }
      break;
    }

    // 平交道 6：从牌堆抽 1 张；先展示牌面（crossroad_draw），结算后再判断 Bad End
    case 6: {
      const { players, deck } = drawFromDeckToPlayer(st, playedBy, 1);
      const drawn = players[playedBy].hand[players[playedBy].hand.length - 1];
      if (drawn) {
        return {
          ...st,
          players,
          deck,
          pendingEffect: { type: 'crossroad_draw', triggeredBy: playedBy, card: drawn },
        };
      }
      break;
    }

    // 传闻 7/31：看全部牌库，有迷子可取1张；洗牌；若牌库仍有迷子则置顶
    case 7: case 31: {
      const hasMaigo = st.deck.some(c => isMaigo(c.cardId));
      if (hasMaigo) {
        return {
          ...st,
          pendingEffect: { type: 'rumor_pick', triggeredBy: playedBy, tempCards: [...st.deck] },
        };
      }
      // 无迷子：洗牌并通知所有玩家
      st = {
        ...st,
        deck: shuffle([...st.deck]),
        logs: [
          ...(st.logs ?? []),
          {
            id: `log-${Date.now()}-rumor-nomaigo`,
            type: 'card_effect' as const,
            round: st.round,
            turn: st.turn,
            playerIndex: playedBy,
            timestamp: Date.now(),
            message: `传闻：牌库中没有迷子，牌库已洗混`,
            cardName: '传闻',
          },
        ],
      };
      break;
    }

    // 护身符 8：下家抽牌时，你挑选一张手牌不让他取（仅1张时不触发）
    case 8: {
      const p = st.players[playedBy];
      if (p.hand.length > 1) {
        return { ...st, pendingEffect: { type: 'amulet_protect', triggeredBy: playedBy } };
      }
      break;
    }

    // 回头 9：从弃牌堆选1张加入手牌
    case 9: {
      if (st.discard.length > 0) {
        return { ...st, pendingEffect: { type: 'discard_to_hand', triggeredBy: playedBy } };
      }
      break;
    }

    // 来电 10：左手边玩家从牌堆抽1张
    case 10: {
      const left = prevAliveIndex(st.players, playedBy);
      const { players, deck } = drawFromDeckToPlayer(st, left, 1);
      st = { ...st, players, deck };
      break;
    }

    // 水族馆 11：每个玩家选1张，打乱后重新分发
    case 11: {
      const alive = st.players.filter(p => p.alive).map(p => p.id);
      return {
        ...st,
        pendingEffect: { type: 'aquarium_pick', triggeredBy: playedBy, selections: {}, affectedPlayers: alive },
      };
    }

    // 派出所 12：手牌有迷子时，可将1张迷子放回牌库顶
    case 12: {
      const p = st.players[playedBy];
      const hasMaigo = p.hand.some(c => isMaigo(c.cardId));
      if (hasMaigo) {
        return { ...st, pendingEffect: { type: 'police_station', triggeredBy: playedBy } };
      }
      break;
    }

    // 人行横道 13：手牌有迷子的玩家按顺序（从打出者开始）各从牌库抽1张
    case 13: {
      let players = [...st.players];
      let deck = [...st.deck];
      const newLogs = [...(st.logs ?? [])];
      for (let k = 0; k < n; k++) {
        const i = (playedBy + k) % n;
        if (!players[i].alive || deck.length < 1) continue;
        if (!players[i].hand.some(c => isMaigo(c.cardId))) continue;
        const result = drawFromDeckToPlayer({ ...st, players, deck }, i, 1);
        players = result.players;
        deck = result.deck;
        newLogs.push({
          id: `log-${Date.now()}-effect13-${i}`,
          type: 'card_effect',
          round: st.round,
          playerIndex: i,
          timestamp: Date.now(),
          message: `人行横道：${players[i].name} 从牌库抽了一张牌`,
          cardName: '人行横道',
        });
      }
      st = { ...st, players, deck, logs: newLogs };
      break;
    }

    // 电话亭 14：选1名玩家（含自己）抽2张
    case 14: {
      return { ...st, pendingEffect: { type: 'pick_player_draw2', triggeredBy: playedBy } };
    }

    // 投币洗衣机 15：选1名玩家，选其1张手牌，与牌库顶交换
    case 15: {
      return { ...st, pendingEffect: { type: 'pick_player_swap_top', triggeredBy: playedBy, step: 1 } };
    }

    // 灯塔 16：下家抽牌时你指定一张（仅1张时不触发）
    case 16: {
      const p = st.players[playedBy];
      if (p.hand.length > 1) {
        return { ...st, pendingEffect: { type: 'lighthouse_designate', triggeredBy: playedBy } };
      }
      break;
    }

    // 便利店 17：看牌库顶3张，选1张入手，其余2张以任意顺序放回库顶
    case 17: {
      if (st.deck.length > 0) {
        const count = Math.min(3, st.deck.length);
        const taken = st.deck.slice(-count);
        const newDeck = st.deck.slice(0, -count);
        return {
          ...st,
          deck: newDeck,
          pendingEffect: { type: 'convenience_store', triggeredBy: playedBy, tempCards: taken, step: 1 },
        };
      }
      break;
    }

    // 雨 23：从左侧第一位存活玩家起，按顺序各从牌库抽1张
    case 23: {
      let players = [...st.players];
      let deck = [...st.deck];
      const leftStart = prevAliveIndex(st.players, playedBy);
      for (let k = 0; k < n; k++) {
        const i = (leftStart + k) % n;
        if (!players[i].alive || deck.length < 1) continue;
        const result = drawFromDeckToPlayer({ ...st, players, deck }, i, 1);
        players = result.players;
        deck = result.deck;
      }
      st = { ...st, players, deck };
      break;
    }

    // 河 24：所有玩家各选1张，同时传给左手边玩家
    case 24: {
      const alive = st.players.filter(p => p.alive).map(p => p.id);
      return {
        ...st,
        pendingEffect: { type: 'river_pick', triggeredBy: playedBy, selections: {}, affectedPlayers: alive },
      };
    }

    // 海 25：所有手牌放入牌库洗混，再各抽回原手牌数
    case 25: {
      const counts = st.players.map(p => p.hand.length);
      let remaining = shuffle([
        ...st.players.flatMap(p => p.hand),
        ...st.deck,
      ]);
      const newPlayers = st.players.map((p, i) => {
        const take = counts[i];
        if (take === 0) return { ...p, hand: [] };
        const hand = remaining.slice(-take);
        remaining = remaining.slice(0, -take);
        return { ...p, hand };
      });
      st = { ...st, players: newPlayers, deck: remaining, deckTopIsMaigo: false };
      break;
    }

    // 小道 26：从牌堆抽2张加入手牌
    case 26: {
      const { players, deck } = drawFromDeckToPlayer(st, playedBy, 2);
      st = { ...st, players, deck };
      break;
    }

    // 分岔路 27：选1名玩家抽1张，然后自己也抽1张
    case 27: {
      return { ...st, pendingEffect: { type: 'pick_player_draw1', triggeredBy: playedBy } };
    }

    // 隧道 28：手牌有>=2张亮牌的玩家，必须弃置1张亮牌
    case 28: {
      const affected = st.players
        .filter(p => p.alive && p.hand.filter(c => isBright(c.cardId)).length >= 2)
        .map(p => p.id);
      if (affected.length > 0) {
        return {
          ...st,
          pendingEffect: { type: 'tunnel_discard', triggeredBy: playedBy, step: 0, affectedPlayers: affected },
        };
      }
      break;
    }

    // 神社 29：手牌最多的玩家接收所有人的迷子（并列时需选）
    case 29: {
      const alivePlayers = st.players.filter(p => p.alive);
      const maxCount = Math.max(...alivePlayers.map(p => p.hand.length));
      const tied = alivePlayers.filter(p => p.hand.length === maxCount).map(p => p.id);
      if (tied.length === 1) {
        const target = tied[0];
        const allMaigo = st.players.flatMap(p => p.hand.filter(c => isMaigo(c.cardId)));
        const newPlayers = st.players.map((p, i) => {
          if (!p.alive) return p;
          if (i === target) return { ...p, hand: [...p.hand.filter(c => !isMaigo(c.cardId)), ...allMaigo] };
          return { ...p, hand: p.hand.filter(c => !isMaigo(c.cardId)) };
        });
        st = { ...st, players: newPlayers };
      } else {
        return {
          ...st,
          pendingEffect: { type: 'shrine_pick_target', triggeredBy: playedBy, affectedPlayers: tied },
        };
      }
      break;
    }

    // 公园 30：从牌堆抽1张加入手牌
    case 30: {
      const { players, deck } = drawFromDeckToPlayer(st, playedBy, 1);
      st = { ...st, players, deck };
      break;
    }

    // 小黑崎 33：选1名玩家，你的所有迷子给他
    case 33: {
      return { ...st, pendingEffect: { type: 'transfer_all_maigo', triggeredBy: playedBy } };
    }

    // 坏掉的街灯 18–22、小神白 32：无效果
    default:
      break;
  }

  return st;
}

/**
 * 处理刚死亡玩家的手牌：迷子 → 牌库顶（deck 末尾），其余 → 弃牌堆，清空手牌。
 * 对已死亡且手牌非空的玩家执行，跳过仍存活的玩家。
 */
function processDeadHands(st: MissingChildGameState): MissingChildGameState {
  let deck = [...st.deck];
  let discard = [...st.discard];

  const players = st.players.map(p => {
    if (!p.alive && p.hand.length > 0) {
      const maigos = p.hand.filter(c => isMaigo(c.cardId));
      const others = p.hand.filter(c => !isMaigo(c.cardId));
      deck = [...deck, ...maigos];     // 迷子叠到牌库顶（末尾 = 顶）
      discard = [...discard, ...others];
      return { ...p, hand: [] };
    }
    return p;
  });

  const deckTopIsMaigo = deck.length > 0 && isMaigo(deck[deck.length - 1].cardId);
  return { ...st, players, deck, discard, deckTopIsMaigo };
}

/**
 * 检查轮次/游戏结束：
 * - 所有非 badEnded 玩家均已 happyEnded → 触发轮次重置（HP 已在 applyEndCheck 中逐人发放）
 * - 活跃人数为 0 且无法轮次重置（全员 badEnded）→ Normal End
 * - clearPending：是否同时清除 pendingEffect（playCards 出牌后路径需要）
 * 返回 null 表示游戏继续。
 */
function checkRoundEnd(
  after: MissingChildGameState,
  clearPending = false,
): MissingChildGameState | null {
  const base = clearPending ? { ...after, pendingEffect: undefined } : after;

  const nonBadPlayers = base.players.filter(p => !p.badEnded);
  if (nonBadPlayers.length > 0 && nonBadPlayers.every(p => p.happyEnded)) {
    const newRound = base.round + 1;
    const roundLog: LogEntry = {
      id: `log-${Date.now()}-roundend`,
      type: 'happy_end',
      round: base.round,
      turn: base.turn,
      playerIndex: -1,
      timestamp: Date.now(),
      message: `🎉 所有玩家已结局，进入第 ${newRound + 1} 轮`,
    };
    const afterLog = { ...base, logs: [...(base.logs ?? []), roundLog] };
    if (newRound >= 3) {
      return { ...afterLog, round: newRound, playsLeft: 1, phase: 'game_end', endReason: 'RoundsComplete' };
    }
    return resetRound(afterLog, newRound);
  }

  // 2人局特殊规则：如果其中一人 Happy End，则另一人正常 NE -1 分改为 -3 分
  const alivePlayers = base.players.filter(p => p.alive);
  if (alivePlayers.length === 1) {
    const survivor = alivePlayers[0];
    const others = base.players.filter(p => p.id !== survivor.id);
    const hasHe = others.some(p => p.happyEnded);
    
    // 基础 NE 扣 1 分，2 人局且有人 HE 时扣 3 分
    const penalty = (base.players.length === 2 && hasHe) ? 3 : 1;
    
    const withPenalty = base.players.map(p => 
      p.id === survivor.id ? { ...p, hp: Math.max(0, p.hp - penalty) } : p
    );

    const log: LogEntry = {
      id: `log-${Date.now()}-ne-penalty`,
      type: 'game_end',
      round: base.round,
      turn: base.turn,
      playerIndex: survivor.id,
      timestamp: Date.now(),
      message: penalty === 3 
        ? `2人局结算：由于对手已 HE，${survivor.name} 进入 Normal End (-3SAN)`
        : `${survivor.name} 进入 Normal End (-1SAN)`,
    };

    return { 
      ...base, 
      players: withPenalty, 
      logs: [...(base.logs ?? []), log],
      endReason: 'Normal', 
      gameEndPending: true 
    };
  }

  const alive = aliveCount(base.players);
  if (alive === 0) {
    return { ...base, endReason: 'Normal', gameEndPending: true };
  }

  return null;
}

/**
 * 对比 applyEndCheck 前后的玩家列表，为新出局的玩家生成 log 条目。
 * 返回 {logs, badEndPlayer, badEndDescription}，其中 badEndPlayer 是新自爆的玩家索引（如果有）
 */
function logEndingsIfAny(
  before: Player[],
  after: Player[],
  round: number,
  turn: number,
  existingLogs: LogEntry[],
): { logs: LogEntry[]; badEndPlayer?: number; badEndDescription?: string } {
  const extra: LogEntry[] = [];
  let badEndPlayer: number | undefined;
  let badEndDescription: string | undefined;
  const now = Date.now();
  for (let i = 0; i < before.length; i++) {
    if (!before[i].happyEnded && after[i].happyEnded) {
      extra.push({
        id: `log-${now}-happyend-${i}`,
        type: 'happy_end',
        round,
        turn,
        playerIndex: i,
        timestamp: now + i,
        message: `🌟HE ${after[i].name} 手牌打光，Happy End（+2SAN，现 ${after[i].hp} SAN）`,
      });
    }
    if (before[i].alive && !before[i].happyEnded && !after[i].alive && after[i].badEnded) {
      badEndPlayer = i;
      badEndDescription = getRandomBadEndDescription(after[i].name);
      extra.push({
        id: `log-${now}-badend-${i}`,
        type: 'bad_end',
        round,
        turn,
        playerIndex: i,
        timestamp: now + i,
        message: `💀BE ${after[i].name} ${badEndDescription}（-3SAN，现 ${after[i].hp} SAN）`,
      });
    }
  }
  const logs = extra.length > 0 ? [...existingLogs, ...extra] : existingLogs;
  return { logs, badEndPlayer, badEndDescription };
}

/**
 * 回合中（含 extra_round）检查结局：HP/死亡更新 + 轮次/Normal End 判断，但不推进回合。
 * 用于抽牌、效果结算等可能触发结局却不结束当前玩家行动权的时机。
 */
function applyMidTurnEndCheck(st: MissingChildGameState): MissingChildGameState {
  const withDeath = applyEndCheck(st.players);
  const { logs: logsAfterEnd, badEndPlayer, badEndDescription } = logEndingsIfAny(st.players, withDeath, st.round, st.turn ?? 1, st.logs ?? []);
  let after = processDeadHands({ ...st, players: withDeath, logs: logsAfterEnd });
  
  // 如果有新自爆玩家，设置动画状态
  if (badEndPlayer !== undefined) {
    const player = withDeath[badEndPlayer];
    after = {
      ...after,
      badEndAnimation: {
        playerIndex: badEndPlayer,
        hand: player.hand,
        description: badEndDescription ?? getRandomBadEndDescription(player.name),
        bvid: 'BV1XB6zBcEMu',
      },
    };
  }

  const ended = checkRoundEnd(after);
  const currentPlayer = after.players[after.currentPlayerIndex];

  if (
    ended?.endReason === 'Normal' &&
    currentPlayer?.alive &&
    !currentPlayer.happyEnded
  ) {
    return after;
  }

  return ended ?? after;
}

/**
 * 回合结束后的状态推进：applyEndCheck → 处理死亡手牌 → 检查终止条件 → 设 turnEndPending。
 * 给 playCards / advanceTurnWhenNoPlayable 共用。
 */
function finalizeTurn(
  st: MissingChildGameState,
  currentIdx: number,
  newPlaysLeft: number,
): MissingChildGameState {
  const withDeath = applyEndCheck(st.players);
  const { logs: logsAfterEnd, badEndPlayer, badEndDescription } = logEndingsIfAny(st.players, withDeath, st.round, st.turn ?? 1, st.logs ?? []);
  let after = processDeadHands({ ...st, players: withDeath, logs: logsAfterEnd });
  
  // 如果有新自爆玩家，设置动画状态
  if (badEndPlayer !== undefined) {
    const player = withDeath[badEndPlayer];
    after = {
      ...after,
      badEndAnimation: {
        playerIndex: badEndPlayer,
        hand: player.hand,
        description: badEndDescription ?? getRandomBadEndDescription(player.name),
        bvid: 'BV1XB6zBcEMu',
      },
    };
  }

  // 结局检查优先
  const ended = checkRoundEnd(after);
  if (ended) return ended;

  // 还有剩余行动次数（结局检查通过后才允许继续）
  if (newPlaysLeft > 0) {
    return { ...after, playsLeft: newPlaysLeft };
  }

  // 回合结束：设 turnEndPending，等待玩家点击确认
  const next = nextAliveIndex(after.players, currentIdx);
  return {
    ...after,
    playsLeft: 1,
    turnEndPending: true,
    pendingNextPlayerIndex: next,
  };
}

/**
 * 当前玩家从上家手牌抽一张牌（看背面，以 instanceId 指定唯一牌）。
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

  const newPlayers = state.players.map((p, i) => {
    if (i === prev) return { ...p, hand: newPrevHand };
    if (i === cur) return { ...p, hand: newCurHand, drawnCard: drawn };
    return p;
  });

  return { ...state, players: newPlayers, protectedDraw: undefined };
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

  // 护身符/灯塔约束（手牌>1时才生效）
  if (state.protectedDraw && state.protectedDraw.targetPlayer === prev && prevPlayer.hand.length > 1) {
    const { source, instanceId: markedId } = state.protectedDraw;
    if (source === 'amulet' && instanceId === markedId) return state; // 禁止抽该牌
    if (source === 'lighthouse' && instanceId !== markedId) return state; // 必须抽该牌
  }

  // 抽牌成功后：清除 protectedDraw，并检查被抽空手牌的玩家是否触发结局
  const result = drawFromLeft(state, idx);
  if (result === state) return state;
  return applyMidTurnEndCheck({ ...result, protectedDraw: undefined });
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
  return { ...state, deck: newDeck, players: newPlayers };
}

/**
 * 出牌：将手牌中选中的牌移到弃牌堆，执行卡牌效果，推进回合。
 * 迷子不能打出；坏掉的街灯可多选一起打出；其余一次一张。
 */
export function playCards(
  state: MissingChildGameState,
  playerIndex: number,
  instanceIds: number[],
): MissingChildGameState {
  if (state.phase !== 'playing') return state;
  if (playerIndex !== state.currentPlayerIndex) return state;

  const player = state.players[playerIndex];
  const toPlay = instanceIds.filter(id => player.hand.some(c => c.instanceId === id));
  if (toPlay.length === 0) return state;

  const cards = player.hand.filter(c => toPlay.includes(c.instanceId));
  if (!cards.every(c => canPlayToField(c.cardId))) return state;

  const defs = cards.map(c => getCardDef(c.cardId)).filter(Boolean);
  const darkStreet = defs.every(d => d!.id >= 18 && d!.id <= 22);
  if (toPlay.length >= 2 && !darkStreet) return state;

  const extraSum = cards.reduce((s, c) => s + (getCardDef(c.cardId)?.extra_round ?? 0), 0);
  const newPlaysLeft = (state.playsLeft ?? 1) - 1 + extraSum;

  const newHand = player.hand.filter(c => !toPlay.includes(c.instanceId));
  const newDiscard = [...state.discard, ...cards];
  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? {
          ...p,
          hand: newHand,
          // 额外行动时保留 drawnCard，避免 UI 再次出现抽牌阶段
          drawnCard: newPlaysLeft > 0 ? p.drawnCard : null,
          actionEnd: newPlaysLeft <= 0,
        }
      : p,
  );

  let afterPlay = { ...state, players: newPlayers, discard: newDiscard };
  for (const card of cards) {
    afterPlay = resolveCardEffect(afterPlay, card.cardId, playerIndex);
  }

  // 有待处理效果：先结算当前 Bad End（出牌后手牌可能已满足条件），再等待效果选择
  if (afterPlay.pendingEffect) {
    const withDeath = applyEndCheck(afterPlay.players);
    const { logs: logsAfterEnd, badEndPlayer, badEndDescription } = logEndingsIfAny(afterPlay.players, withDeath, afterPlay.round, afterPlay.turn ?? 1, afterPlay.logs ?? []);
    let afterDeath = processDeadHands({ ...afterPlay, players: withDeath, logs: logsAfterEnd });
    
    // 如果有新自爆玩家，设置动画状态
    if (badEndPlayer !== undefined) {
      const player = withDeath[badEndPlayer];
      afterDeath = {
        ...afterDeath,
        badEndAnimation: {
          playerIndex: badEndPlayer,
          hand: player.hand,
          description: badEndDescription ?? getRandomBadEndDescription(player.name),
          bvid: 'BV1XB6zBcEMu',
        },
      };
    }

    const ended = checkRoundEnd(afterDeath, true);
    if (ended) return ended;

    return { ...afterDeath, playsLeft: newPlaysLeft };
  }

  return finalizeTurn(afterPlay, playerIndex, newPlaysLeft);
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

/** 当前玩家是否可出某张牌（迷子不可出；其余可出；多张仅限坏掉的街灯） */
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
  const selected = player.hand.filter(c => selectedInstanceIds.includes(c.instanceId));
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

/**
 * 找最近的可抽牌上家：alive && hand.length > 0。
 * 若找不到（所有上家手牌为空或已出局），返回 currentPlayerIndex 作为 Normal End 信号。
 */
export function getDrawSourcePlayerIndex(state: MissingChildGameState): number {
  const { players, currentPlayerIndex } = state;
  const n = players.length;
  for (let k = 1; k < n; k++) {
    const i = (currentPlayerIndex + n - k) % n;
    if (players[i].alive && players[i].hand.length > 0) return i;
  }
  return currentPlayerIndex;
}

/** 3 轮结束后按 SAN 取获胜者（SAN 最高且 >0 的玩家，可能并列） */
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
 * 无法出牌时结束回合并设 turnEndPending（手中仅有迷子时调用）
 */
export function advanceTurnWhenNoPlayable(state: MissingChildGameState): MissingChildGameState | null {
  if (state.phase !== 'playing' || hasPlayableCard(state)) return null;

  const cur = state.currentPlayerIndex;
  const marked = state.players.map((p, i) =>
    i === cur ? { ...p, drawnCard: null, actionEnd: true } : p,
  );
  return finalizeTurn({ ...state, players: marked }, cur, 0);
}

/**
 * 确认回合结束，清除 turnEndPending 并切换到下一家。
 * 若游戏已结束则返回 null。
 * 支持跳过死亡玩家（currentPlayerIndex 对应的玩家 alive=false）
 */
export function confirmTurnEnd(state: MissingChildGameState): MissingChildGameState | null {
  if (state.phase !== 'playing') return null;
  
  // 允许跳过死亡玩家（即使没有 turnEndPending）
  const curPlayer = state.players[state.currentPlayerIndex];
  if (!state.turnEndPending && curPlayer?.alive) return null;

  const withDeath = applyEndCheck(state.players);
  const { logs: logsAfterEnd, badEndPlayer, badEndDescription } = logEndingsIfAny(state.players, withDeath, state.round, state.turn ?? 1, state.logs ?? []);
  let after = processDeadHands({ ...state, players: withDeath, logs: logsAfterEnd });
  
  // 如果有新自爆玩家，设置动画状态（保持到动画被跳过）
  if (badEndPlayer !== undefined && !state.badEndAnimation) {
    const player = withDeath[badEndPlayer];
    after = {
      ...after,
      badEndAnimation: {
        playerIndex: badEndPlayer,
        hand: player.hand,
        description: badEndDescription ?? getRandomBadEndDescription(player.name),
        bvid: 'BV1XB6zBcEMu',
      },
    };
    // 返回设置动画后的状态，不推进回合
    return { ...after, turnEndPending: false };
  }

  const ended = checkRoundEnd({ ...after, turnEndPending: false });
  if (ended) return ended;

  const next = state.pendingNextPlayerIndex ?? nextAliveIndex(after.players, state.currentPlayerIndex);
  const newRound = state.pendingRound ?? state.round;

  const newPlayers = after.players.map((p, i) =>
    i === next ? { ...p, actionEnd: false, drawnCard: null } : p,
  );

  return {
    ...after,
    players: newPlayers,
    currentPlayerIndex: next,
    round: newRound,
    turn: (state.turn ?? 1) + 1,
    playsLeft: 1,
    turnEndPending: false,
    pendingNextPlayerIndex: undefined,
    pendingRound: undefined,
    // protectedDraw 保留到下一家完成抽牌后再清除
  };
}

/**
 * pendingEffect 解决后，根据剩余 playsLeft 推进回合（供 store 调用）。
 * clearPending: 已清除 pendingEffect 的新状态（store 传入）
 */
export function advanceAfterEffect(st: MissingChildGameState): MissingChildGameState {
  if (st.pendingEffect) return st; // 还有待处理效果，不推进
  return finalizeTurn(st, st.currentPlayerIndex, st.playsLeft ?? 0);
}

// ──────────────────────────────────────────────────────────
// 以下为 pendingEffect 的二阶段解决函数（供 store 调用）
// ──────────────────────────────────────────────────────────

/** 明亮的街道（3/4/5）：玩家决定是否取回（accept=true 取回） */
export function resolveBrightStreetReturn(
  state: MissingChildGameState,
  accept: boolean,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'bright_street_return') return state;
  const { triggeredBy } = state.pendingEffect;
  let st = { ...state, pendingEffect: undefined };

  if (accept) {
    // 将 discard 中最后一张（刚打出的牌）移回手牌
    if (st.discard.length === 0) return st;
    const card = st.discard[st.discard.length - 1];
    const newDiscard = st.discard.slice(0, -1);
    const newPlayers = st.players.map((p, i) =>
      i === triggeredBy ? { ...p, hand: [...p.hand, card] } : p,
    );
    st = { ...st, discard: newDiscard, players: newPlayers };
  }

  return advanceAfterEffect(st);
}

/** 派出所（12）：将选中的迷子 instanceId 放回牌库顶 */
export function resolvePoliceStation(
  state: MissingChildGameState,
  instanceId: number | null,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'police_station') return state;
  const { triggeredBy } = state.pendingEffect;
  let st = { ...state, pendingEffect: undefined };

  if (instanceId !== null) {
    const p = st.players[triggeredBy];
    const card = p.hand.find(c => c.instanceId === instanceId && isMaigo(c.cardId));
    if (card) {
      const newHand = p.hand.filter(c => c.instanceId !== instanceId);
      const newDeck = [...st.deck, card]; // 放到牌库顶（deck 的末尾）
      const newPlayers = st.players.map((pl, i) =>
        i === triggeredBy ? { ...pl, hand: newHand } : pl,
      );
      st = { ...st, players: newPlayers, deck: newDeck, deckTopIsMaigo: true };
    }
  }

  return advanceAfterEffect(st);
}

/** 护身符（8）：选一张手牌不让下家抽 */
export function resolveAmuletProtect(
  state: MissingChildGameState,
  instanceId: number,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'amulet_protect') return state;
  const { triggeredBy } = state.pendingEffect;
  // 下家是受影响的玩家（targetPlayer），triggeredBy 是选择牌的人（pickedBy）
  const nextIdx = (triggeredBy + 1) % state.players.length;
  const st: MissingChildGameState = {
    ...state,
    pendingEffect: undefined,
    protectedDraw: { targetPlayer: nextIdx, pickedBy: triggeredBy, source: 'amulet', instanceId },
  };
  return advanceAfterEffect(st);
}

/** 灯塔（16）：指定下家必须抽的牌 */
export function resolveLighthouseDesignate(
  state: MissingChildGameState,
  instanceId: number,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'lighthouse_designate') return state;
  const { triggeredBy } = state.pendingEffect;
  // 下家是受影响的玩家（targetPlayer），triggeredBy 是选择牌的人（pickedBy）
  const nextIdx = (triggeredBy + 1) % state.players.length;
  const st: MissingChildGameState = {
    ...state,
    pendingEffect: undefined,
    protectedDraw: { targetPlayer: nextIdx, pickedBy: triggeredBy, source: 'lighthouse', instanceId },
  };
  return advanceAfterEffect(st);
}

/** 传闻（7/31）：决定是否取迷子（instanceId=null 表示不取） */
export function resolveRumorPick(
  state: MissingChildGameState,
  instanceId: number | null,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'rumor_pick') return state;
  let st = { ...state, pendingEffect: undefined };

  if (instanceId !== null) {
    // 从牌库取出该迷子，洗混剩余牌库，再将该迷子置于牌库顶（不入手）
    const card = st.deck.find(c => c.instanceId === instanceId && isMaigo(c.cardId));
    if (card) {
      const deckWithout = st.deck.filter(c => c.instanceId !== instanceId);
      const shuffled = shuffle(deckWithout);
      const newDeck = [...shuffled, card]; // 置顶（数组末尾为顶）
      st = { ...st, deck: newDeck, deckTopIsMaigo: true };
    }
  } else {
    // 不取迷子：洗牌，若有迷子则置顶
    const shuffled = shuffle([...st.deck]);
    const hasMaigo = shuffled.some(c => isMaigo(c.cardId));
    let newDeck = shuffled;
    let deckTopIsMaigo = false;
    if (hasMaigo) {
      const maigoIdx = newDeck.findIndex(c => isMaigo(c.cardId));
      const maigo = newDeck[maigoIdx];
      newDeck = [...newDeck.filter((_, i) => i !== maigoIdx), maigo];
      deckTopIsMaigo = true;
    }
    st = { ...st, deck: newDeck, deckTopIsMaigo };
  }

  return advanceAfterEffect(st);
}

/** 回头（9）：从弃牌堆取一张加入手牌 */
export function resolveDiscardToHand(
  state: MissingChildGameState,
  instanceId: number,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'discard_to_hand') return state;
  const { triggeredBy } = state.pendingEffect;
  let st = { ...state, pendingEffect: undefined };

  const card = st.discard.find(c => c.instanceId === instanceId);
  if (card) {
    const newDiscard = st.discard.filter(c => c.instanceId !== instanceId);
    const newPlayers = st.players.map((p, i) =>
      i === triggeredBy ? { ...p, hand: [...p.hand, card] } : p,
    );
    st = { ...st, discard: newDiscard, players: newPlayers };
  }

  return advanceAfterEffect(st);
}

/** 水族馆（11）：每个玩家提交一张牌（selections: {playerId: instanceId}），最后打乱分发 */
export function resolveAquariumPick(
  state: MissingChildGameState,
  playerId: number,
  instanceId: number | null,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'aquarium_pick') return state;
  const { selections = {}, affectedPlayers = [] } = state.pendingEffect;
  // instanceId 为 null 时表示该玩家跳过（没有手牌）
  const newSelections = { ...selections, [playerId]: instanceId ?? -1 };

  // 检查是否所有人都已选择
  const allDone = affectedPlayers.every(id => newSelections[id] !== undefined);
  if (!allDone) {
    return { ...state, pendingEffect: { ...state.pendingEffect, selections: newSelections } };
  }

  // 收集并打乱（跳过 instId 为 -1 的情况，表示该玩家没有手牌）
  let st = { ...state, pendingEffect: undefined };
  const collected: CardRef[] = [];
  let players = [...st.players];
  for (const [pidStr, instId] of Object.entries(newSelections)) {
    const pid = Number(pidStr);
    if (instId === -1) continue; // 跳过没有手牌的玩家
    const card = players[pid].hand.find(c => c.instanceId === instId);
    if (!card) continue;
    collected.push(card);
    players = players.map((p, i) => i === pid ? { ...p, hand: p.hand.filter(c => c.instanceId !== instId) } : p);
  }
  const shuffled = shuffle(collected);
  // 按 affectedPlayers 顺序分发
  affectedPlayers.forEach((pid, k) => {
    if (k < shuffled.length) {
      players = players.map((p, i) => i === pid ? { ...p, hand: [...p.hand, shuffled[k]] } : p);
    }
  });
  st = { ...st, players };

  return advanceAfterEffect(st);
}

/** 电话亭（14）：选目标玩家，为其抽2张 */
export function resolvePickPlayerDraw2(
  state: MissingChildGameState,
  targetPlayer: number,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'pick_player_draw2') return state;
  const { players, deck } = drawFromDeckToPlayer(
    { ...state, pendingEffect: undefined },
    targetPlayer,
    2,
  );
  return advanceAfterEffect({ ...state, players, deck, pendingEffect: undefined });
}

/** 投币洗衣机（15）：第1步选玩家，第2步选该玩家的手牌与库顶交换 */
export function resolvePickPlayerSwapTop(
  state: MissingChildGameState,
  step1PlayerOrStep2InstanceId: number,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'pick_player_swap_top') return state;

  if (state.pendingEffect.step === 1) {
    // 第1步：记录目标玩家
    return {
      ...state,
      pendingEffect: { ...state.pendingEffect, targetPlayer: step1PlayerOrStep2InstanceId, step: 2 },
    };
  }

  // 第2步：交换
  const { targetPlayer } = state.pendingEffect;
  if (targetPlayer === undefined) return state;
  const instanceId = step1PlayerOrStep2InstanceId;
  let st = { ...state, pendingEffect: undefined };

  if (st.deck.length === 0) return advanceAfterEffect(st);

  const p = st.players[targetPlayer];
  const handCard = p.hand.find(c => c.instanceId === instanceId);
  if (!handCard) return advanceAfterEffect(st);

  const deckTop = st.deck[st.deck.length - 1];
  const newDeck = [...st.deck.slice(0, -1), handCard]; // 手牌入库顶
  const newHand = [...p.hand.filter(c => c.instanceId !== instanceId), deckTop]; // 库顶入手
  const newPlayers = st.players.map((pl, i) => i === targetPlayer ? { ...pl, hand: newHand } : pl);
  st = { ...st, players: newPlayers, deck: newDeck };

  return advanceAfterEffect(st);
}

/** 便利店（17）：step=1 选1张入手；step=2 确认剩余两张顺序（tempCards=[first, second]，second在顶） */
export function resolveConvenienceStore(
  state: MissingChildGameState,
  data: number | CardRef[],
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'convenience_store') return state;
  const { triggeredBy, tempCards = [], step } = state.pendingEffect;

  if (step === 1 && typeof data === 'number') {
    // 选1张加入手牌
    const chosen = tempCards.find(c => c.instanceId === data);
    if (!chosen) return state;
    const rest = tempCards.filter(c => c.instanceId !== data);
    const newPlayers = state.players.map((p, i) =>
      i === triggeredBy ? { ...p, hand: [...p.hand, chosen] } : p,
    );
    if (rest.length === 0) {
      return advanceAfterEffect({ ...state, players: newPlayers, pendingEffect: undefined });
    }
    if (rest.length === 1) {
      // 只剩1张，直接放回库顶
      return advanceAfterEffect({
        ...state,
        players: newPlayers,
        deck: [...state.deck, rest[0]],
        pendingEffect: undefined,
      });
    }
    return {
      ...state,
      players: newPlayers,
      pendingEffect: { ...state.pendingEffect, tempCards: rest, step: 2 },
    };
  }

  if (step === 2 && Array.isArray(data)) {
    // data = [bottom, top] 顺序（top 后入库，在栈顶）
    return advanceAfterEffect({
      ...state,
      deck: [...state.deck, ...data],
      pendingEffect: undefined,
    });
  }

  return state;
}

/** 分岔路（27）：选目标玩家，为其抽1张，然后触发者也抽1张 */
export function resolvePickPlayerDraw1(
  state: MissingChildGameState,
  targetPlayer: number,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'pick_player_draw1') return state;
  const { triggeredBy } = state.pendingEffect;
  let st = { ...state, pendingEffect: undefined };
  const r1 = drawFromDeckToPlayer(st, targetPlayer, 1);
  st = { ...st, players: r1.players, deck: r1.deck };
  const r2 = drawFromDeckToPlayer(st, triggeredBy, 1);
  st = { ...st, players: r2.players, deck: r2.deck };
  return advanceAfterEffect(st);
}

/** 隧道（28）：当前需行动的玩家弃1张亮牌 */
export function resolveTunnelDiscard(
  state: MissingChildGameState,
  instanceId: number | null,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'tunnel_discard') return state;
  const { step = 0, affectedPlayers = [] } = state.pendingEffect;
  const currentAffected = affectedPlayers[step];

  const p = state.players[currentAffected];
  
  // instanceId 为 null 时表示跳过（该玩家没有亮牌）
  if (instanceId === null) {
    const nextStep = step + 1;
    if (nextStep >= affectedPlayers.length) {
      return advanceAfterEffect({ ...state, pendingEffect: undefined });
    }
    return {
      ...state,
      pendingEffect: { ...state.pendingEffect, step: nextStep },
    };
  }
  
  const card = p?.hand.find(c => c.instanceId === instanceId && isBright(c.cardId));
  if (!card) return state;

  const newPlayers = state.players.map((pl, i) =>
    i === currentAffected ? { ...pl, hand: pl.hand.filter(c => c.instanceId !== instanceId) } : pl,
  );
  const newDiscard = [...state.discard, card];
  const nextStep = step + 1;

  if (nextStep >= affectedPlayers.length) {
    // 所有人处理完毕
    return advanceAfterEffect({ ...state, players: newPlayers, discard: newDiscard, pendingEffect: undefined });
  }

  return {
    ...state,
    players: newPlayers,
    discard: newDiscard,
    pendingEffect: { ...state.pendingEffect, step: nextStep },
  };
}

/** 神社（29）：选手牌最多的玩家（并列时），收集所有人迷子 */
export function resolveShrinePickTarget(
  state: MissingChildGameState,
  targetPlayer: number,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'shrine_pick_target') return state;
  const allMaigo = state.players.flatMap(p => p.hand.filter(c => isMaigo(c.cardId)));
  const newPlayers = state.players.map((p, i) => {
    if (!p.alive) return p;
    if (i === targetPlayer) return { ...p, hand: [...p.hand.filter(c => !isMaigo(c.cardId)), ...allMaigo] };
    return { ...p, hand: p.hand.filter(c => !isMaigo(c.cardId)) };
  });
  return advanceAfterEffect({ ...state, players: newPlayers, pendingEffect: undefined });
}

/** 小黑崎（33）：选目标，把自己所有迷子交给他 */
export function resolveTransferAllMaigo(
  state: MissingChildGameState,
  targetPlayer: number,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'transfer_all_maigo') return state;
  const { triggeredBy } = state.pendingEffect;
  const myMaigo = state.players[triggeredBy].hand.filter(c => isMaigo(c.cardId));
  const newPlayers = state.players.map((p, i) => {
    if (i === triggeredBy) return { ...p, hand: p.hand.filter(c => !isMaigo(c.cardId)) };
    if (i === targetPlayer) return { ...p, hand: [...p.hand, ...myMaigo] };
    return p;
  });
  return advanceAfterEffect({ ...state, players: newPlayers, pendingEffect: undefined });
}

/** 河（24）：每个玩家提交一张牌，同时传给左手边 */
export function resolveRiverPick(
  state: MissingChildGameState,
  playerId: number,
  instanceId: number | null,
): MissingChildGameState {
  if (state.pendingEffect?.type !== 'river_pick') return state;
  const { selections = {}, affectedPlayers = [] } = state.pendingEffect;
  // instanceId 为 null 时表示该玩家跳过（没有手牌）
  const newSelections = { ...selections, [playerId]: instanceId ?? -1 };

  const allDone = affectedPlayers.every(id => newSelections[id] !== undefined);
  if (!allDone) {
    return { ...state, pendingEffect: { ...state.pendingEffect, selections: newSelections } };
  }

  // 同时传给左手边（跳过 instId 为 -1 的情况，表示该玩家没有手牌）
  let players = [...state.players];
  const n = players.length;
  const transferred: Map<number, CardRef> = new Map();

  for (const [pidStr, instId] of Object.entries(newSelections)) {
    const pid = Number(pidStr);
    if (instId === -1) continue; // 跳过没有手牌的玩家
    const card = players[pid].hand.find(c => c.instanceId === instId);
    if (!card) continue;
    transferred.set(pid, card);
    players = players.map((p, i) => i === pid ? { ...p, hand: p.hand.filter(c => c.instanceId !== instId) } : p);
  }

  for (const [pid, card] of transferred) {
    const left = (pid - 1 + n) % n;
    players = players.map((p, i) => i === left ? { ...p, hand: [...p.hand, card] } : p);
  }

  return advanceAfterEffect({ ...state, players, pendingEffect: undefined });
}

/** 平交道（6）：动画展示后结算 Bad End */
export function resolveCrossroadDraw(state: MissingChildGameState): MissingChildGameState {
  if (state.pendingEffect?.type !== 'crossroad_draw') return state;
  const { triggeredBy, card } = state.pendingEffect;
  let st = { ...state, pendingEffect: undefined };

  if (card && isMaigo(card.cardId)) {
    const nextHp = Math.max(0, st.players[triggeredBy].hp - 3);
    const badEndDescription = getRandomBadEndDescription(st.players[triggeredBy].name);
    const badEndLog: LogEntry = {
      id: `log-${Date.now()}-crossroad-badend-${triggeredBy}`,
      type: 'bad_end',
      round: st.round,
      turn: st.turn,
      playerIndex: triggeredBy,
      timestamp: Date.now(),
      message: `💀BE ${st.players[triggeredBy].name} ${badEndDescription}（平交道直击，-3SAN，现 ${nextHp} SAN）`,
    };
    st = {
      ...st,
      logs: [...(st.logs ?? []), badEndLog],
      players: st.players.map((p, i) =>
        i === triggeredBy ? { ...p, alive: false, hp: nextHp, badEnded: true } : p,
      ),
    };
  }

  return advanceAfterEffect(st);
}

/** Normal End 确认：将 gameEndPending 转为真正的 game_end */
export function confirmGameEnd(state: MissingChildGameState): MissingChildGameState {
  if (!state.gameEndPending) return state;
  return { ...state, gameEndPending: false, phase: 'game_end' };
}

// Re-export helpers needed by store
export { prevAliveIndex as enginePrevAliveIndex };
export { CARD_DEFS };
