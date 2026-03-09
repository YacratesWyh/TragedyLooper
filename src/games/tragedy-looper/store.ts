// Zustand 游戏状态存储
import { create } from 'zustand';
import type { GameState, PlayedCard, PlayerRole, PlayerDeck, ActionCard, CharacterId, LocationType, TutorialCardPlay, RoleType } from '@/games/tragedy-looper/types';
import {
  createMastermindDeck,
  createProtagonistDeck,
  getAvailableCards,
  markCardUsed,
  unmarkCardUsed,
  resetDailyUsage,
  resetLoopUsage,
} from '@/games/tragedy-looper/types';
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
  processResolution,
  canUseAbility,
  useCharacterAbility,
} from '@/games/tragedy-looper/engine';
import { FS01_SCRIPT1_PUBLIC, FS01_SCRIPT1_PRIVATE } from '@/games/tragedy-looper/scripts/fs-01';
import { generatePublicInfo, type ScriptTemplate } from '@/games/tragedy-looper/scripts/registry';
import { ALL_CHARACTERS } from '@/games/tragedy-looper/scripts/characters';

// 天数历史快照
interface DaySnapshot {
  day: number;
  loop: number;
  phase: string;
  characters: GameState['characters'];
  boardIntrigue: GameState['boardIntrigue'];
}

export type GameMode = 'hotseat' | 'online' | null;

interface GameStore {
  // 游戏状态
  gameState: GameState | null;
  playerRole: PlayerRole;
  gameMode: GameMode;
  currentScript: ScriptTemplate | null;  // 当前使用的脚本
  
  // 天数历史（用于回放）
  dayHistory: DaySnapshot[];
  currentHistoryIndex: number | null;  // null = 当前状态，数字 = 回放中的历史索引
  
  // 结算消息（禁行区域等提示）
  resolutionMessages: string[];
  clearMessages: () => void;

  // 首次游戏简介引导（重新开始游戏时重置）
  introGuideDismissed: boolean;
  dismissIntroGuide: () => void;

  // 主人公身份猜测（纯本地标注，不影响游戏逻辑）
  protagonistGuesses: Partial<Record<CharacterId, RoleType>>;
  setProtagonistGuess: (charId: CharacterId, role: RoleType | null) => void;
  
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

  // 模式
  setGameMode: (mode: GameMode) => void;

  // 动作
  initializeGame: (role: PlayerRole) => void;
  initializeHotseatGame: () => void;
  initializeWithScript: (role: PlayerRole, script: ScriptTemplate) => void;
  playCard: (card: PlayedCard) => void;
  executeTutorialPlays: (plays: TutorialCardPlay[]) => void;
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
  
  // 记录阶段快照（用于复位手动操作）
  takePhaseSnapshot: () => void;
  // 恢复到阶段开始时的状态
  revertPhaseState: () => void;
  // 切换角色存活状态
  toggleCharacterLife: (characterId: CharacterId) => void;
  // 移动角色到新地点
  moveCharacter: (characterId: CharacterId, location: LocationType) => void;

  // 切换玩家视角（单人调试模式）
  switchRole: () => void;
  
  // 设置玩家角色（联机模式用）
  setPlayerRole: (role: 'mastermind' | 'protagonist' | null) => void;

  // 导出/导入游戏状态
  exportState: () => void;
  importState: (file: File) => Promise<void>;

  // 获取需要同步的完整状态包
  getSyncPayload: () => any;

  // 历史回放
  saveDaySnapshot: () => void;  // 保存当天状态到历史
  viewHistoryDay: (index: number) => void;  // 查看历史某天
  exitHistoryView: () => void;  // 退出回放，返回当前状态
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  playerRole: 'protagonist',
  gameMode: null,
  currentScript: null,
  dayHistory: [],
  currentHistoryIndex: null,
  resolutionMessages: [],
  mastermindDeck: createMastermindDeck(),
  protagonistDeck: createProtagonistDeck(),
  currentMastermindCards: [],
  currentProtagonistCards: [],

  clearMessages: () => set({ resolutionMessages: [] }),

  introGuideDismissed: false,
  dismissIntroGuide: () => set({ introGuideDismissed: true }),

  protagonistGuesses: {},
  setProtagonistGuess: (charId, role) => set((state) => {
    const next = { ...state.protagonistGuesses };
    if (role === null) {
      delete next[charId];
    } else {
      next[charId] = role;
    }
    return { protagonistGuesses: next };
  }),

  setGameMode: (mode: GameMode) => set({ gameMode: mode }),

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
    const gameState = initializeGameState(FS01_SCRIPT1_PUBLIC, privateInfo, ALL_CHARACTERS);
    
    // 初始状态快照
    const initialSnapshot: DaySnapshot = {
      day: 1,
      loop: 1,
      phase: 'dawn',
      characters: JSON.parse(JSON.stringify(gameState.characters)),
      boardIntrigue: { ...gameState.boardIntrigue },
    };

    set({
      gameState,
      playerRole: role,
      currentScript: null,
      mastermindDeck: createMastermindDeck(),
      protagonistDeck: createProtagonistDeck(),
      currentMastermindCards: [],
      currentProtagonistCards: [],
      dayHistory: [initialSnapshot],  // 保存初始状态
      currentHistoryIndex: null,
    });
  },

  // 热座模式初始化：始终加载 privateInfo（引擎需要），初始视角为剧作家
  initializeHotseatGame: () => {
    const gameState = initializeGameState(FS01_SCRIPT1_PUBLIC, FS01_SCRIPT1_PRIVATE, ALL_CHARACTERS);
    
    const initialSnapshot: DaySnapshot = {
      day: 1,
      loop: 1,
      phase: 'dawn',
      characters: JSON.parse(JSON.stringify(gameState.characters)),
      boardIntrigue: { ...gameState.boardIntrigue },
    };

    set({
      gameState,
      gameMode: 'hotseat',
      playerRole: 'mastermind',
      currentScript: null,
      mastermindDeck: createMastermindDeck(),
      protagonistDeck: createProtagonistDeck(),
      currentMastermindCards: [],
      currentProtagonistCards: [],
      dayHistory: [initialSnapshot],
      currentHistoryIndex: null,
    });
  },

  // 使用指定脚本初始化游戏
  initializeWithScript: (role: PlayerRole, script: ScriptTemplate) => {
    const publicInfo = generatePublicInfo(script);
    // 注意：privateInfo 需要剧作家在后续步骤中配置角色身份
    // 这里暂时使用默认的私有信息结构
    const privateInfo = role === 'mastermind' ? {
      ruleY: 'murder_plan' as const,
      ruleX: 'circle_of_friends' as const,
      roles: script.characters.map(charId => ({
        characterId: charId,
        role: 'civilian' as const,  // 默认平民，剧作家后续分配
      })),
      incidents: script.incidents.map((inc, i) => ({
        id: `incident_${i}`,
        day: inc.day,
        actorId: script.characters[0], // 默认第一个角色，剧作家后续分配
        type: inc.type,
        description: '',
      })),
    } : null;
    
    const gameState = initializeGameState(publicInfo, privateInfo, ALL_CHARACTERS);
    
    // 初始状态快照
    const initialSnapshot: DaySnapshot = {
      day: 1,
      loop: 1,
      phase: 'dawn',
      characters: JSON.parse(JSON.stringify(gameState.characters)),
      boardIntrigue: { ...gameState.boardIntrigue },
    };

    set({
      gameState,
      playerRole: role,
      currentScript: script,
      mastermindDeck: createMastermindDeck(),
      protagonistDeck: createProtagonistDeck(),
      currentMastermindCards: [],
      currentProtagonistCards: [],
      dayHistory: [initialSnapshot],  // 保存初始状态
      currentHistoryIndex: null,
    });
    
    console.log('🎭 游戏初始化完成，脚本:', script.name, '角色:', script.characters);
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

  executeTutorialPlays: (plays: TutorialCardPlay[]) => {
    const {
      mastermindDeck, protagonistDeck,
      currentMastermindCards, currentProtagonistCards,
    } = get();

    const mmPlays: PlayedCard[] = [];
    const proPlays: PlayedCard[] = [];
    let mmDeck = mastermindDeck;
    let proDeck = protagonistDeck;

    for (const play of plays) {
      const isMM = play.cardId.startsWith('mm-');
      const deck = isMM ? mmDeck : proDeck;
      const card = deck.allCards.find(c => c.id === play.cardId);
      if (!card) {
        console.error(`[教学配牌] 找不到卡牌: ${play.cardId}`);
        continue;
      }

      const played: PlayedCard = {
        card,
        targetCharacterId: play.targetCharacterId,
        targetLocation: play.targetLocation,
      };

      if (isMM) {
        mmPlays.push(played);
        mmDeck = markCardUsed(mmDeck, card.id);
      } else {
        proPlays.push(played);
        proDeck = markCardUsed(proDeck, card.id);
      }
    }

    set({
      currentMastermindCards: [...currentMastermindCards, ...mmPlays],
      currentProtagonistCards: [...currentProtagonistCards, ...proPlays],
      mastermindDeck: mmDeck,
      protagonistDeck: proDeck,
    });
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

    // 使用引擎中的 processResolution 处理结算
    const result = processResolution(
      gameState,
      currentMastermindCards,
      currentProtagonistCards,
      ALL_CHARACTERS
    );

    let updatedState = result.state;

    // 检查游戏是否结束（仅检查关键人物死亡等即时结束条件）
    const gameOverCheck = isGameOver(updatedState);
    if (gameOverCheck.isOver) {
      updatedState.phase = 'game_over';
    }

    // 更新状态，保存结算消息
    set({
      gameState: updatedState,
      resolutionMessages: result.messages,
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
    
    set({ gameState: { ...gameState, phase: 'mastermind_ability' } });
  },

  proceedToIncident: () => {
    const { gameState } = get();
    if (!gameState) return;
    
    set({ gameState: { ...gameState, phase: 'incident' } });
  },

  proceedToNight: () => {
    const { gameState } = get();
    if (!gameState) return;

    const nightMessages: string[] = [];

    // 检查杀人狂（serial_killer）夜晚强制能力
    const roles = gameState.privateInfo?.roles ?? [];
    const killerRole = roles.find(r => r.role === 'serial_killer');
    if (killerRole) {
      const killer = gameState.characters.find(c => c.id === killerRole.characterId && c.alive);
      if (killer) {
        const colocated = gameState.characters.filter(
          c => c.alive && c.id !== killer.id && c.location === killer.location
        );
        if (colocated.length === 1) {
          const victim = ALL_CHARACTERS[colocated[0].id];
          const killerChar = ALL_CHARACTERS[killer.id];
          nightMessages.push(
            `⚠ 杀人狂触发——${killerChar?.name ?? killer.id}与${victim?.name ?? colocated[0].id}独处同一区域，${victim?.name ?? colocated[0].id}在夜晚死亡！`
          );
        }
      }
    }

    set({
      gameState: { ...gameState, phase: 'night' },
      ...(nightMessages.length > 0 && { resolutionMessages: nightMessages }),
    });
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

    let updatedState = resetLoop(gameState, ALL_CHARACTERS);
    
    // 检查剧作家是否因轮数耗尽而获胜
    const gameOverCheck = isGameOver(updatedState);
    if (gameOverCheck.isOver) {
      updatedState.phase = 'game_over';
    }

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
      gameMode: null,
      mastermindDeck: createMastermindDeck(),
      protagonistDeck: createProtagonistDeck(),
      currentMastermindCards: [],
      currentProtagonistCards: [],
      dayHistory: [],
      currentHistoryIndex: null,
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

  // 记录阶段快照（用于复位手动操作）
  takePhaseSnapshot: () => {
    const { gameState } = get();
    if (!gameState) return;
    
    set({
      gameState: {
        ...gameState,
        phaseSnapshot: {
          characters: JSON.parse(JSON.stringify(gameState.characters)), // 深拷贝
          boardIntrigue: { ...gameState.boardIntrigue }
        }
      }
    });
  },

  // 恢复到阶段开始时的状态
  revertPhaseState: () => {
    const { gameState } = get();
    if (!gameState || !gameState.phaseSnapshot) return;

    set({
      gameState: {
        ...gameState,
        characters: gameState.phaseSnapshot.characters,
        boardIntrigue: gameState.phaseSnapshot.boardIntrigue
      }
    });
  },

  // 切换角色存活状态
  toggleCharacterLife: (characterId: CharacterId) => {
    const { gameState } = get();
    if (!gameState) return;

    const updatedCharacters = gameState.characters.map(char => {
      if (char.id === characterId) {
        return { ...char, alive: !char.alive };
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

  // 移动角色到新地点
  moveCharacter: (characterId: CharacterId, location: LocationType) => {
    const { gameState } = get();
    if (!gameState) return;

    const updatedCharacters = gameState.characters.map(char => {
      if (char.id === characterId) {
        return { ...char, location };
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
  setPlayerRole: (role: 'mastermind' | 'protagonist' | null) => {
    if (role) {
      set({ playerRole: role });
    }
    // null 时不改变，保持当前角色
  },

  // 导出当前存档
  exportState: () => {
    const { 
      gameState, 
      mastermindDeck, 
      protagonistDeck, 
      currentMastermindCards, 
      currentProtagonistCards,
      dayHistory,
      currentScript
    } = get();

    if (!gameState) {
      alert('没有正在进行的游戏可以保存');
      return;
    }

    const saveData = {
      version: '0.0.8',
      timestamp: new Date().toISOString(),
      gameState,
      mastermindDeck,
      protagonistDeck,
      currentMastermindCards,
      currentProtagonistCards,
      dayHistory,
      currentScript
    };

    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tragedy-looper-save-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // 读取存档
  importState: async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 基本验证
      if (!data.gameState || !data.mastermindDeck || !data.protagonistDeck) {
        throw new Error('无效的存档文件格式');
      }

      // 处理 Set 序列化问题（存档中是数组，store 中需要是 Set 的地方由 store 处理逻辑保证）
      // 这里的逻辑需要确保 deck 中的 usedToday/usedThisLoop 能正确恢复
      // 目前 markCardUsed 等函数会处理数组或 Set 的兼容性

      set({
        gameState: data.gameState,
        mastermindDeck: data.mastermindDeck,
        protagonistDeck: data.protagonistDeck,
        currentMastermindCards: data.currentMastermindCards || [],
        currentProtagonistCards: data.currentProtagonistCards || [],
        dayHistory: data.dayHistory || [],
        currentScript: data.currentScript || null,
        currentHistoryIndex: null // 恢复后默认不处于回放模式
      });

      console.log('📂 存档读取成功');
    } catch (error) {
      console.error('读取存档失败:', error);
      alert('读取存档失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  },

  // 获取需要同步的完整状态包
  getSyncPayload: () => {
    const { 
      gameState, 
      mastermindDeck, 
      protagonistDeck, 
      currentMastermindCards, 
      currentProtagonistCards,
      dayHistory 
    } = get();
    
    return {
      gameState,
      mastermindDeck,
      protagonistDeck,
      currentMastermindCards,
      currentProtagonistCards,
      dayHistory
    };
  },

  // 保存当天状态到历史
  saveDaySnapshot: () => {
    const { gameState, dayHistory } = get();
    if (!gameState) return;

    const snapshot: DaySnapshot = {
      day: gameState.currentDay,
      loop: gameState.currentLoop,
      phase: gameState.phase,
      characters: JSON.parse(JSON.stringify(gameState.characters)),
      boardIntrigue: { ...gameState.boardIntrigue },
    };

    set({ dayHistory: [...dayHistory, snapshot] });
  },

  // 查看历史某天
  viewHistoryDay: (index: number) => {
    const { dayHistory, gameState } = get();
    if (index < 0 || index >= dayHistory.length || !gameState) return;

    set({ currentHistoryIndex: index });
  },

  // 退出回放，返回当前状态
  exitHistoryView: () => {
    set({ currentHistoryIndex: null });
  },
}));
