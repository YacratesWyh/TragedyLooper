// Zustand 游戏状态存储
import { create } from 'zustand';
import type { GameState, PlayedCard, PlayerRole } from '@/types/game';
import {
  initializeGameState,
  checkIncidents,
  handleIncident,
  resetLoop,
  advanceDay,
  isGameOver,
  applyIndicatorChange,
  applyMovement,
} from '@/game/engine';
import { FS01_SCRIPT1_PUBLIC, FS01_SCRIPT1_PRIVATE, FS01_CHARACTERS } from '@/game/scripts/fs-01';

interface GameStore {
  // 游戏状态
  gameState: GameState | null;
  playerRole: PlayerRole;
  
  // 当前阶段的打出牌
  currentMastermindCards: PlayedCard[];
  currentProtagonistCards: PlayedCard[];

  // 动作
  initializeGame: (role: PlayerRole) => void;
  playCard: (card: PlayedCard) => void;
  resolveDay: () => void;
  endLoop: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  playerRole: 'protagonist',
  currentMastermindCards: [],
  currentProtagonistCards: [],

  initializeGame: (role: PlayerRole) => {
    const privateInfo = role === 'mastermind' ? FS01_SCRIPT1_PRIVATE : null;
    const gameState = initializeGameState(FS01_SCRIPT1_PUBLIC, privateInfo);
    
    set({
      gameState,
      playerRole: role,
      currentMastermindCards: [],
      currentProtagonistCards: [],
    });
  },

  playCard: (playedCard: PlayedCard) => {
    const { currentMastermindCards, currentProtagonistCards } = get();
    
    if (playedCard.card.owner === 'mastermind') {
      set({ currentMastermindCards: [...currentMastermindCards, playedCard] });
    } else {
      set({ currentProtagonistCards: [...currentProtagonistCards, playedCard] });
    }
  },

  resolveDay: () => {
    const { gameState, currentMastermindCards, currentProtagonistCards } = get();
    if (!gameState) return;

    let updatedState = { ...gameState };

    // 1. 处理移动牌
    const allCards = [...currentMastermindCards, ...currentProtagonistCards];
    const movementCards = allCards.filter(pc => pc.card.type === 'movement');
    
    movementCards.forEach(pc => {
      if (pc.targetCharacterId && pc.card.movementType && pc.card.movementType !== 'forbid') {
        const character = FS01_CHARACTERS[pc.targetCharacterId];
        const charState = updatedState.characters.find(c => c.id === pc.targetCharacterId);
        if (charState) {
          const newLocation = applyMovement(
            pc.targetCharacterId,
            charState.location,
            pc.card.movementType,
            character.forbiddenLocation
          );
          updatedState.characters = updatedState.characters.map(c =>
            c.id === pc.targetCharacterId ? { ...c, location: newLocation } : c
          );
        }
      }
    });

    // 2. 处理指示物牌
    const indicatorCards = allCards.filter(pc => 
      pc.card.type === 'goodwill' || pc.card.type === 'anxiety' || pc.card.type === 'intrigue'
    );
    
    indicatorCards.forEach(pc => {
      if (pc.targetCharacterId && pc.card.value) {
        updatedState.characters = updatedState.characters.map(c => {
          if (c.id === pc.targetCharacterId) {
            const indicators = applyIndicatorChange(
              c.indicators,
              pc.card.type as 'goodwill' | 'anxiety' | 'intrigue',
              pc.card.value!
            );
            return { ...c, indicators };
          }
          return c;
        });
      }
    });

    // 3. 检查事件
    const incident = checkIncidents(updatedState);
    if (incident) {
      if (incident.type === 'murder') {
        updatedState = handleIncident(updatedState);
      }
    }

    // 4. 检查游戏是否结束
    const gameOverCheck = isGameOver(updatedState);
    if (gameOverCheck.isOver) {
      updatedState.phase = 'game_end';
    } else if (updatedState.currentDay >= updatedState.publicInfo.days) {
      // 天数结束，进入轮回结束
      updatedState.phase = 'loop_end';
    } else {
      // 进入下一天
      updatedState = advanceDay(updatedState);
    }

    set({
      gameState: updatedState,
      currentMastermindCards: [],
      currentProtagonistCards: [],
    });
  },

  endLoop: () => {
    const { gameState } = get();
    if (!gameState) return;

    const updatedState = resetLoop(gameState);
    set({ gameState: updatedState });
  },

  resetGame: () => {
    set({
      gameState: null,
      currentMastermindCards: [],
      currentProtagonistCards: [],
    });
  },
}));
