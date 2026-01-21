// FS-01 初学者剧本数据定义
import type {
  Character,
  CharacterId,
  ScriptConfig,
  PrivateInfo,
  PublicInfo,
  LocationType,
} from '@/types/game';

/** 初学者剧本角色定义 */
export const FS01_CHARACTERS: Record<CharacterId, Character> = {
  boy_student: {
    id: 'boy_student',
    name: '男学生',
    anxietyLimit: 2,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student', 'boy'],
    abilities: [
      {
        goodwillRequired: 2,
        maxUsesPerLoop: null,
        description: '友好能力',
        effect: '可以减少其他学生（女学生、巫女、偶像）的不安指示物',
      },
    ],
  },
  girl_student: {
    id: 'girl_student',
    name: '女学生',
    anxietyLimit: 3,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student', 'girl'],
    abilities: [
      {
        goodwillRequired: 2,
        maxUsesPerLoop: null,
        description: '友好能力',
        effect: '可以减少其他学生（男学生、巫女、偶像）的不安指示物，需要避免引发事件时或许用得上',
      },
    ],
  },
  shrine_maiden: {
    id: 'shrine_maiden',
    name: '巫女',
    anxietyLimit: 2,
    initialLocation: 'shrine',
    forbiddenLocation: null,
    traits: ['student', 'girl'],
    abilities: [
      {
        goodwillRequired: 5,
        maxUsesPerLoop: 1,
        description: '友好能力：揭露身份',
        effect: '可以借助神力来直接揭露角色的身份，其效果非常强大。但每轮只有3天，最多到5（+2,+2,+1）很难达成',
      },
    ],
  },
  office_worker: {
    id: 'office_worker',
    name: '职员',
    anxietyLimit: 2,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: [],
    abilities: [
      {
        goodwillRequired: 3,
        maxUsesPerLoop: 1,
        description: '友好能力：告知身份',
        effect: '随后说出自己的身份，触发条件较为轻松，基本都能接得有效讯息',
      },
    ],
  },
  idol: {
    id: 'idol',
    name: '偶像',
    anxietyLimit: 2,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: ['student', 'girl'],
    abilities: [
      {
        goodwillRequired: 3,
        maxUsesPerLoop: null,
        description: '友好能力：移除不安',
        effect: '可以移除别人的不安指示物',
      },
      {
        goodwillRequired: 4,
        maxUsesPerLoop: null,
        description: '友好能力：放置友好',
        effect: '可以让别人身上放置友好指示物',
      },
    ],
  },
  doctor: {
    id: 'doctor',
    name: '医生',
    anxietyLimit: 2,
    initialLocation: 'hospital',
    forbiddenLocation: null,
    traits: [],
    abilities: [
      {
        goodwillRequired: 2,
        maxUsesPerLoop: null,
        description: '友好能力',
        effect: '可以提供信息，但作家可能会通过这个角色传递虚假信息，在确认他值得信赖之前暂且不要放置友好指示物',
      },
    ],
  },
  // 以下为旧角色，保持向后兼容
  student: {
    id: 'student',
    name: '男学生',
    anxietyLimit: 2,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student', 'boy'],
    abilities: [
      {
        goodwillRequired: 2,
        maxUsesPerLoop: null,
        description: '友好能力',
        effect: '移除同一区域一名【学生】角色的1点不安',
      },
    ],
  },
  alien: {
    id: 'alien',
    name: '异界人',
    anxietyLimit: 2,
    initialLocation: 'shrine',
    forbiddenLocation: 'hospital',
    traits: ['girl'],
    abilities: [
      {
        goodwillRequired: 2,
        maxUsesPerLoop: 1,
        description: '友好能力1：检测杀手',
        effect: '检测同一区域是否有【杀手】或【杀人狂】',
      },
      {
        goodwillRequired: 3,
        maxUsesPerLoop: 1,
        description: '友好能力2：移除密谋',
        effect: '移除一名角色的所有密谋指示物',
      },
    ],
  },
};

/** 
 * 初学者剧本 - 私有信息表 (仅剧作家可见)
 * 
 * 根据图片配置:
 * - Rule Y: 谋杀计划
 * - Rule X1: 闘體者的庇影
 * - 角色身份: 男学生=平民, 女学生=关键人物, 巫女=杀人狂, 职员=杀手, 偶像=传谣人, 医生=主谋
 * - 事件: 第3天自杀，当事人为女学生
 */
export const FS01_BEGINNER_PRIVATE: PrivateInfo = {
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  roles: [
    { characterId: 'boy_student', role: 'civilian' },
    { characterId: 'girl_student', role: 'key_person' },
    { characterId: 'shrine_maiden', role: 'serial_killer' },
    { characterId: 'office_worker', role: 'killer' },
    { characterId: 'idol', role: 'conspiracy_theorist' },
    { characterId: 'doctor', role: 'brain' },
  ],
  incidents: [
    {
      id: 'day3_suicide',
      day: 3,
      actorId: 'girl_student',
      type: 'suicide',
      description: '自杀',
    },
  ],
};

/** 
 * 初学者剧本 - 公开信息表 (对所有玩家可见)
 * 
 * 主人公只知道:
 * - 剧本名称
 * - 轮回次数和每轮天数
 * - 哪一天有什么类型的事件（但不知道当事人是谁）
 * - 登场角色列表（但不知道身份）
 */
export const FS01_BEGINNER_PUBLIC: PublicInfo = {
  scriptName: '初学者剧本 (First Steps)',
  loops: 4,
  days: 3,
  characters: ['boy_student', 'girl_student', 'shrine_maiden', 'office_worker', 'idol', 'doctor'],
  incidentSchedule: [
    {
      day: 3,
      type: 'suicide',
      description: '自杀',
    },
  ],
  specialRules: [
    '这是新手模组（First Steps），主人公不能通过推理身份获胜',
    '主线：谋杀计划（Rule Y）',
    '支线：闘體者的庇影（Rule X）',
  ],
};

/** 初学者剧本完整配置 */
export const FS01_BEGINNER_SCRIPT: ScriptConfig = {
  id: 'fs-01-beginner',
  name: '初学者剧本 (First Steps)',
  loops: 4,
  days: 3,
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  characters: ['boy_student', 'girl_student', 'shrine_maiden', 'office_worker', 'idol', 'doctor'],
  incidents: FS01_BEGINNER_PRIVATE.incidents,
};

/** 所有可选剧本列表 */
export interface ScriptOption {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  publicInfo: PublicInfo;
  privateInfo: PrivateInfo;
}

export const AVAILABLE_SCRIPTS: ScriptOption[] = [
  {
    id: 'fs-01-beginner',
    name: '初学者剧本',
    description: 'First Steps 入门剧本，适合新手学习游戏机制',
    difficulty: 'beginner',
    publicInfo: FS01_BEGINNER_PUBLIC,
    privateInfo: FS01_BEGINNER_PRIVATE,
  },
];

// ===== 保留旧版导出以兼容现有代码 =====
export const FS01_SCRIPT1_PRIVATE = FS01_BEGINNER_PRIVATE;
export const FS01_SCRIPT1_PUBLIC = FS01_BEGINNER_PUBLIC;
