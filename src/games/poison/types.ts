export type PotionColor = 'red' | 'blue' | 'purple';
export type CardColor = PotionColor | 'poison';

export interface Card {
  id: number;
  color: CardColor;
  value: number;
}

export interface Cauldron {
  lockedColor: PotionColor | null;
  cards: Card[];
  total: number;
}

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  collected: Card[];
  roundScores: number[];
}

export type GamePhase =
  | 'setup'
  | 'playing'
  | 'scoring'
  | 'round_end'
  | 'game_over';

export interface Explosion {
  cauldronIndex: number;
  playerName: string;
  cardsTaken: number;
  hadPoison: boolean;
  timestamp: number;
}

export interface PoisonGameState {
  cauldrons: [Cauldron, Cauldron, Cauldron];
  players: Player[];
  dealerIndex: number;
  currentPlayerIndex: number;
  round: number;
  totalRounds: number;
  phase: GamePhase;
  lastExplosion: Explosion | null;
}

export const POTION_COLORS: PotionColor[] = ['red', 'blue', 'purple'];

export const COLOR_LABELS: Record<CardColor, string> = {
  red: '红',
  blue: '蓝',
  purple: '紫',
  poison: '毒',
};

export const ALL_COLORS: CardColor[] = ['red', 'purple', 'blue', 'poison'];

export const COLOR_CSS: Record<CardColor, { bg: string; border: string; text: string; dot: string }> = {
  red: { bg: 'bg-red-900/70', border: 'border-red-500', text: 'text-red-300', dot: 'bg-red-500' },
  blue: { bg: 'bg-blue-900/70', border: 'border-blue-500', text: 'text-blue-300', dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-900/70', border: 'border-purple-500', text: 'text-purple-300', dot: 'bg-purple-500' },
  poison: { bg: 'bg-emerald-900/70', border: 'border-emerald-400', text: 'text-emerald-300', dot: 'bg-emerald-500' },
};
