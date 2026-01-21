// Zustand 游戏状态存储
import { create } from 'zustand';
import type { GameState, PlayedCard, PlayerRole, PlayerDeck, ActionCard, CharacterId, LocationType } from '@/types/game';
import {
  createMastermindDeck,
  createProtagonistDeck,
  getAvailableCards,
  markCardUsed,
  unmarkCardUsed,
  resetDailyUsage,
  resetLoopUsage,
} from '@/types/game';
import {
  initializeGameState,
  checkIncidents,
  handleIncident,
  resetLoop,
  advanceDay,
  isGameOver,
  applyIndicatorChange,
  combineMovements,
  applyMovement,
  processDawnPhase,
  canUseAbility,
  useCharacterAbility,
} from '@/game/engine';
import { FS01_SCRIPT1_PUBLIC, FS01_SCRIPT1_PRIVATE, FS01_CHARACTERS } from '@/game/scripts/fs-01';

interface GameStore {
  // 游戏状态
  gameState: GameState | null;
  playerRole: PlayerRole;
  
  // 牌组状态（每个玩家有自己的牌组）
  mastermindDeck: PlayerDeck;
  protagonistDeck: PlayerDeck;
  
  // 当前阶段的打出牌（面朝下，对对方保密）
  currentMastermindCards: PlayedCard[];
  currentProtagonistCards: PlayedCard[];

  // 派生状态
  getMyAvailableCards: () => ActionCard[];
  getMyDeck: () => PlayerDeck;
  getMyPlayedCards: () => PlayedCard[];
  
  // 检查目标是否已有我的牌
  isTargetOccupied: (targetCharacterId?: CharacterId, targetLocation?: LocationType) => boolean;

  // 动作
  initializeGame: (role: PlayerRole) => void;
  playCard: (card: PlayedCard) => void;
  retreatCard: (cardId: string) => void;  // 撤回牌
  
  // 阶段控制
  startDawn: () => void;              // 开始黎明阶段
  proceedToMastermindAction: () => void;  // 进入剧作家行动
  proceedToProtagonistAction: () => void; // 进入主人公行动
  proceedToResolution: () => void;   // 进入结算阶段
  proceedToAbility: () => void;      // 进入友好能力阶段
  proceedToIncident: () => void;     // 进入事件检查阶段
  proceedToNight: () => void;        // 进入夜晚阶段
  nextDay: () => void;               // 进入下一天（重新开始黎明阶段）
  
  resolveDay: () => void;
  endLoop: () => void;
  resetGame: () => void;
  
  // 手动调整指示物（玩家操作）
  adjustIndicator: (characterId: CharacterId, type: 'goodwill' | 'anxiety' | 'intrigue', delta: number) => void;
  
  // 切换玩家视角（单人调试模式）
  switchRole: () => void;
  
  // 设置玩家角色（联机模式用）
  setPlayerRole: (role: 'mastermind' | 'protagonist') => void;
  
  // 重置游戏
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  playerRole: 'protagonist',
  mastermindDeck: createMastermindDeck(),
  protagonistDeck: createProtagonistDeck(),
  currentMastermindCards: [],
  currentProtagonistCards: [],

  // 获取当前玩家可用的手牌
  getMyAvailableCards: () => {
    const { playerRole, mastermindDeck, protagonistDeck } = get();
    const deck = playerRole === 'mastermind' ? mastermindDeck : protagonistDeck;
    return getAvailableCards(deck);
  },

  // 获取当前玩家的牌组
  getMyDeck: () => {
    const { playerRole, mastermindDeck, protagonistDeck } = get();
    return playerRole === 'mastermind' ? mastermindDeck : protagonistDeck;
  },

  // 获取当前玩家已打出的牌
  getMyPlayedCards: () => {
    const { playerRole, currentMastermindCards, currentProtagonistCards } = get();
    return playerRole === 'mastermind' ? currentMastermindCards : currentProtagonistCards;
  },

  // 检查目标是否已被我方占用（每个目标只能放一张自己的牌）
  isTargetOccupied: (targetCharacterId?: CharacterId, targetLocation?: LocationType) => {
    const { playerRole, currentMastermindCards, currentProtagonistCards } = get();
    const myCards = playerRole === 'mastermind' ? currentMastermindCards : currentProtagonistCards;
    
    return myCards.some(pc => {
      if (targetCharacterId) {
        return pc.targetCharacterId === targetCharacterId;
      }
      if (targetLocation) {
        return pc.targetLocation === targetLocation && !pc.targetCharacterId;
      }
      return false;
    });
  },

  initializeGame: (role: PlayerRole) => {
    const privateInfo = role === 'mastermind' ? FS01_SCRIPT1_PRIVATE : null;
    const gameState = initializeGameState(FS01_SCRIPT1_PUBLIC, privateInfo);
    
    set({
      gameState,
      playerRole: role,
      mastermindDeck: createMastermindDeck(),
      protagonistDeck: createProtagonistDeck(),
      currentMastermindCards: [],
      currentProtagonistCards: [],
    });
  },

  playCard: (playedCard: PlayedCard) => {
    const { 
      playerRole,
      currentMastermindCards, currentProtagonistCards,
      mastermindDeck, protagonistDeck,
      isTargetOccupied,
    } = get();
    
    // 检查目标是否已被占用
    if (isTargetOccupied(playedCard.targetCharacterId, playedCard.targetLocation)) {
      console.warn('目标已被占用，无法放置');
      return;
    }

    // 任何牌都可以放在地点上（但只有密谋牌结算时生效）
    // 放"假牌"是合法的欺骗策略！
    
    if (playedCard.card.owner === 'mastermind') {
      const updatedDeck = markCardUsed(mastermindDeck, playedCard.card.id);
      set({ 
        currentMastermindCards: [...currentMastermindCards, playedCard],
        mastermindDeck: updatedDeck,
      });
    } else {
      const updatedDeck = markCardUsed(protagonistDeck, playedCard.card.id);
      set({ 
        currentProtagonistCards: [...currentProtagonistCards, playedCard],
        protagonistDeck: updatedDeck,
      });
    }
  },

  // 撤回已打出的牌
  retreatCard: (cardId: string) => {
    const { 
      playerRole,
      currentMastermindCards, currentProtagonistCards,
      mastermindDeck, protagonistDeck,
    } = get();

    if (playerRole === 'mastermind') {
      const cardToRetreat = currentMastermindCards.find(pc => pc.card.id === cardId);
      if (!cardToRetreat) return;
      
      const updatedDeck = unmarkCardUsed(mastermindDeck, cardId);
      const updatedCards = currentMastermindCards.filter(pc => pc.card.id !== cardId);
      set({
        currentMastermindCards: updatedCards,
        mastermindDeck: updatedDeck,
      });
    } else {
      const cardToRetreat = currentProtagonistCards.find(pc => pc.card.id === cardId);
      if (!cardToRetreat) return;
      
      const updatedDeck = unmarkCardUsed(protagonistDeck, cardId);
      const updatedCards = currentProtagonistCards.filter(pc => pc.card.id !== cardId);
      set({
        currentProtagonistCards: updatedCards,
        protagonistDeck: updatedDeck,
      });
    }
  },

  resolveDay: () => {
    const { gameState, currentMastermindCards, currentProtagonistCards } = get();
    if (!gameState) return;

    let updatedState = { ...gameState };
    const allCards = [...currentMastermindCards, ...currentProtagonistCards];

    // 辅助函数：检查某目标上是否有对方的"禁止"牌
    const hasForbidCard = (
      targetCharId: CharacterId | undefined,
      targetLoc: LocationType | undefined,
      cardType: ActionCardType,
      fromOwner: 'mastermind' | 'protagonist'
    ) => {
      const opponentOwner = fromOwner === 'mastermind' ? 'protagonist' : 'mastermind';
      return allCards.some(pc => 
        pc.card.owner === opponentOwner &&
        pc.card.type === cardType &&
        pc.card.isForbid === true &&
        pc.targetCharacterId === targetCharId &&
        (targetLoc ? pc.targetLocation === targetLoc : true)
      );
    };

    // 1. 处理移动牌（带叠加规则）
    const movementCards = allCards.filter(pc => pc.card.type === 'movement');
    
    // 按角色分组收集所有移动牌
    const movementsByCharacter = new Map<CharacterId, typeof movementCards>();
    
    movementCards.forEach(pc => {
      if (!pc.targetCharacterId || !pc.card.movementType) return;
      if (pc.card.movementType === 'forbid') return; // 禁止移动牌不产生移动
      
      const charId = pc.targetCharacterId;
      if (!movementsByCharacter.has(charId)) {
        movementsByCharacter.set(charId, []);
      }
      movementsByCharacter.get(charId)!.push(pc);
    });
    
    // 处理每个角色的移动
    movementsByCharacter.forEach((cards, charId) => {
      // 检查是否被"禁止移动"抵消（任意一方的禁止移动都会抵消）
      const isForbidden = allCards.some(other => 
        other.card.type === 'movement' &&
        other.card.movementType === 'forbid' &&
        other.targetCharacterId === charId
      );
      
      if (isForbidden) return; // 被禁止了，不移动
      
      // 收集所有移动方向
      const directions = cards
        .map(pc => pc.card.movementType)
        .filter((d): d is 'horizontal' | 'vertical' | 'diagonal' => 
          d === 'horizontal' || d === 'vertical' || d === 'diagonal'
        );
      
      // 使用叠加规则计算最终方向
      const finalDirection = combineMovements(directions);
      if (!finalDirection) return;

      const character = FS01_CHARACTERS[charId];
      const charState = updatedState.characters.find(c => c.id === charId);
      if (charState) {
        const newLocation = applyMovement(
          charId,
          charState.location,
          finalDirection,
          character.forbiddenLocation
        );
        updatedState.characters = updatedState.characters.map(c =>
          c.id === charId ? { ...c, location: newLocation } : c
        );
      }
    });

    // 2. 处理指示物牌（带禁止抵消逻辑）
    const indicatorCards = allCards.filter(pc => 
      pc.card.type === 'goodwill' || pc.card.type === 'anxiety' || pc.card.type === 'intrigue'
    );
    
    indicatorCards.forEach(pc => {
      // 跳过"禁止"牌本身（它不产生数值效果）
      if (pc.card.isForbid) return;
      
      // 检查是否被对方的"禁止"牌抵消
      const isForbidden = hasForbidCard(
        pc.targetCharacterId,
        pc.targetLocation,
        pc.card.type,
        pc.card.owner
      );
      
      if (isForbidden) return; // 被禁止抵消，无效果

      // 放在角色上的牌
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
      
      // 放在地点上的密谋牌（只有密谋牌有效）
      if (pc.targetLocation && !pc.targetCharacterId && pc.card.type === 'intrigue' && pc.card.value) {
        updatedState.boardIntrigue = {
          ...updatedState.boardIntrigue,
          [pc.targetLocation]: updatedState.boardIntrigue[pc.targetLocation] + pc.card.value,
        };
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

    // 重置每日使用的卡牌（进入新的一天）
    const { mastermindDeck, protagonistDeck } = get();
    set({
      gameState: updatedState,
      currentMastermindCards: [],
      currentProtagonistCards: [],
      mastermindDeck: resetDailyUsage(mastermindDeck),
      protagonistDeck: resetDailyUsage(protagonistDeck),
    });
  },

  // === 阶段控制函数 ===
  
  startDawn: () => {
    const { gameState } = get();
    if (!gameState) return;
    
    // 执行黎明阶段：亲友角色+1友好
    let updatedState = processDawnPhase(gameState);
    updatedState = { ...updatedState, phase: 'dawn' };
    
    set({ gameState: updatedState });
  },

  proceedToMastermindAction: () => {
    const { gameState } = get();
    if (!gameState) return;
    
    set({ 
      gameState: { ...gameState, phase: 'mastermind_action' },
      currentMastermindCards: [], // 清空上一阶段的牌
    });
  },

  proceedToProtagonistAction: () => {
    const { gameState } = get();
    if (!gameState) return;
    
    set({ 
      gameState: { ...gameState, phase: 'protagonist_action' },
      currentProtagonistCards: [], // 清空上一阶段的牌
    });
  },

  proceedToResolution: () => {
    const { gameState } = get();
    if (!gameState) return;
    
    // 进入结算阶段，调用原有的 resolveDay 逻辑
    set({ gameState: { ...gameState, phase: 'resolution' } });
    // 注意：实际结算在 resolveDay 中执行
  },

  proceedToAbility: () => {
    const { gameState } = get();
    if (!gameState) return;
    
    set({ gameState: { ...gameState, phase: 'ability' } });
  },

  proceedToIncident: () => {
    const { gameState } = get();
    if (!gameState) return;
    
    set({ gameState: { ...gameState, phase: 'incident' } });
  },

  proceedToNight: () => {
    const { gameState } = get();
    if (!gameState) return;
    
    set({ gameState: { ...gameState, phase: 'night' } });
  },

  nextDay: () => {
    const { gameState, mastermindDeck, protagonistDeck } = get();
    if (!gameState) return;
    
    // 进入下一天，从黎明阶段开始
    let updatedState = advanceDay(gameState);
    updatedState = processDawnPhase(updatedState); // 新一天的黎明阶段
    updatedState = { ...updatedState, phase: 'dawn' };
    
    // 重置每日卡牌使用
    set({
      gameState: updatedState,
      currentMastermindCards: [],
      currentProtagonistCards: [],
      mastermindDeck: resetDailyUsage(mastermindDeck),
      protagonistDeck: resetDailyUsage(protagonistDeck),
    });
  },

  endLoop: () => {
    const { gameState, mastermindDeck, protagonistDeck } = get();
    if (!gameState) return;

    const updatedState = resetLoop(gameState);
    // 新轮回：重置所有卡牌使用状态（包括"每轮限一次"的卡牌）
    set({ 
      gameState: updatedState,
      mastermindDeck: resetLoopUsage(mastermindDeck),
      protagonistDeck: resetLoopUsage(protagonistDeck),
      currentMastermindCards: [],
      currentProtagonistCards: [],
    });
  },

  resetGame: () => {
    set({
      gameState: null,
      mastermindDeck: createMastermindDeck(),
      protagonistDeck: createProtagonistDeck(),
      currentMastermindCards: [],
      currentProtagonistCards: [],
    });
  },

  // 手动调整指示物（左键+1，右键-1）
  adjustIndicator: (characterId: CharacterId, type: 'goodwill' | 'anxiety' | 'intrigue', delta: number) => {
    const { gameState } = get();
    if (!gameState) return;

    const updatedCharacters = gameState.characters.map(char => {
      if (char.id === characterId) {
        const newValue = Math.max(0, char.indicators[type] + delta); // 不能小于0
        return {
          ...char,
          indicators: {
            ...char.indicators,
            [type]: newValue,
          },
        };
      }
      return char;
    });

    set({
      gameState: {
        ...gameState,
        characters: updatedCharacters,
      },
    });
  },

  // 切换玩家视角（单人调试模式）
  switchRole: () => {
    const { playerRole } = get();
    set({
      playerRole: playerRole === 'mastermind' ? 'protagonist' : 'mastermind',
    });
  },

  // 设置玩家角色（联机模式用）
  setPlayerRole: (role: 'mastermind' | 'protagonist') => {
    set({ playerRole: role });
  },

  // 重置游戏
  resetGame: () => {
    set({
      gameState: null,
      mastermindDeck: createMastermindDeck(),
      protagonistDeck: createProtagonistDeck(),
      currentMastermindCards: [],
      currentProtagonistCards: [],
    });
  },
}));
