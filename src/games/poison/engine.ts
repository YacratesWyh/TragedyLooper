import type { Card, Cauldron, Player, PoisonGameState, PotionColor } from './types';
import { POTION_COLORS } from './types';

function createDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;

  for (const color of POTION_COLORS) {
    const values = [1, 1, 1, 2, 2, 2, 4, 4, 5, 5, 5, 7, 7, 7];
    for (const value of values) {
      cards.push({ id: id++, color, value });
    }
  }

  for (let i = 0; i < 8; i++) {
    cards.push({ id: id++, color: 'poison', value: 4 });
  }

  return cards;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function deal(playerCount: number): Card[][] {
  const deck = shuffle(createDeck());
  const dealTo = playerCount === 3 ? 4 : playerCount;
  const hands: Card[][] = Array.from({ length: dealTo }, () => []);
  deck.forEach((card, i) => { hands[i % dealTo].push(card); });
  return hands.slice(0, playerCount);
}

export function emptyCauldron(): Cauldron {
  return { lockedColor: null, cards: [], total: 0 };
}

export function createInitialState(playerNames: string[]): PoisonGameState {
  const n = playerNames.length;
  const hands = deal(n);
  const players: Player[] = playerNames.map((name, i) => ({
    id: i,
    name,
    hand: hands[i],
    collected: [],
    roundScores: [],
  }));

  return {
    cauldrons: [emptyCauldron(), emptyCauldron(), emptyCauldron()],
    players,
    dealerIndex: 0,
    currentPlayerIndex: 1 % n,
    round: 1,
    totalRounds: n,
    phase: 'playing',
    lastExplosion: null,
  };
}

export function canPlayCard(
  card: Card,
  cauldronIndex: number,
  cauldrons: [Cauldron, Cauldron, Cauldron],
): boolean {
  const target = cauldrons[cauldronIndex];
  if (card.color === 'poison') return true;

  if (target.lockedColor === null) {
    return !cauldrons.some((c, i) => i !== cauldronIndex && c.lockedColor === card.color);
  }
  return target.lockedColor === card.color;
}

export function getPlayableCauldrons(
  card: Card,
  cauldrons: [Cauldron, Cauldron, Cauldron],
): boolean[] {
  return [0, 1, 2].map(i => canPlayCard(card, i, cauldrons));
}

export interface PlayResult {
  state: PoisonGameState;
  exploded: boolean;
}

export function playCard(
  state: PoisonGameState,
  cardId: number,
  cauldronIndex: number,
): PlayResult {
  const player = state.players[state.currentPlayerIndex];
  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx === -1) return { state, exploded: false };

  const card = player.hand[cardIdx];
  if (!canPlayCard(card, cauldronIndex, state.cauldrons)) {
    return { state, exploded: false };
  }

  const newHand = player.hand.filter((_, i) => i !== cardIdx);
  const cauldron = state.cauldrons[cauldronIndex];
  const newTotal = cauldron.total + card.value;
  let exploded = false;
  let newCollected = [...player.collected];

  const newCauldrons = [...state.cauldrons] as [Cauldron, Cauldron, Cauldron];

  if (newTotal > 13) {
    exploded = true;
    newCollected = [...newCollected, ...cauldron.cards, card];
    newCauldrons[cauldronIndex] = emptyCauldron();
  } else {
    newCauldrons[cauldronIndex] = {
      lockedColor: cauldron.lockedColor ?? (card.color === 'poison' ? null : card.color as PotionColor),
      cards: [...cauldron.cards, card],
      total: newTotal,
    };
  }

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, hand: newHand, collected: newCollected }
      : p,
  );

  const allHandsEmpty = newPlayers.every(p => p.hand.length === 0);
  const n = newPlayers.length;
  const nextPlayer = (state.currentPlayerIndex + 1) % n;

  return {
    state: {
      ...state,
      cauldrons: newCauldrons,
      players: newPlayers,
      currentPlayerIndex: allHandsEmpty ? state.currentPlayerIndex : nextPlayer,
      phase: allHandsEmpty ? 'scoring' : 'playing',
      lastExplosion: exploded
        ? {
            cauldronIndex,
            playerName: player.name,
            cardsTaken: cauldron.cards.length + 1,
            hadPoison: card.color === 'poison' || cauldron.cards.some(c => c.color === 'poison'),
            timestamp: Date.now(),
          }
        : null,
    },
    exploded,
  };
}

export interface ScoringResult {
  players: Player[];
  discards: Map<number, Card[]>;
  roundScores: number[];
}

export function scoreRound(players: Player[]): ScoringResult {
  const discards = new Map<number, Card[]>();

  for (const color of POTION_COLORS) {
    const counts = players.map(p => ({
      playerId: p.id,
      count: p.collected.filter(c => c.color === color).length,
    }));

    const maxCount = Math.max(...counts.map(c => c.count));
    if (maxCount === 0) continue;

    const winners = counts.filter(c => c.count === maxCount);
    if (winners.length === 1) {
      const pid = winners[0].playerId;
      const existing = discards.get(pid) ?? [];
      const p = players.find(pl => pl.id === pid)!;
      existing.push(...p.collected.filter(c => c.color === color));
      discards.set(pid, existing);
    }
  }

  const roundScores = players.map(p => {
    const discardedIds = new Set((discards.get(p.id) ?? []).map(c => c.id));
    return p.collected.reduce((sum, card) => {
      if (discardedIds.has(card.id)) return sum;
      return sum + (card.color === 'poison' ? 2 : 1);
    }, 0);
  });

  const updatedPlayers = players.map((p, i) => ({
    ...p,
    roundScores: [...p.roundScores, roundScores[i]],
  }));

  return { players: updatedPlayers, discards, roundScores };
}

export function startNextRound(state: PoisonGameState): PoisonGameState {
  const n = state.players.length;
  const newDealer = (state.dealerIndex + 1) % n;
  const newRound = state.round + 1;
  const hands = deal(n);

  if (newRound > state.totalRounds) {
    return { ...state, phase: 'game_over' };
  }

  const newPlayers = state.players.map((p, i) => ({
    ...p,
    hand: hands[i],
    collected: [],
  }));

  return {
    cauldrons: [emptyCauldron(), emptyCauldron(), emptyCauldron()],
    players: newPlayers,
    dealerIndex: newDealer,
    currentPlayerIndex: (newDealer + 1) % n,
    round: newRound,
    totalRounds: state.totalRounds,
    phase: 'playing',
    lastExplosion: null,
  };
}

export function getTotalScores(players: Player[]): number[] {
  return players.map(p => p.roundScores.reduce((a, b) => a + b, 0));
}

export function getWinner(players: Player[]): Player {
  const totals = getTotalScores(players);
  let minIdx = 0;
  for (let i = 1; i < totals.length; i++) {
    if (totals[i] < totals[minIdx]) minIdx = i;
  }
  return players[minIdx];
}
