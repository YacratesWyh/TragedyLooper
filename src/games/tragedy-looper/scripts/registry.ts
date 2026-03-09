// 脚本注册表 - 所有可用脚本的元数据与工具函数
import type { CharacterId, PublicInfo, PrivateInfo, IncidentType } from '@/games/tragedy-looper/types';
import { FS01_BEGINNER_PRIVATE } from './fs-01';

export interface ScriptTemplate {
  id: string;
  name: string;
  nameEn?: string;
  tragedySet: 'first_steps' | 'basic_tragedy';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  loops: string;
  days: number;
  mainPlot: string;
  subPlot?: string;
  characters: CharacterId[];
  incidents: Array<{ day: number; type: IncidentType }>;
  specialRules?: string[];
}

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
      { day: 1, type: 'anxiety_spread' },
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
    characters: ['boy_student', 'girl_student', 'class_rep', 'shrine_maiden', 'detective', 'office_worker', 'informer', 'patient', 'nurse'],
    incidents: [
      { day: 3, type: 'foul_play' },
      { day: 4, type: 'anxiety_spread' },
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
    characters: ['boy_student', 'girl_student', 'rich_man', 'shrine_maiden', 'office_worker', 'informer', 'journalist', 'patient', 'nurse'],
    incidents: [
      { day: 2, type: 'anxiety_spread' },
      { day: 4, type: 'missing_person' },
      { day: 5, type: 'missing_person' },
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
    characters: ['rich_man', 'class_rep', 'shrine_maiden', 'alien', 'office_worker', 'informer', 'idol', 'journalist', 'patient'],
    incidents: [
      { day: 2, type: 'suicide' },
      { day: 3, type: 'missing_person' },
      { day: 4, type: 'hospital_incident' },
      { day: 6, type: 'gossip' },
      { day: 7, type: 'foul_play' },
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
    characters: ['boy_student', 'rich_man', 'shrine_maiden', 'godly_being', 'detective', 'office_worker', 'idol', 'patient', 'nurse'],
    incidents: [
      { day: 2, type: 'suicide' },
      { day: 4, type: 'anxiety_spread' },
      { day: 5, type: 'butterfly_effect' },
      { day: 7, type: 'foul_play' },
    ],
  },
  {
    id: 'bt-07',
    name: '镜子密码',
    nameEn: 'Mirror Code',
    tragedySet: 'basic_tragedy',
    difficulty: 'intermediate',
    loops: '3~4',
    days: 7,
    mainPlot: '和我签订契约吧！',
    subPlot: '随机因子X / 病毒式妄想传播',
    characters: ['boy_student', 'girl_student', 'rich_man', 'factor', 'office_worker', 'informer', 'journalist', 'patient', 'nurse'],
    incidents: [
      { day: 3, type: 'missing_person' },
      { day: 4, type: 'anxiety_spread' },
      { day: 5, type: 'hospital_incident' },
      { day: 7, type: 'murder' },
    ],
  },
  {
    id: 'bt-08',
    name: '抗体携带者',
    nameEn: 'Antibody Carrier',
    tragedySet: 'basic_tragedy',
    difficulty: 'advanced',
    loops: '4~5',
    days: 4,
    mainPlot: '改变未来计划',
    subPlot: '因果之线 / 病毒式妄想传播',
    characters: ['girl_student', 'rich_man', 'class_rep', 'shrine_maiden', 'detective', 'office_worker', 'informer', 'doctor', 'patient', 'henchman'],
    incidents: [
      { day: 1, type: 'butterfly_effect' },
      { day: 2, type: 'foul_play' },
      { day: 3, type: 'gossip' },
      { day: 4, type: 'missing_person' },
    ],
  },
  {
    id: 'bt-09',
    name: '序章',
    nameEn: 'Prologue',
    tragedySet: 'basic_tragedy',
    difficulty: 'advanced',
    loops: '4~5',
    days: 7,
    mainPlot: '杀人计划',
    subPlot: '友情同好会 / 恋爱风景',
    characters: ['boy_student', 'girl_student', 'rich_man', 'shrine_maiden', 'detective', 'office_worker', 'informer', 'doctor', 'patient'],
    incidents: [
      { day: 2, type: 'anxiety_spread' },
      { day: 3, type: 'suicide' },
      { day: 5, type: 'hospital_incident' },
      { day: 7, type: 'murder' },
    ],
  },
  {
    id: 'bt-10',
    name: '无尽的快乐和悲伤故事',
    nameEn: 'Endless Stories of Joy and Sorrow',
    tragedySet: 'basic_tragedy',
    difficulty: 'advanced',
    loops: '4',
    days: 6,
    mainPlot: '不明巨型定时炸弹X',
    subPlot: '不安的传闻 / 恋爱风景',
    characters: ['girl_student', 'rich_man', 'class_rep', 'factor', 'alien', 'godly_being', 'office_worker', 'idol', 'boss', 'patient', 'nurse'],
    incidents: [
      { day: 2, type: 'butterfly_effect' },
      { day: 3, type: 'anxiety_spread' },
      { day: 4, type: 'missing_person' },
      { day: 5, type: 'butterfly_effect' },
      { day: 6, type: 'missing_person' },
    ],
    specialRules: ['脚本家禁用友好禁止'],
  },
];

function getIncidentName(type: IncidentType): string {
  const names: Record<IncidentType, string> = {
    murder: '谋杀案',
    suicide: '自杀',
    hospital_incident: '医院的事件',
    faraway_murder: '远距离杀人',
    anxiety_spread: '不安扩散',
    foul_play: '邪气污染',
    missing_person: '行踪不明',
    butterfly_effect: '蝴蝶效应',
    gossip: '流传',
  };
  return names[type];
}

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
      ...(template.specialRules ?? []),
    ],
  };
}

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
  incidents: Array<{ day: number; type: IncidentType }>;
  publicInfo: PublicInfo;
  privateInfo: PrivateInfo;
}

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
  privateInfo: FS01_BEGINNER_PRIVATE,
}));
