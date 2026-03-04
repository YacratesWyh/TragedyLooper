import { create } from 'zustand';
import type { PoisonGameState, Explosion } from './types';
import {
  createInitialState,
  playCard as enginePlayCard,
  scoreRound,
  startNextRound,
  getTotalScores,
  getWinner,
  getPlayableCauldrons,
} from './engine';

interface PoisonStore {
  gameState: PoisonGameState | null;
  selectedCardId: number | null;
  playableCauldrons: boolean[];
  scoringResult: ReturnType<typeof scoreRound> | null;

  startGame: (playerNames: string[]) => void;
  selectCard: (cardId: number | null) => void;
  playCard: (cauldronIndex: number) => void;
  finishScoring: () => void;
  nextRound: () => void;
  resetGame: () => void;
  /** 联机模式：接收远端广播的完整游戏状态 */
  setGameState: (state: PoisonGameState) => void;
}

export const usePoisonStore = create<PoisonStore>((set, get) => ({
  gameState: null,
  selectedCardId: null,
  playableCauldrons: [false, false, false],
  scoringResult: null,

  startGame: (playerNames) => {
    set({
      gameState: createInitialState(playerNames),
      selectedCardId: null,
      playableCauldrons: [false, false, false],
      scoringResult: null,
    });
  },

  selectCard: (cardId) => {
    const { gameState } = get();
    if (!gameState || gameState.phase !== 'playing') return;

    if (cardId === null) {
      set({ selectedCardId: null, playableCauldrons: [false, false, false] });
      return;
    }

    const player = gameState.players[gameState.currentPlayerIndex];
    const card = player.hand.find(c => c.id === cardId);
    if (!card) return;

    set({
      selectedCardId: cardId,
      playableCauldrons: getPlayableCauldrons(card, gameState.cauldrons),
    });
  },

  playCard: (cauldronIndex) => {
    const { gameState, selectedCardId } = get();
    if (!gameState || selectedCardId === null) return;

    const result = enginePlayCard(gameState, selectedCardId, cauldronIndex);

    set({
      gameState: result.state,
      selectedCardId: null,
      playableCauldrons: [false, false, false],
    });

    if (result.state.phase === 'scoring') {
      const scoring = scoreRound(result.state.players);
      const updatedState = {
        ...result.state,
        players: scoring.players,
        phase: 'round_end' as const,
      };
      setTimeout(() => {
        set({ gameState: updatedState, scoringResult: scoring });
      }, 300);
    }
  },

  finishScoring: () => {
    set({ scoringResult: null });
  },

  nextRound: () => {
    const { gameState } = get();
    if (!gameState) return;

    const next = startNextRound(gameState);
    set({ gameState: next, scoringResult: null });
  },

  resetGame: () => {
    set({
      gameState: null,
      selectedCardId: null,
      playableCauldrons: [false, false, false],
      scoringResult: null,
    });
  },

  setGameState: (state) => {
    set({
      gameState: state,
      selectedCardId: null,
      playableCauldrons: [false, false, false],
      scoringResult: null,
    });
  },
}));
