// FS-01 初学者剧本数据定义
import type {
  Character,
  CharacterId,
  ScriptConfig,
  PrivateInfo,
  PublicInfo,
  LocationType,
  IncidentType,
} from '@/types/game';

/** 
 * 所有可用角色定义
 * 数据来源：doc/角色技能表整理（2023 年 10 月 1 日）.md
 */
export const ALL_CHARACTERS: Record<CharacterId, Character> = {
  // ========== 第1行角色 ==========
  boy_student: {
    id: 'boy_student',
    name: '男学生',
    anxietyLimit: 2,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student', 'boy'],
    abilities: [{
      goodwillRequired: 2,
      maxUsesPerLoop: null,
      description: '友好能力',
      effect: '将位于同区域的除自身以外的一名学生上的一个不安标记消除',
    }],
  },
  girl_student: {
    id: 'girl_student',
    name: '女学生',
    anxietyLimit: 3,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student', 'girl'],
    abilities: [{
      goodwillRequired: 2,
      maxUsesPerLoop: null,
      description: '友好能力',
      effect: '将位于同区域的除自身以外的一名学生上的一个不安标记消除',
    }],
  },
  rich_man: {
    id: 'rich_man',
    name: '大小姐',
    anxietyLimit: 1,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student', 'girl'],
    abilities: [{
      goodwillRequired: 3,
      maxUsesPerLoop: null,
      description: '友好能力',
      effect: '不在学校或都市的话就无法使用，在同一区域的一个角色上放置一个友好标记',
    }],
  },
  shrine_maiden: {
    id: 'shrine_maiden',
    name: '巫女',
    anxietyLimit: 2,
    initialLocation: 'shrine',
    forbiddenLocation: null,
    traits: ['student', 'girl'],
    abilities: [{
      goodwillRequired: 2,
      maxUsesPerLoop: 1,
      description: '友好能力',
      effect: '不在神社的话就无法使用，移除一个位于神社的阴谋标记；公开位于同一区域的一名角色的身份',
    }],
  },
  detective: {
    id: 'detective',
    name: '刑警',
    anxietyLimit: 3,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: [],
    abilities: [{
      goodwillRequired: 4,
      maxUsesPerLoop: 1,
      description: '友好能力',
      effect: '公开这个轮回发生的一个事件的私人信息；在同一区域的其中一个角色上放置一枚守护标记，放置守护标记的角色即将死亡的情况下，会改为移除守护标记来阻止死亡发生',
    }],
  },
  office_worker: {
    id: 'office_worker',
    name: '上班族',
    anxietyLimit: 2,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: [],
    abilities: [{
      goodwillRequired: 2,
      maxUsesPerLoop: null,
      description: '友好能力',
      effect: '公开这个角色的身份',
    }],
  },
  informer: {
    id: 'informer',
    name: '情报贩子',
    anxietyLimit: 3,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: ['girl'],
    abilities: [{
      goodwillRequired: 5,
      maxUsesPerLoop: 1,
      description: '友好能力',
      effect: '宣言一个支线的名称，触发者需要从所使用的支线中，公开并非所宣言的支线的一个支线',
    }],
  },
  doctor: {
    id: 'doctor',
    name: '医生',
    anxietyLimit: 2,
    initialLocation: 'hospital',
    forbiddenLocation: null,
    traits: [],
    abilities: [{
      goodwillRequired: 2,
      maxUsesPerLoop: null,
      description: '友好能力',
      effect: '可以消除同一区域内一名角色的一个不安标记，也可以在医院区域使用来消除所有角色的一个不安标记',
    }],
  },

  // ========== 第2行角色 ==========
  dollmaker: {
    id: 'dollmaker',
    name: '人偶师',
    anxietyLimit: 3,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: ['girl'],
    abilities: [{
      goodwillRequired: 3,
      maxUsesPerLoop: 2,
      description: '友好能力',
      effect: '召唤1个人偶（无自主行动能力），人偶可替自身承受1次不安标记或死亡效果；人偶被破坏后，本回合无法再次召唤',
    }],
  },
  class_rep: {
    id: 'class_rep',
    name: '班长',
    anxietyLimit: 2,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student'],
    abilities: [{
      goodwillRequired: 2,
      maxUsesPerLoop: 1,
      description: '友好能力',
      effect: '在学校区域可强制让同区域1名角色跟随自身移动；可查看同班级所有学生的不安标记数量',
    }],
  },
  mystery_boy: {
    id: 'mystery_boy',
    name: '异世界人',
    anxietyLimit: 3,
    initialLocation: 'shrine',
    forbiddenLocation: 'hospital',
    traits: [],
    abilities: [{
      goodwillRequired: 4,
      maxUsesPerLoop: 1,
      description: '友好能力',
      effect: '无视区域限制，随机替换自身与一名角色的位置；可免疫1次阴谋标记的负面效果',
    }],
  },
  shrine_god: {
    id: 'shrine_god',
    name: '神格',
    anxietyLimit: 99, // 无上限
    initialLocation: 'shrine',
    forbiddenLocation: null,
    traits: [],
    abilities: [{
      goodwillRequired: 6,
      maxUsesPerLoop: 2,
      description: '友好能力',
      effect: '移除全场1个阴谋标记或为任意1名角色添加1个友好标记；自身被攻击时，可反弹1次伤害给攻击者',
    }],
  },
  idol: {
    id: 'idol',
    name: '偶像',
    anxietyLimit: 2,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: ['student', 'girl'],
    abilities: [{
      goodwillRequired: 3,
      maxUsesPerLoop: 1,
      description: '友好能力',
      effect: '为同区域所有角色各消除1个不安标记；可让1名角色强制跟随自身移动1回合',
    }],
  },
  journalist: {
    id: 'journalist',
    name: '媒体记者',
    anxietyLimit: 3,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: [],
    abilities: [{
      goodwillRequired: 3,
      maxUsesPerLoop: 2,
      description: '友好能力',
      effect: '公开任意1名角色的1个特质；可记录1个已发生的事件，后续可随时公开该事件细节',
    }],
  },
  boss: {
    id: 'boss',
    name: '大人物',
    anxietyLimit: 1,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: [],
    abilities: [{
      goodwillRequired: 5,
      maxUsesPerLoop: 1,
      description: '友好能力',
      effect: '指定1名角色获得"庇护"状态（免疫1次不安标记）；可强制终止1个非关键事件的触发',
    }],
  },

  // ========== 第3行角色 ==========
  nurse: {
    id: 'nurse',
    name: '护士',
    anxietyLimit: 2,
    initialLocation: 'hospital',
    forbiddenLocation: null,
    traits: ['girl'],
    abilities: [{
      goodwillRequired: 2,
      maxUsesPerLoop: null,
      description: '友好能力',
      effect: '在医院区域可消除任意1名角色的2个不安标记；非医院区域可消除1个不安标记，同时为自身添加1个不安标记',
    }],
  },
  patient: {
    id: 'patient',
    name: '入院患者',
    anxietyLimit: 2,
    initialLocation: 'hospital',
    forbiddenLocation: null,
    traits: [],
    abilities: [], // 无友好能力
  },
  scientist: {
    id: 'scientist',
    name: '学者',
    anxietyLimit: 2,
    initialLocation: 'hospital',
    forbiddenLocation: null,
    traits: [],
    abilities: [], // 文档不完整，暂无能力
  },

  // ========== 特殊角色 ==========
  factor: {
    id: 'factor',
    name: '意外因素',
    anxietyLimit: 99, // 无上限（不会积累不安）
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: [],
    abilities: [], // 被动能力，每轮强制触发
  },

  // ========== 向后兼容 ==========
  pop_idol: {
    id: 'pop_idol',
    name: '偶像',
    anxietyLimit: 2,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: ['student', 'girl'],
    abilities: [{
      goodwillRequired: 3,
      maxUsesPerLoop: 1,
      description: '友好能力',
      effect: '为同区域所有角色各消除1个不安标记',
    }],
  },
  transfer_student: {
    id: 'transfer_student',
    name: '转学生',
    anxietyLimit: 2,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student'],
    abilities: [],
  },
  time_traveler: {
    id: 'time_traveler',
    name: '时间旅行者',
    anxietyLimit: 3,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: [],
    abilities: [],
  },
  soldier: {
    id: 'soldier',
    name: '军人',
    anxietyLimit: 4,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: [],
    abilities: [],
  },
  illusion: {
    id: 'illusion',
    name: '幻影',
    anxietyLimit: 1,
    initialLocation: 'shrine',
    forbiddenLocation: null,
    traits: [],
    abilities: [],
  },
  ai: {
    id: 'ai',
    name: 'AI',
    anxietyLimit: 99,
    initialLocation: 'hospital',
    forbiddenLocation: null,
    traits: [],
    abilities: [],
  },
  twin: {
    id: 'twin',
    name: '双子',
    anxietyLimit: 2,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student'],
    abilities: [],
  },
  henchman: {
    id: 'henchman',
    name: '手下',
    anxietyLimit: 3,
    initialLocation: 'city',
    forbiddenLocation: null,
    traits: [],
    abilities: [],
  },
  student: {
    id: 'student',
    name: '男学生',
    anxietyLimit: 2,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student', 'boy'],
    abilities: [{
      goodwillRequired: 2,
      maxUsesPerLoop: null,
      description: '友好能力',
      effect: '移除同一区域一名【学生】角色的1点不安',
    }],
  },
  alien: {
    id: 'alien',
    name: '异界人',
    anxietyLimit: 2,
    initialLocation: 'shrine',
    forbiddenLocation: 'hospital',
    traits: ['girl'],
    abilities: [{
      goodwillRequired: 2,
      maxUsesPerLoop: 1,
      description: '友好能力1：检测杀手',
      effect: '检测同一区域是否有【杀手】或【杀人狂】',
    }],
  },
};

/** 初学者剧本角色定义 (向后兼容) */
export const FS01_CHARACTERS = ALL_CHARACTERS;

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

/** 
 * 简化版脚本配置
 * 设计原则：角色固有属性在 ALL_CHARACTERS 定义，脚本只保存出场角色和事件
 */
export interface ScriptTemplate {
  id: string;
  name: string;
  nameEn?: string;
  tragedySet: 'first_steps' | 'basic_tragedy';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  loops: string;         // "2~3" 或 "4"
  days: number;
  mainPlot: string;      // 主线剧情
  subPlot?: string;      // 支线剧情
  characters: CharacterId[];
  incidents: Array<{ day: number; type: IncidentType; }>;
}

/** 可用脚本列表（简化版，仅保存必要信息） */
export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  // ========== First Steps 系列 ==========
  {
    id: 'fs-01',
    name: '初来乍到',
    nameEn: 'First Steps',
    tragedySet: 'first_steps',
    difficulty: 'beginner',
    loops: '2~3',
    days: 4,
    mainPlot: '杀人计划',
    subPlot: '开膛手之影',
    characters: ['boy_student', 'girl_student', 'shrine_maiden', 'detective', 'office_worker', 'doctor'],
    incidents: [
      { day: 2, type: 'murder' },
      { day: 3, type: 'suicide' },
    ],
  },
  {
    id: 'fs-02',
    name: '守护秘密',
    nameEn: 'Keeping Secrets',
    tragedySet: 'first_steps',
    difficulty: 'beginner',
    loops: '3~4',
    days: 5,
    mainPlot: '必须守护之地',
    subPlot: '不安的传闻',
    characters: ['boy_student', 'girl_student', 'shrine_maiden', 'office_worker', 'doctor', 'patient'],
    incidents: [
      { day: 1, type: 'murder' },
      { day: 3, type: 'hospital_incident' },
      { day: 5, type: 'faraway_murder' },
    ],
  },
  // ========== Basic Tragedy X 系列 ==========
  {
    id: 'bt-03',
    name: '少女们的战场',
    nameEn: 'Battlefield of Girls',
    tragedySet: 'basic_tragedy',
    difficulty: 'intermediate',
    loops: '3~4',
    days: 6,
    mainPlot: '和我签订契约吧！',
    subPlot: '恋爱风景 / 潜藏的杀人魔',
    characters: ['girl_student', 'class_rep', 'shrine_maiden', 'detective', 'office_worker', 'informer', 'patient', 'nurse'],
    incidents: [
      { day: 3, type: 'murder' },
      { day: 4, type: 'murder' },
      { day: 6, type: 'suicide' },
    ],
  },
  {
    id: 'bt-04',
    name: '两害相较取其轻',
    nameEn: 'Lesser of Two Evils',
    tragedySet: 'basic_tragedy',
    difficulty: 'intermediate',
    loops: '3~4',
    days: 7,
    mainPlot: '被封印之物',
    subPlot: '潜藏的杀人魔 / 随机因子X',
    characters: ['boy_student', 'rich_man', 'shrine_maiden', 'office_worker', 'informer', 'journalist', 'patient', 'nurse'],
    incidents: [
      { day: 2, type: 'murder' },
      { day: 4, type: 'murder' },
      { day: 5, type: 'murder' },
      { day: 7, type: 'suicide' },
    ],
  },
  {
    id: 'bt-05',
    name: '被隐藏的秘密',
    nameEn: 'Hidden Secrets',
    tragedySet: 'basic_tragedy',
    difficulty: 'intermediate',
    loops: '3~4',
    days: 7,
    mainPlot: '不明巨型定时炸弹X',
    subPlot: '因果之线 / 友情同好会',
    characters: ['boy_student', 'class_rep', 'shrine_maiden', 'mystery_boy', 'office_worker', 'informer', 'journalist', 'patient', 'nurse'],
    incidents: [
      { day: 2, type: 'suicide' },
      { day: 3, type: 'murder' },
      { day: 4, type: 'hospital_incident' },
      { day: 6, type: 'murder' },
      { day: 7, type: 'murder' },
    ],
  },
  {
    id: 'bt-06',
    name: '诸神的未来',
    nameEn: 'Future of the Gods',
    tragedySet: 'basic_tragedy',
    difficulty: 'advanced',
    loops: '4',
    days: 7,
    mainPlot: '改变未来计划',
    subPlot: '潜藏的杀人魔 / 恋爱风景',
    characters: ['boy_student', 'rich_man', 'shrine_maiden', 'shrine_god', 'detective', 'office_worker', 'idol', 'patient', 'nurse'],
    incidents: [
      { day: 2, type: 'suicide' },
      { day: 4, type: 'murder' },
      { day: 5, type: 'murder' },
      { day: 7, type: 'murder' },
    ],
  },
];

/** 
 * 根据脚本模板生成完整的 PublicInfo
 * 主人公可见的公开信息
 */
export function generatePublicInfo(template: ScriptTemplate): PublicInfo {
  const loopsNum = template.loops.includes('~') 
    ? parseInt(template.loops.split('~')[1]) 
    : parseInt(template.loops);
  
  return {
    scriptName: `${template.name} (${template.nameEn || template.id})`,
    loops: loopsNum,
    days: template.days,
    characters: template.characters,
    incidentSchedule: template.incidents.map(inc => ({
      day: inc.day,
      type: inc.type,
      description: getIncidentName(inc.type),
    })),
    specialRules: [
      `主线：${template.mainPlot}`,
      ...(template.subPlot ? [`支线：${template.subPlot}`] : []),
    ],
  };
}

/** 事件类型名称映射 */
function getIncidentName(type: IncidentType): string {
  const names: Record<IncidentType, string> = {
    murder: '谋杀案',
    hospital_incident: '医院的事件',
    suicide: '自杀',
    faraway_murder: '远距离杀人',
  };
  return names[type] || type;
}

// ========== 向后兼容：保留原有的 AVAILABLE_SCRIPTS 结构 ==========
export interface ScriptOption {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tragedySet: 'first_steps' | 'basic_tragedy';
  loops: string;
  days: number;
  characters: CharacterId[];
  incidents: Array<{ day: number; type: IncidentType; }>;
  publicInfo: PublicInfo;
  privateInfo: PrivateInfo;
}

/** 从模板生成完整脚本选项（向后兼容） */
export const AVAILABLE_SCRIPTS: ScriptOption[] = SCRIPT_TEMPLATES.map(t => ({
  id: t.id,
  name: t.name,
  nameEn: t.nameEn || t.id,
  description: `${t.tragedySet === 'first_steps' ? 'First Steps' : 'Basic Tragedy'} - ${t.mainPlot}`,
  difficulty: t.difficulty,
  tragedySet: t.tragedySet,
  loops: t.loops,
  days: t.days,
  characters: t.characters,
  incidents: t.incidents,
  publicInfo: generatePublicInfo(t),
  // privateInfo 需要剧作家在开局时配置（角色身份分配等）
  privateInfo: FS01_BEGINNER_PRIVATE, // 临时占位，实际应由剧作家配置
}));

// ===== 保留旧版导出以兼容现有代码 =====
export const FS01_SCRIPT1_PRIVATE = FS01_BEGINNER_PRIVATE;
export const FS01_SCRIPT1_PUBLIC = FS01_BEGINNER_PUBLIC;
