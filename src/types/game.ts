// 惨剧轮回 - 核心类型定义

/** 位置类型 */
export type LocationType = 'hospital' | 'shrine' | 'city' | 'school';

/** 位置名称映射 */
export const LOCATION_NAMES: Record<LocationType, string> = {
  hospital: '医院',
  shrine: '神社',
  city: '都市',
  school: '学校',
};

/** 行动牌类型 */
export type ActionCardType = 'movement' | 'goodwill' | 'anxiety' | 'intrigue';

/** 移动方向 */
export type MovementType = 'horizontal' | 'vertical' | 'diagonal' | 'forbid';

/** 角色ID */
export type CharacterId = 'student' | 'shrine_maiden' | 'doctor' | 'alien';

/** 角色名称映射 */
export const CHARACTER_NAMES: Record<CharacterId, string> = {
  student: '学生',
  shrine_maiden: '巫女',
  doctor: '医生',
  alien: '异界人',
};

/** 身份类型 */
export type RoleType = 
  | 'killer' 
  | 'serial_killer' 
  | 'brain' 
  | 'conspiracy_theorist' 
  | 'cultist'
  | 'friend'
  | 'key_person'
  | 'civilian';

/** 身份名称映射 */
export const ROLE_NAMES: Record<RoleType, string> = {
  killer: '杀手',
  serial_killer: '杀人狂',
  brain: '主谋',
  conspiracy_theorist: '传谣人',
  cultist: '邪教徒',
  friend: '亲友',
  key_person: '关键人物',
  civilian: '平民',
};

/** 事件类型 */
export type IncidentType = 'murder' | 'hospital_incident' | 'suicide' | 'faraway_murder';

/** 指示物 */
export interface Indicators {
  goodwill: number;
  anxiety: number;
  intrigue: number;
}

/** 角色特性 */
export type CharacterTrait = 'student' | 'girl' | 'boy';

/** 角色能力 */
export interface CharacterAbility {
  /** 友好要求 */
  goodwillRequired: number;
  /** 每轮回限用次数 (null = 无限) */
  maxUsesPerLoop: number | null;
  /** 能力描述 */
  description: string;
  /** 能力效果 */
  effect: string;
}

/** 角色定义 */
export interface Character {
  id: CharacterId;
  name: string;
  anxietyLimit: number;
  initialLocation: LocationType;
  forbiddenLocation: LocationType | null;
  traits: CharacterTrait[];
  abilities: CharacterAbility[];
}

/** 角色状态 */
export interface CharacterState {
  id: CharacterId;
  location: LocationType;
  indicators: Indicators;
  alive: boolean;
  /** 本轮回已使用的能力次数 */
  abilityUsesThisLoop: Record<number, number>;
  /** 打在该角色上的行动牌（每个角色最多1张） */
  placedCard?: PlayedCard;
}

/** 身份配置 */
export interface RoleAssignment {
  characterId: CharacterId;
  role: RoleType;
}

/** 事件定义 */
export interface Incident {
  id: string;
  type: IncidentType;
  day: number;
  actorId: CharacterId;
  description: string;
}

/** 行动牌 */
export interface ActionCard {
  id: string;
  type: ActionCardType;
  owner: 'mastermind' | 'protagonist';
  /** 移动类型（仅当 type === 'movement'） */
  movementType?: MovementType;
  /** 指示物变化值 */
  value?: number;
  /** 每轮限用（部分卡牌） */
  oncePerLoop?: boolean;
}

/** 规则Y（主线） */
export type RuleY = 'murder_plan' | 'light_of_avenger' | 'change_of_future';

/** 规则X（支线） */
export type RuleX = 'circle_of_friends' | 'a_secret_affair' | 'paranoia_virus';

/** 剧本配置 */
export interface ScriptConfig {
  id: string;
  name: string;
  loops: number;
  days: number;
  ruleY: RuleY;
  ruleX: RuleX;
  characters: CharacterId[];
  incidents: Incident[];
}

/** 私有信息（仅剧作家可见） */
export interface PrivateInfo {
  roles: RoleAssignment[];
  incidents: Incident[];
  ruleY: RuleY;
  ruleX: RuleX;
}

/** 公开信息 */
export interface PublicInfo {
  scriptName: string;
  loops: number;
  days: number;
  characters: CharacterId[];
  incidentSchedule: Array<{
    day: number;
    type: IncidentType;
    description: string;
  }>;
  specialRules: string[];
}

/** 游戏状态 */
export interface GameState {
  /** 当前轮回 */
  currentLoop: number;
  /** 当前天数 */
  currentDay: number;
  /** 角色状态 */
  characters: CharacterState[];
  /** 版图密谋指示物 */
  boardIntrigue: Record<LocationType, number>;
  /** 私有信息（仅剧作家） */
  privateInfo: PrivateInfo | null;
  /** 公开信息 */
  publicInfo: PublicInfo;
  /** 游戏阶段 */
  phase: GamePhase;
  /** 今日已打出卡片数（每轮最多3张） */
  cardsPlayedToday: number;
}

/** 游戏阶段 */
export type GamePhase = 
  | 'loop_start'
  | 'day_start'
  | 'mastermind_action'
  | 'protagonist_action'
  | 'resolution'
  | 'mastermind_ability'
  | 'protagonist_ability'
  | 'incident_check'
  | 'day_end'
  | 'loop_end'
  | 'game_end';

/** 玩家角色 */
export type PlayerRole = 'mastermind' | 'protagonist';

/** 行动牌打出记录 */
export interface PlayedCard {
  card: ActionCard;
  targetCharacterId?: CharacterId;
  targetLocation?: LocationType;
}
