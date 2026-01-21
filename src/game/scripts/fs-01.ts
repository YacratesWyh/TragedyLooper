// FS-01 剧本数据定义
import type {
  Character,
  CharacterId,
  ScriptConfig,
  PrivateInfo,
  PublicInfo,
} from '@/types/game';

/** FS-01 角色定义 */
export const FS01_CHARACTERS: Record<CharacterId, Character> = {
  student: {
    id: 'student',
    name: '学生',
    anxietyLimit: 2,
    initialLocation: 'school',
    forbiddenLocation: null,
    traits: ['student', 'boy'],
    abilities: [
      {
        goodwillRequired: 2,
        maxUsesPerLoop: null,
        description: '友好能力：移除不安',
        effect: '移除同一区域一名【学生】角色的1点不安',
      },
    ],
  },
  shrine_maiden: {
    id: 'shrine_maiden',
    name: '巫女',
    anxietyLimit: 2,
    initialLocation: 'shrine',
    forbiddenLocation: null,
    traits: ['girl'],
    abilities: [
      {
        goodwillRequired: 2,
        maxUsesPerLoop: 1,
        description: '友好能力：移除密谋',
        effect: '移除一个区域的1点密谋',
      },
    ],
  },
  doctor: {
    id: 'doctor',
    name: '医生',
    anxietyLimit: 3,
    initialLocation: 'hospital',
    forbiddenLocation: null,
    traits: [],
    abilities: [
      {
        goodwillRequired: 2,
        maxUsesPerLoop: null,
        description: '友好能力：移除不安',
        effect: '移除同一区域任意一名角色的1点不安',
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
        description: '友好能力：杀手检测',
        effect: '检测同一区域是否有【杀手】或【杀人狂】',
      },
      {
        goodwillRequired: 3,
        maxUsesPerLoop: 1,
        description: '友好能力：移除密谋',
        effect: '移除一名角色的所有密谋指示物',
      },
    ],
  },
};

/** FS-01 剧本1 - 私有信息表 */
export const FS01_SCRIPT1_PRIVATE: PrivateInfo = {
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  roles: [
    { characterId: 'student', role: 'key_person' },
    { characterId: 'shrine_maiden', role: 'friend' },
    { characterId: 'doctor', role: 'brain' },
    { characterId: 'alien', role: 'killer' },
  ],
  incidents: [
    {
      id: 'day2_incident',
      day: 2,
      actorId: 'alien',
      type: 'murder',
      description: '第2天：谋杀事件',
    },
  ],
};

/** FS-01 剧本1 - 公开信息表 */
export const FS01_SCRIPT1_PUBLIC: PublicInfo = {
  scriptName: 'FS-01 剧本1',
  loops: 4,
  days: 2,
  characters: ['student', 'shrine_maiden', 'doctor', 'alien'],
  incidentSchedule: [
    {
      day: 2,
      type: 'murder',
      description: '第2天：谋杀事件',
    },
  ],
  specialRules: [
    '这是新手模组（First Step），主人公不能通过推理身份获胜',
    '主线：谋杀计划（Rule Y）',
    '支线：隐藏角色（Rule X）',
  ],
};

/** FS-01 剧本1 完整配置 */
export const FS01_SCRIPT1: ScriptConfig = {
  id: 'fs-01-script-1',
  name: 'FS-01 剧本1',
  loops: 4,
  days: 2,
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  characters: ['student', 'shrine_maiden', 'doctor', 'alien'],
  incidents: FS01_SCRIPT1_PRIVATE.incidents,
};

/** FS-01 剧本2 - 私有信息表 */
export const FS01_SCRIPT2_PRIVATE: PrivateInfo = {
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  roles: [
    { characterId: 'student', role: 'key_person' },
    { characterId: 'shrine_maiden', role: 'killer' },
    { characterId: 'doctor', role: 'friend' },
    { characterId: 'alien', role: 'brain' },
  ],
  incidents: [
    {
      id: 'murder_day2',
      type: 'murder',
      day: 2,
      actorId: 'shrine_maiden',
      description: '谋杀事件',
    },
  ],
};

/** FS-01 剧本2 - 公开信息表 */
export const FS01_SCRIPT2_PUBLIC: PublicInfo = {
  scriptName: 'FS-01 剧本2',
  loops: 4,
  days: 2,
  characters: ['student', 'shrine_maiden', 'doctor', 'alien'],
  incidentSchedule: [
    {
      day: 2,
      type: 'murder',
      description: '第2天：谋杀事件',
    },
  ],
  specialRules: [
    '这是新手模组（First Step），主人公不能通过推理身份获胜',
    '主线：谋杀计划（Rule Y）',
    '支线：隐藏角色（Rule X）',
  ],
};

/** FS-01 剧本2 完整配置 */
export const FS01_SCRIPT2: ScriptConfig = {
  id: 'fs-01-script-2',
  name: 'FS-01 剧本2',
  loops: 4,
  days: 2,
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  characters: ['student', 'shrine_maiden', 'doctor', 'alien'],
  incidents: FS01_SCRIPT2_PRIVATE.incidents,
};
