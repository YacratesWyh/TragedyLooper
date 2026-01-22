// 游戏引擎 - 核心逻辑
import type {
  GameState,
  CharacterState,
  CharacterId,
  LocationType,
  Incident,
  PrivateInfo,
  PublicInfo,
  Indicators,
  PlayedCard,
  ActionCardType,
} from '@/types/game';
import { FS01_CHARACTERS } from './scripts/fs-01';

/** 初始化角色状态 */
export function initializeCharacterState(characterId: CharacterId): CharacterState {
  const character = FS01_CHARACTERS[characterId];
  return {
    id: characterId,
    location: character.initialLocation,
    indicators: {
      goodwill: 0,
      anxiety: 0,
      intrigue: 0,
    },
    alive: true,
    abilityUsesThisLoop: {},
  };
}

/** 初始化游戏状态 */
export function initializeGameState(
  publicInfo: PublicInfo,
  privateInfo: PrivateInfo | null
): GameState {
  const characterStates = publicInfo.characters.map(initializeCharacterState);

  return {
    currentLoop: 1,
    currentDay: 1,
    characters: characterStates,
    boardIntrigue: {
      hospital: 0,
      shrine: 0,
      city: 0,
      school: 0,
    },
    privateInfo,
    publicInfo,
    phase: 'dawn',  // 每天从黎明阶段开始
    cardsPlayedToday: 0,
  };
}

/** 检查事件是否可以触发 */
export function canIncidentTrigger(
  incident: Incident,
  state: GameState
): boolean {
  // I. 今天有事件
  if (incident.day !== state.currentDay) {
    return false;
  }

  // II. 该事件的当事人仍存活
  const actor = state.characters.find((c) => c.id === incident.actorId);
  if (!actor || !actor.alive) {
    return false;
  }

  // III. 当事人的不安 >= 不安限度
  const character = FS01_CHARACTERS[incident.actorId];
  if (actor.indicators.anxiety < character.anxietyLimit) {
    return false;
  }

  return true;
}

/** 检查是否有事件触发 */
export function checkIncidents(state: GameState): Incident | null {
  if (!state.privateInfo) {
    return null;
  }

  for (const incident of state.privateInfo.incidents) {
    if (canIncidentTrigger(incident, state)) {
      return incident;
    }
  }

  return null;
}

/**
 * 移动方向叠加规则
 * 
 * 规则表：
 * - 相同方向 = 相同方向（横+横=横，竖+竖=竖，斜+斜=斜）
 * - 不同方向 = 斜向（横+竖=斜）
 * - 斜向+方向 = 垂直方向（斜+横=竖，斜+竖=横）
 * 
 * 这形成一个模3群运算：
 * H=0, V=1, D=2
 * H+H=H, V+V=V, D+D=D (同+同=同)
 * H+V=D, V+H=D (不同=斜)
 * D+H=V, D+V=H, H+D=V, V+D=H (斜+方向=垂直方向)
 */
export type MovementDirection = 'horizontal' | 'vertical' | 'diagonal';

export function combineMovements(directions: MovementDirection[]): MovementDirection | null {
  if (directions.length === 0) return null;
  if (directions.length === 1) return directions[0];

  // 叠加规则表
  const combineTwo = (a: MovementDirection, b: MovementDirection): MovementDirection => {
    if (a === b) return a; // 相同方向 = 相同方向
    
    // 横+竖 或 竖+横 = 斜
    if ((a === 'horizontal' && b === 'vertical') || (a === 'vertical' && b === 'horizontal')) {
      return 'diagonal';
    }
    
    // 斜+横 或 横+斜 = 竖
    if ((a === 'diagonal' && b === 'horizontal') || (a === 'horizontal' && b === 'diagonal')) {
      return 'vertical';
    }
    
    // 斜+竖 或 竖+斜 = 横
    if ((a === 'diagonal' && b === 'vertical') || (a === 'vertical' && b === 'diagonal')) {
      return 'horizontal';
    }

    return a; // fallback
  };

  // 依次叠加所有方向
  let result = directions[0];
  for (let i = 1; i < directions.length; i++) {
    result = combineTwo(result, directions[i]);
  }
  
  return result;
}

/** 处理移动 */
export function applyMovement(
  characterId: CharacterId,
  currentLocation: LocationType,
  direction: 'horizontal' | 'vertical' | 'diagonal',
  forbiddenLocation: LocationType | null
): LocationType {
  const locationGrid: Record<LocationType, { x: number; y: number }> = {
    hospital: { x: 0, y: 0 },
    shrine: { x: 1, y: 0 },
    city: { x: 0, y: 1 },
    school: { x: 1, y: 1 },
  };

  const reverseGrid: Record<string, LocationType> = {
    '0,0': 'hospital',
    '1,0': 'shrine',
    '0,1': 'city',
    '1,1': 'school',
  };

  const current = locationGrid[currentLocation];
  let newX = current.x;
  let newY = current.y;

  // 根据方向计算新位置
  if (direction === 'horizontal') {
    newX = 1 - current.x;
  } else if (direction === 'vertical') {
    newY = 1 - current.y;
  } else if (direction === 'diagonal') {
    newX = 1 - current.x;
    newY = 1 - current.y;
  }

  const newLocation = reverseGrid[`${newX},${newY}`];

  // 检查禁行区域
  if (newLocation === forbiddenLocation) {
    return currentLocation;
  }

  return newLocation;
}

/** 应用指示物变化 */
export function applyIndicatorChange(
  indicators: Indicators,
  type: 'goodwill' | 'anxiety' | 'intrigue',
  value: number
): Indicators {
  return {
    ...indicators,
    [type]: Math.max(0, indicators[type] + value),
  };
}

/** 处理事件触发 */
export function handleIncident(state: GameState): GameState {
  const incident = checkIncidents(state);
  if (!incident) {
    return state;
  }

  let updatedState = { ...state };

  // 根据事件类型处理
  if (incident.type === 'murder') {
    // 谋杀事件：当事人死亡
    const updatedCharacters = state.characters.map((char) => {
      if (char.id === incident.actorId) {
        return { ...char, alive: false };
      }
      return char;
    });
    updatedState.characters = updatedCharacters;
    updatedState.phase = 'loop_end';
    updatedState.cardsPlayedToday = 0;
  } else if (incident.type === 'hospital_incident') {
    // 医院事故：检查医院密谋指示物
    const hasIntrigue = state.boardIntrigue.hospital > 0;
    if (hasIntrigue) {
      // 触发谋杀事件：当事人死亡
      const updatedCharacters = state.characters.map((char) => {
        if (char.id === incident.actorId) {
          return { ...char, alive: false };
        }
        return char;
      });
      updatedState.characters = updatedCharacters;
      updatedState.phase = 'loop_end';
      updatedState.cardsPlayedToday = 0;
    } else {
      // 声明事件发生但无现象（无可见效果）
      return state;
    }
  }

  return updatedState;
}

/** 检查关键人物是否死亡 */
export function checkKeyPersonDeath(state: GameState): boolean {
  if (!state.privateInfo) {
    return false;
  }

  const keyPersonRole = state.privateInfo.roles.find((r) => r.role === 'key_person');
  if (!keyPersonRole) {
    return false;
  }

  const keyPerson = state.characters.find((c) => c.id === keyPersonRole.characterId);
  return keyPerson ? !keyPerson.alive : false;
}

/** 检查是否满足谋杀计划失败条件 */
export function checkMurderPlanFailure(state: GameState): boolean {
  if (!state.privateInfo || state.privateInfo.ruleY !== 'murder_plan') {
    return false;
  }

  // 检查是否有谋杀事件触发
  const murderIncident = checkIncidents(state);
  return murderIncident !== null && murderIncident.type === 'murder';
}

/** 重置轮回 */
export function resetLoop(state: GameState): GameState {
  const resetCharacters = state.publicInfo.characters.map(initializeCharacterState);

  return {
    ...state,
    currentLoop: state.currentLoop + 1,
    currentDay: 1,
    characters: resetCharacters,
    boardIntrigue: {
      hospital: 0,
      shrine: 0,
      city: 0,
      school: 0,
    },
    phase: 'loop_start',
    cardsPlayedToday: 0,
  };
}

/** 进入下一天 */
export function advanceDay(state: GameState): GameState {
  return {
    ...state,
    currentDay: state.currentDay + 1,
    phase: 'dawn',
  };
}

/** 
 * 处理结算阶段
 * 1. 处理移动
 * 2. 处理指示物
 * 3. 检查事件（仅关键人物死亡）
 */
export function processResolution(
  state: GameState,
  mastermindCards: PlayedCard[],
  protagonistCards: PlayedCard[]
): GameState {
  let updatedState = { ...state };
  const allCards = [...mastermindCards, ...protagonistCards];

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

  // 1. 处理移动牌
  const movementCards = allCards.filter(pc => pc.card.type === 'movement');
  const movementsByCharacter = new Map<CharacterId, PlayedCard[]>();
  
  movementCards.forEach(pc => {
    if (!pc.targetCharacterId || !pc.card.movementType) return;
    if (pc.card.movementType === 'forbid') return;
    
    const charId = pc.targetCharacterId;
    if (!movementsByCharacter.has(charId)) {
      movementsByCharacter.set(charId, []);
    }
    movementsByCharacter.get(charId)!.push(pc);
  });
  
  movementsByCharacter.forEach((cards, charId) => {
    const isForbidden = allCards.some(other => 
      other.card.type === 'movement' &&
      other.card.movementType === 'forbid' &&
      other.targetCharacterId === charId
    );
    
    if (isForbidden) return;
    
    const directions = cards.map(pc => pc.card.movementType as 'horizontal' | 'vertical' | 'diagonal');
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

  // 2. 处理指示物牌
  const indicatorCards = allCards.filter(pc => 
    pc.card.type === 'goodwill' || pc.card.type === 'anxiety' || pc.card.type === 'intrigue'
  );
  
  indicatorCards.forEach(pc => {
    if (pc.card.isForbid) return;
    
    const isForbidden = hasForbidCard(
      pc.targetCharacterId,
      pc.targetLocation,
      pc.card.type,
      pc.card.owner
    );
    
    if (isForbidden) return;

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
    
    if (pc.targetLocation && !pc.targetCharacterId && pc.card.type === 'intrigue' && pc.card.value) {
      const loc = pc.targetLocation;
      updatedState.boardIntrigue = {
        ...updatedState.boardIntrigue,
        [loc]: (updatedState.boardIntrigue[loc] || 0) + pc.card.value,
      };
    }
  });

  return updatedState;
}

/** 检查游戏是否结束 */
export function isGameOver(state: GameState): {
  isOver: boolean;
  winner: 'mastermind' | 'protagonist' | null;
  reason: string;
} {
  // 检查是否超过轮回次数
  if (state.currentLoop > state.publicInfo.loops) {
    return {
      isOver: true,
      winner: 'protagonist',
      reason: '主人公成功避免了所有惨剧！',
    };
  }

  // 检查关键人物是否死亡
  if (checkKeyPersonDeath(state)) {
    return {
      isOver: true,
      winner: 'mastermind',
      reason: '关键人物死亡，轮回立即结束！',
    };
  }

  // 检查是否触发谋杀计划失败条件
  if (checkMurderPlanFailure(state)) {
    // 如果在最后一个轮回，主人公失败
    if (state.currentLoop === state.publicInfo.loops) {
      return {
        isOver: true,
        winner: 'mastermind',
        reason: '谋杀事件发生，剧作家获胜！',
      };
    }
  }

  return {
    isOver: false,
    winner: null,
    reason: '',
  };
}

/**
 * 执行黎明阶段
 * 所有亲友角色自动获得1点友好
 */
export function processDawnPhase(state: GameState): GameState {
  if (!state.privateInfo) {
    return state; // 主人公视角无法执行（不知道谁是亲友）
  }

  const friendRoles = state.privateInfo.roles.filter(r => r.role === 'friend');
  
  const updatedCharacters = state.characters.map(char => {
    const isFriend = friendRoles.some(r => r.characterId === char.id);
    if (isFriend) {
      return {
        ...char,
        indicators: {
          ...char.indicators,
          goodwill: char.indicators.goodwill + 1,
        },
      };
    }
    return char;
  });

  return {
    ...state,
    characters: updatedCharacters,
  };
}

/**
 * 检查角色是否满足能力使用条件
 */
export function canUseAbility(
  characterState: CharacterState,
  abilityIndex: number,
  characters: Character[]
): boolean {
  // 角色必须存活
  if (!characterState.alive) {
    return false;
  }

  // 获取角色定义
  const charDef = characters.find(c => c.id === characterState.id);
  if (!charDef || abilityIndex >= charDef.abilities.length) {
    return false;
  }

  const ability = charDef.abilities[abilityIndex];
  
  // 检查友好度是否足够
  if (characterState.indicators.goodwill < ability.goodwillRequired) {
    return false;
  }

  // 检查是否已达到每轮使用上限
  if (ability.maxUsesPerLoop !== null) {
    const usageCount = characterState.abilityUsesThisLoop[abilityIndex] || 0;
    if (usageCount >= ability.maxUsesPerLoop) {
      return false;
    }
  }

  return true;
}

/**
 * 使用角色能力（占位函数，需要根据具体能力实现）
 */
export function useCharacterAbility(
  state: GameState,
  characterId: CharacterId,
  abilityIndex: number,
  targetId?: CharacterId
): GameState {
  // TODO: 根据具体能力实现不同效果
  // 这里先返回原状态，后续扩展
  
  const updatedCharacters = state.characters.map(char => {
    if (char.id === characterId) {
      const newUsageCount = (char.abilityUsesThisLoop[abilityIndex] || 0) + 1;
      return {
        ...char,
        abilityUsesThisLoop: {
          ...char.abilityUsesThisLoop,
          [abilityIndex]: newUsageCount,
        },
      };
    }
    return char;
  });

  return {
    ...state,
    characters: updatedCharacters,
  };
}
