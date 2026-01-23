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

/** 
 * 角色ID
 * 数据来源：characters-grid.png 切割顺序（8列4行，最后一格为空）
 */
export type CharacterId = 
  // 第1行（索引0-7）：男学生、女学生、大小姐、巫女、刑警、上班族、情报贩子、医生
  | 'boy_student'      // 0 - 男学生
  | 'girl_student'     // 1 - 女学生
  | 'rich_man'         // 2 - 大小姐
  | 'shrine_maiden'    // 3 - 巫女
  | 'detective'        // 4 - 刑警
  | 'office_worker'    // 5 - 上班族
  | 'informer'         // 6 - 情报贩子
  | 'doctor'           // 7 - 医生
  // 第2行（索引8-15）：入院患者、班长、意外因素、异世界人、神格、偶像、媒体记者、大人物
  | 'patient'          // 8 - 入院患者
  | 'class_rep'        // 9 - 班长
  | 'factor'           // 10 - 意外因素
  | 'alien'            // 11 - 异世界人
  | 'godly_being'      // 12 - 神格
  | 'idol'             // 13 - 偶像
  | 'journalist'       // 14 - 媒体记者
  | 'boss'             // 15 - 大人物
  // 第3行（索引16-23）：护士、手下、学者、幻想、刑侦警察、A.I.、教师、转校生
  | 'nurse'            // 16 - 护士
  | 'henchman'         // 17 - 手下
  | 'scientist'        // 18 - 学者
  | 'illusion'         // 19 - 幻想
  | 'forensic'         // 20 - 刑侦警察
  | 'ai'               // 21 - A.I.
  | 'teacher'          // 22 - 教师
  | 'transfer_student' // 23 - 转校生
  // 第4行（索引24-30）：军人、黑猫、小女孩、教祖、模仿者、御神木、妹妹（最后一格为空）
  | 'soldier'          // 24 - 军人
  | 'black_cat'        // 25 - 黑猫
  | 'girl'             // 26 - 小女孩
  | 'cult_leader'      // 27 - 教祖
  | 'copycat'          // 28 - 模仿者
  | 'sacred_tree'      // 29 - 御神木
  | 'little_sister';   // 30 - 妹妹

/** 角色名称映射 */
export const CHARACTER_NAMES: Record<CharacterId, string> = {
  // 第1行（索引0-7）
  boy_student: '男学生',
  girl_student: '女学生',
  rich_man: '大小姐',
  shrine_maiden: '巫女',
  detective: '刑警',
  office_worker: '上班族',
  informer: '情报贩子',
  doctor: '医生',
  // 第2行（索引8-15）
  patient: '入院患者',
  class_rep: '班长',
  factor: '意外因素',
  alien: '异世界人',
  godly_being: '神格',
  idol: '偶像',
  journalist: '媒体记者',
  boss: '大人物',
  // 第3行（索引16-23）
  nurse: '护士',
  henchman: '手下',
  scientist: '学者',
  illusion: '幻想',
  forensic: '刑侦警察',
  ai: 'A.I.',
  teacher: '教师',
  transfer_student: '转校生',
  // 第4行（索引24-30）
  soldier: '军人',
  black_cat: '黑猫',
  girl: '小女孩',
  cult_leader: '教祖',
  copycat: '模仿者',
  sacred_tree: '御神木',
  little_sister: '妹妹',
};

/** 角色在 characters-grid.png 中的索引（用于切割图片） */
export const CHARACTER_GRID_INDEX: Record<CharacterId, number> = {
  // 第1行
  boy_student: 0,
  girl_student: 1,
  rich_man: 2,
  shrine_maiden: 3,
  detective: 4,
  office_worker: 5,
  informer: 6,
  doctor: 7,
  // 第2行
  patient: 8,
  class_rep: 9,
  factor: 10,
  alien: 11,
  godly_being: 12,
  idol: 13,
  journalist: 14,
  boss: 15,
  // 第3行
  nurse: 16,
  henchman: 17,
  scientist: 18,
  illusion: 19,
  forensic: 20,
  ai: 21,
  teacher: 22,
  transfer_student: 23,
  // 第4行
  soldier: 24,
  black_cat: 25,
  girl: 26,
  cult_leader: 27,
  copycat: 28,
  sacred_tree: 29,
  little_sister: 30,
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

/** 游戏阶段 */
export type GamePhase = 
  | 'dawn'                 // 黎明阶段：亲友角色自动+1友好
  | 'mastermind_action'    // 剧作家行动阶段：打出最多3张牌
  | 'protagonist_action'   // 主人公行动阶段：打出最多3张牌
  | 'resolution'           // 结算阶段：翻开并结算所有牌
  | 'mastermind_ability'   // 剧作家能力阶段：剧作家可调整token（被动能力等）
  | 'protagonist_ability'  // 主人公能力阶段：主人公可调整token（友好技能）
  | 'incident'             // 事件检查阶段
  | 'night'                // 夜晚阶段：剧作家可调整token（杀手/杀人狂能力）
  | 'loop_end'             // 轮回结束（事件触发导致）
  | 'game_over';           // 游戏结束

/** 游戏阶段名称映射 */
export const PHASE_NAMES: Record<GamePhase, string> = {
  dawn: '黎明阶段',
  mastermind_action: '剧作家行动',
  protagonist_action: '主人公行动',
  resolution: '结算阶段',
  mastermind_ability: '剧作家能力',
  protagonist_ability: '主人公能力',
  incident: '事件检查',
  night: '夜晚阶段',
  loop_end: '轮回结束',
  game_over: '游戏结束',
};

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
  forbiddenLocation: LocationType | LocationType[] | null;
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
  /** 是否为"禁止"牌（抵消对方同类型牌的效果） */
  isForbid?: boolean;
  /** 每轮回限用（用1张少1张，本轮回用完就没了） */
  oncePerLoop?: boolean;
  /** 基础牌ID（用于多副本牌的限制检查，如主人公的3套牌） */
  baseId?: string;
}

/** 玩家的完整牌组 */
export interface PlayerDeck {
  /** 所有卡牌（固定不变） */
  allCards: ActionCard[];
  /** 今天已使用的卡牌ID (Set 方便查找，数组方便同步) */
  usedToday: Set<string> | string[];
  /** 本轮回已使用的"每轮限一次"卡牌ID */
  usedThisLoop: Set<string> | string[];
}

/** 创建剧作家牌组（红色） */
export function createMastermindDeck(): PlayerDeck {
  const cards: ActionCard[] = [
    // 移动牌 (3张)
    { id: 'mm-diag', type: 'movement', owner: 'mastermind', movementType: 'diagonal', oncePerLoop: true },    // 斜向移动*
    { id: 'mm-horiz', type: 'movement', owner: 'mastermind', movementType: 'horizontal' },                     // 横向移动
    { id: 'mm-vert', type: 'movement', owner: 'mastermind', movementType: 'vertical' },                        // 纵向移动
    // 友好牌 (1张)
    { id: 'mm-forbid-goodwill', type: 'goodwill', owner: 'mastermind', isForbid: true },                       // 禁止友好
    // 不安牌 (4张)
    { id: 'mm-anxiety-1a', type: 'anxiety', owner: 'mastermind', value: 1 },                                   // 不安+1
    { id: 'mm-anxiety-1b', type: 'anxiety', owner: 'mastermind', value: 1 },                                   // 不安+1 (第二张)
    { id: 'mm-anxiety-minus', type: 'anxiety', owner: 'mastermind', value: -1 },                                // 不安-1
    { id: 'mm-forbid-anxiety', type: 'anxiety', owner: 'mastermind', isForbid: true },                         // 禁止不安
    // 密谋牌 (2张)
    { id: 'mm-intrigue-1', type: 'intrigue', owner: 'mastermind', value: 1 },                                  // 密谋+1
    { id: 'mm-intrigue-2', type: 'intrigue', owner: 'mastermind', value: 2, oncePerLoop: true },               // 密谋+2*
  ];
  return { allCards: cards, usedToday: new Set(), usedThisLoop: new Set() };
}

/** 创建主人公牌组（蓝色）- 3套牌 + 1张禁止密谋 */
export function createProtagonistDeck(): PlayerDeck {
  // 有3张副本的牌
  const tripleCards: Omit<ActionCard, 'id'>[] = [
    // 移动牌
    { baseId: 'pro-forbid-move', type: 'movement', owner: 'protagonist', movementType: 'forbid', oncePerLoop: true }, // 禁止移动* (3张，轮回限)
    { baseId: 'pro-horiz', type: 'movement', owner: 'protagonist', movementType: 'horizontal' },                      // 横向移动 (3张)
    { baseId: 'pro-vert', type: 'movement', owner: 'protagonist', movementType: 'vertical' },                         // 纵向移动 (3张)
    // 友好牌
    { baseId: 'pro-goodwill-1', type: 'goodwill', owner: 'protagonist', value: 1 },                                   // 友好+1 (3张)
    { baseId: 'pro-goodwill-2', type: 'goodwill', owner: 'protagonist', value: 2, oncePerLoop: true },                // 友好+2* (3张，轮回限)
    // 不安牌
    { baseId: 'pro-anxiety-plus', type: 'anxiety', owner: 'protagonist', value: 1 },                                  // 不安+1 (3张)
    { baseId: 'pro-anxiety-minus', type: 'anxiety', owner: 'protagonist', value: -1, oncePerLoop: true },             // 不安-1* (3张，轮回限)
  ];

  const cards: ActionCard[] = [];
  
  // 创建3套牌
  for (let setNum = 1; setNum <= 3; setNum++) {
    for (const base of tripleCards) {
      cards.push({
        ...base,
        id: `${base.baseId}-${setNum}`, // 如 pro-horiz-1, pro-horiz-2, pro-horiz-3
      });
    }
  }
  
  // 禁止密谋只有1张
  cards.push({
    id: 'pro-forbid-intrigue',
    baseId: 'pro-forbid-intrigue',
    type: 'intrigue',
    owner: 'protagonist',
    isForbid: true,
  });

  return { allCards: cards, usedToday: new Set(), usedThisLoop: new Set() };
}

/** 获取可用的手牌（未使用+未被轮回限制的牌） */
export function getAvailableCards(deck: PlayerDeck): ActionCard[] {
  // 兼容 Set 和 Array（服务器发送的数据会把 Set 转成 Array）
  const isUsedToday = (id: string) => {
    if (deck.usedToday instanceof Set) return deck.usedToday.has(id);
    return Array.isArray(deck.usedToday) && deck.usedToday.includes(id);
  };
  
  const usedThisLoopSet = toSet(deck.usedThisLoop);

  return deck.allCards.filter(card => {
    // 今天已用过 → 不可用
    if (isUsedToday(card.id)) return false;
    // 每轮回限用：检查这张牌是否已使用（用1张少1张）
    if (card.oncePerLoop && usedThisLoopSet.has(card.id)) return false;
    return true;
  });
}

// 辅助函数：将 Set 或 Array 转换为 Set
function toSet(data: Set<string> | string[] | unknown): Set<string> {
  if (data instanceof Set) return data;
  if (Array.isArray(data)) return new Set(data);
  return new Set();
}

/** 标记卡牌已使用 */
export function markCardUsed(deck: PlayerDeck, cardId: string): PlayerDeck {
  const card = deck.allCards.find(c => c.id === cardId);
  const newUsedToday = new Set(toSet(deck.usedToday)).add(cardId);
  // 每轮回限用的牌：记录 card.id（用1张少1张）
  const newUsedThisLoop = card?.oncePerLoop 
    ? new Set(toSet(deck.usedThisLoop)).add(cardId) 
    : new Set(toSet(deck.usedThisLoop));
  return { ...deck, usedToday: newUsedToday, usedThisLoop: newUsedThisLoop };
}

/** 撤回卡牌（取消已使用标记） */
export function unmarkCardUsed(deck: PlayerDeck, cardId: string): PlayerDeck {
  const newUsedToday = new Set(toSet(deck.usedToday));
  newUsedToday.delete(cardId);
  // 注意：oncePerLoop 的牌一旦打出就算用过了，撤回也不能重新用
  // 但如果在同一回合内撤回，应该可以重新放置，所以这里也从 usedThisLoop 移除
  const newUsedThisLoop = new Set(toSet(deck.usedThisLoop));
  newUsedThisLoop.delete(cardId);
  return { ...deck, usedToday: newUsedToday, usedThisLoop: newUsedThisLoop };
}

/** 重置每日使用状态 */
export function resetDailyUsage(deck: PlayerDeck): PlayerDeck {
  return { ...deck, usedToday: new Set() };
}

/** 重置轮回使用状态（新轮回开始） */
export function resetLoopUsage(deck: PlayerDeck): PlayerDeck {
  return { ...deck, usedToday: new Set(), usedThisLoop: new Set() };
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
  /** 阶段开始时的快照（用于复位手动操作） */
  phaseSnapshot?: {
    characters: CharacterState[];
    boardIntrigue: Record<LocationType, number>;
  };
}

/** 玩家角色 */
export type PlayerRole = 'mastermind' | 'protagonist';

/** 行动牌打出记录 */
export interface PlayedCard {
  card: ActionCard;
  targetCharacterId?: CharacterId;
  targetLocation?: LocationType;
}
