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
    phase: 'loop_start',
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
  character: CharacterState,
  type: 'goodwill' | 'anxiety' | 'intrigue',
  value: number
): CharacterState {
  const updatedIndicators = { ...character.indicators };
  updatedIndicators[type] = Math.max(0, updatedIndicators[type] + value);
  return { ...character, indicators: updatedIndicators };
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
    phase: 'day_start',
  };
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
