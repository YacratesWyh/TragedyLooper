import { create } from 'zustand';
import type { MissingChildGameState } from './types';
import {
  createInitialState,
  drawFromLeftByInstanceId,
  drawFromDeckTop,
  playCards as enginePlayCards,
  getLeftPlayerIndex,
  hasPlayableCard,
  advanceTurnWhenNoPlayable,
} from './engine';

interface MissingChildStore {
  gameState: MissingChildGameState | null;
  selectedInstanceIds: number[];

  startGame: (playerNames: string[]) => void;
  /** 从上家手牌中按牌背选一张抽走（以 instanceId 指定唯一牌） */
  drawFromLeftByInstanceId: (instanceId: number) => void;
  /** 从牌库顶抽一张 */
  drawFromDeck: () => void;
  toggleSelect: (instanceId: number) => void;
  playSelected: () => void;
  skipTurnNoPlayable: () => void;
  resetGame: () => void;
  setGameState: (state: MissingChildGameState) => void;
}

export const useMissingChildStore = create<MissingChildStore>((set, get) => ({
  gameState: null,
  selectedInstanceIds: [],

  startGame: (playerNames) => {
    set({
      gameState: createInitialState(playerNames),
      selectedInstanceIds: [],
    });
  },

  drawFromLeftByInstanceId: (instanceId) => {
    const { gameState } = get();
    if (!gameState || gameState.phase !== 'playing') return;

    const cur = gameState.players[gameState.currentPlayerIndex];
    if (!cur.alive || cur.drawnCard !== null) return;

    const next = drawFromLeftByInstanceId(gameState, instanceId);
    if (next !== gameState) set({ gameState: next });
  },

  drawFromDeck: () => {
    const { gameState } = get();
    if (!gameState || gameState.phase !== 'playing') return;

    const cur = gameState.players[gameState.currentPlayerIndex];
    if (!cur.alive || cur.drawnCard !== null) return;

    const next = drawFromDeckTop(gameState);
    if (next) set({ gameState: next });
  },

  toggleSelect: (instanceId) => {
    const { gameState, selectedInstanceIds } = get();
    if (!gameState || gameState.phase !== 'playing') return;

    const cur = gameState.players[gameState.currentPlayerIndex];
    if (!cur.alive || !cur.hand.some(c => c.instanceId === instanceId)) return;

    const idx = selectedInstanceIds.indexOf(instanceId);
    const next =
      idx === -1
        ? [...selectedInstanceIds, instanceId]
        : selectedInstanceIds.filter((_, i) => i !== idx);
    set({ selectedInstanceIds: next });
  },

  playSelected: () => {
    const { gameState, selectedInstanceIds } = get();
    if (!gameState || gameState.phase !== 'playing' || selectedInstanceIds.length === 0) return;

    const next = enginePlayCards(
      gameState,
      gameState.currentPlayerIndex,
      selectedInstanceIds,
    );
    set({
      gameState: next,
      selectedInstanceIds: [],
    });
  },

  skipTurnNoPlayable: () => {
    const { gameState } = get();
    if (!gameState || gameState.phase !== 'playing') return;
    const next = advanceTurnWhenNoPlayable(gameState);
    if (next) set({ gameState: next, selectedInstanceIds: [] });
  },

  resetGame: () => {
    set({ gameState: null, selectedInstanceIds: [] });
  },

  setGameState: (state) => {
    set({ gameState: state, selectedInstanceIds: [] });
  },
}));
