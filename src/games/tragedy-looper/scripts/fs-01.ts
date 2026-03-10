/*
 * @Author: cyanocitta
 * @Date: 2026-03-04 19:24:39
 * @LastEditTime: 2026-03-10 12:40:38
 * @FilePath: \tragedylooper\src\games\tragedy-looper\scripts\fs-01.ts
 * @Description: 
 */
// FS-01 教学关卡 · 初学者剧本数据
import type { ScriptConfig, PrivateInfo, PublicInfo } from '@/games/tragedy-looper/types';

// 剧作家三条胜路：
//   Day1 夜晚 - 巫女（杀人狂）与女学生独处 → 女学生直接死亡
//   Day2 事件 - 男学生不安≥2 触发谋杀案
//   Day3 事件 - 刑警（传谣人）对女学生追加不安 → 女学生不安≥3 触发自杀
export const FS01_BEGINNER_PRIVATE: PrivateInfo = {
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  roles: [
    { characterId: 'boy_student', role: 'civilian' },
    { characterId: 'girl_student', role: 'key_person' },
    { characterId: 'shrine_maiden', role: 'serial_killer' },
    { characterId: 'detective', role: 'conspiracy_theorist' },
    { characterId: 'office_worker', role: 'killer' },
    { characterId: 'doctor', role: 'brain' },
  ],
  incidents: [
    {
      id: 'day2_murder',
      day: 2,
      actorId: 'boy_student',
      type: 'murder',
      description: '谋杀案',
    },
    {
      id: 'day3_suicide',
      day: 3,
      actorId: 'girl_student',
      type: 'suicide',
      description: '自杀',
    },
  ],
};

export const FS01_BEGINNER_PUBLIC: PublicInfo = {
  scriptName: '初学者剧本 (First Steps)',
  tragedySet: 'first_steps',
  loops: 4,
  days: 3,
  characters: ['boy_student', 'girl_student', 'shrine_maiden', 'detective', 'office_worker', 'doctor'],
  incidentSchedule: [
    {
      day: 2,
      type: 'murder',
      description: '谋杀案',
    },
    {
      day: 3,
      type: 'suicide',
      description: '自杀',
    },
  ],
  specialRules: [],
};

export const FS01_BEGINNER_SCRIPT: ScriptConfig = {
  id: 'fs-01-beginner',
  name: '初学者剧本 (First Steps)',
  loops: 4,
  days: 3,
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  characters: ['boy_student', 'girl_student', 'shrine_maiden', 'detective', 'office_worker', 'doctor'],
  incidents: FS01_BEGINNER_PRIVATE.incidents,
};

// ===== 向后兼容别名 =====
export const FS01_SCRIPT1_PRIVATE = FS01_BEGINNER_PRIVATE;
export const FS01_SCRIPT1_PUBLIC = FS01_BEGINNER_PUBLIC;

// ===== 教学局完整配牌剧本 =====
// 初始位置: 男学生(school) 女学生(school) 巫女(shrine) 刑警(city) 上班族(city) 医生(hospital)
// 版图: hospital(0,0) shrine(1,0) / city(0,1) school(1,1)
//   横向=翻X: hospital↔shrine, city↔school
//   纵向=翻Y: hospital↔city, shrine↔school
//   斜向=翻XY: hospital↔school, shrine↔city

import type { TutorialTurn } from '@/games/tragedy-looper/types';

export const FS01_PLAYBOOK: TutorialTurn[] = [
  // ══════════════════════════════════════════════════════════════
  // 轮回 1 — 杀人狂暴毙（教学：夜晚能力 + 杀人狂机制）
  // 目标：巫女与女学生在学校独处，夜晚杀人狂触发
  // ══════════════════════════════════════════════════════════════

  // L1D1 剧作家
  {
    loop: 1, day: 1, role: 'mastermind',
    plays: [
      { cardId: 'mm-vert', targetCharacterId: 'shrine_maiden' },    // 巫女: shrine→school
      { cardId: 'mm-horiz', targetCharacterId: 'boy_student' },    // 男学生: school→city
      { cardId: 'mm-anxiety-1a', targetCharacterId: 'girl_student' }, // 女学生+1不安（为Day3自杀铺路）
    ],
    narration:
      '把巫女移到学校，把男学生移走——让巫女和女学生在学校独处。\n' +
      '给女学生加不安，为后续自杀事件铺路。',
  },
  // L1D1 主人公
  {
    loop: 1, day: 1, role: 'protagonist',
    plays: [
      { cardId: 'pro-goodwill-1-1', targetCharacterId: 'office_worker' }, // 上班族+1友好
      { cardId: 'pro-goodwill-1-2', targetCharacterId: 'shrine_maiden' }, // 巫女+1友好（已被移走）
      { cardId: 'pro-goodwill-2-1', targetCharacterId: 'girl_student' },       // 女学生+2友好
    ],
    narration:
      '第一次行动，先广撒网：给上班族和巫女攒友好。\n' +
      '女学生看起来很重要，直接打友好+2拉满——赌剧作家没有打禁止好感，他毕竟只有一张！'
  },

  // L1 Night: 巫女(school) + 女学生(school) 独处 → 杀人狂触发 → 轮回结束
  // 无需 Day2/Day3 配牌

  // ══════════════════════════════════════════════════════════════
  // 轮回 2 — 杀手路线（教学：密谋积累 + 杀手触发 + 黑幕能力）
  // 目标：上班族密谋≥2 + 女学生同区 → 杀手夜晚杀关键人物
  // D1 主人公把女学生移进都市（规避巫女），恰好和上班族同区
  // D2 剧作家不移女学生，堆密谋；第⑤步医生（黑幕）+1密谋；夜晚杀手触发
  // 重置后位置: 全部回初始位
  // ══════════════════════════════════════════════════════════════

  // L2D1 剧作家
  {
    loop: 2, day: 1, role: 'mastermind',
    plays: [
      { cardId: 'mm-intrigue-1', targetCharacterId: 'office_worker' },  // 上班族+1密谋
      { cardId: 'mm-anxiety-1a', targetCharacterId: 'boy_student' },    // 男学生+1不安（干扰）
      { cardId: 'mm-vert', targetCharacterId: 'shrine_maiden' },        // 巫女: shrine→school（逼主人公交出禁移）
    ],
    narration:
      '本步操作：给上班族放密谋，男学生放不安，巫女执行移动。\n' +
      '本步观察：结算后记录上班族密谋数值和巫女最终位置。',
  },
  // L2D1 主人公
  {
    loop: 2, day: 1, role: 'protagonist',
    plays: [
      { cardId: 'pro-goodwill-1-1', targetCharacterId: 'office_worker' }, // 上班族+1友好
      { cardId: 'pro-forbid-move-1', targetCharacterId: 'shrine_maiden' }, // 禁止巫女移动
      { cardId: 'pro-horiz-1', targetCharacterId: 'girl_student' },         // 女学生横向移动（school→city）
    ],
    narration:
      '本步操作：对巫女放禁止移动，上班族加好感，并让女学生横向移动，注意到巫女无法去都市。\n' +
      '本步观察：结算后记录女学生与上班族是否进入同区风险关系。',
  },

  // L2D2 剧作家
  {
    loop: 2, day: 2, role: 'mastermind',
    plays: [
      { cardId: 'mm-intrigue-2', targetCharacterId: 'office_worker' },  // 上班族+2密谋（累计3）
      { cardId: 'mm-vert', targetCharacterId: 'doctor' },                // 医生: hospital→city（和上班族同区，为第⑤步黑幕能力做准备）
      { cardId: 'mm-anxiety-1b', targetCharacterId: 'boy_student' },    // 男学生+1不安（干扰）
    ],
    narration:
      '不动女学生——她已经和上班族在都市同区了。\n' +
      '继续堆密谋，第⑤步还能用医生（黑幕）再+1。',
  },
  // L2D2 主人公
  {
    loop: 2, day: 2, role: 'protagonist',
    plays: [
      { cardId: 'pro-goodwill-2-1', targetCharacterId: 'office_worker' }, // 上班族+2友好
      { cardId: 'pro-goodwill-2-2', targetCharacterId: 'girl_student' }, // 女学生+2友好
      { cardId: 'pro-anxiety-minus-2', targetCharacterId: 'boy_student' }, // 男学生-1不安
    ],
    narration:
      '集中火力加好感：上班族+2、女学生+2。\n' +
      '如果剧作家没有打禁止好感，上班族好感就能达标触发技能。',
  },

  // L2D2 第⑤步: 医生（黑幕）在都市，对同区上班族发动能力 +1密谋（累计4）
  // L2D2 Night: 上班族密谋≥2 + 女学生在同区 → 杀手触发 → 女学生（关键人物）死亡 → 轮回结束
  // 本轮教学目的: 展示杀手路线（与轮回1的杀人狂路线对比两种夜晚死亡）
  // 实际游玩中剧作家只会在不同轮回分别使用，教学为了方便压缩在两个轮回内演示
  // Day3 不会到达

  // 轮回 3 — 教学局跳过（算作两次轮回消耗）
  // 轮回 4 — 自由发挥，无预设配牌
];
