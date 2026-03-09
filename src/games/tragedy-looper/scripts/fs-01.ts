/*
 * @Author: cyanocitta
 * @Date: 2026-03-04 19:24:39
 * @LastEditTime: 2026-03-09 18:56:23
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
  // 轮回 2 — 密谋杀手（教学：密谋积累 + 杀手触发条件）
  // 目标：给上班族堆密谋≥2，让他和女学生在同区 → 杀手夜晚杀人
  // 重置后位置: 全部回初始位
  // ══════════════════════════════════════════════════════════════

  // L2D1 剧作家
  {
    loop: 2, day: 1, role: 'mastermind',
    plays: [
      { cardId: 'mm-intrigue-1', targetCharacterId: 'office_worker' },  // 上班族+1密谋
      { cardId: 'mm-anxiety-1a', targetCharacterId: 'boy_student' },    // 男学生+1不安（干扰）
      { cardId: 'mm-vert', targetCharacterId: 'detective' },            // 刑警: city→hospital（伏笔）
    ],
    narration:
      '这一轮启用杀手路线。先给上班族堆密谋，同时用不安干扰主人公判断。\n' +
      '把刑警移到医院，远离战场——等轮回3再用他。',
  },
  // L2D1 主人公
  {
    loop: 2, day: 1, role: 'protagonist',
    plays: [
      { cardId: 'pro-goodwill-1-1', targetCharacterId: 'office_worker' }, // 上班族+1友好
      { cardId: 'pro-forbid-move-1', targetCharacterId: 'shrine_maiden' }, // 禁止巫女移动
      { cardId: 'pro-anxiety-minus-1', targetCharacterId: 'boy_student' }, // 男学生-1不安
    ],
    narration:
      '上一轮巫女杀了人——这轮锁死巫女不让她动。\n' +
      '继续给上班族攒好感，为坦白身份做准备。',
  },

  // L2D2 剧作家
  {
    loop: 2, day: 2, role: 'mastermind',
    plays: [
      { cardId: 'mm-intrigue-2', targetCharacterId: 'office_worker' },  // 上班族+2密谋（累计≥2）
      { cardId: 'mm-horiz', targetCharacterId: 'girl_student' },        // 女学生: school→city（和上班族同区）
      { cardId: 'mm-anxiety-1b', targetCharacterId: 'boy_student' },    // 男学生+1不安（干扰）
    ],
    narration:
      '一口气打出密谋+2！上班族的密谋已经够了。\n' +
      '把女学生移到都市——上班族就在那里。\n' +
      '杀手能力：同区域关键人物密谋≥2时，夜晚可以杀死她。',
  },
  // L2D2 主人公
  {
    loop: 2, day: 2, role: 'protagonist',
    plays: [
      { cardId: 'pro-horiz-1', targetCharacterId: 'girl_student' },     // 女学生移动（尝试分离）
      { cardId: 'pro-goodwill-1-2', targetCharacterId: 'office_worker' }, // 上班族+1友好
      { cardId: 'pro-anxiety-minus-2', targetCharacterId: 'boy_student' }, // 男学生-1不安
    ],
    narration:
      '密谋这么高——上班族一定有问题！\n' +
      '试着把女学生移走，同时继续给上班族攒好感。\n' +
      '……但剧作家也打了移动牌，结算时移动会叠加。',
  },

  // L2 Night: 上班族密谋≥2 + 女学生在同区 → 杀手触发 → 轮回结束
  // Day3 不会到达

  // ══════════════════════════════════════════════════════════════
  // 轮回 3 — 传谣人登场（教学：传谣人能力 + 多路突破）
  // 目标：剧作家用传谣人+移动牌组合，让巫女和女学生在同区
  // 重置后位置: 全部回初始位
  // ══════════════════════════════════════════════════════════════

  // L3D1 剧作家
  {
    loop: 3, day: 1, role: 'mastermind',
    plays: [
      { cardId: 'mm-horiz', targetCharacterId: 'girl_student' },        // 女学生: school→city
      { cardId: 'mm-forbid-goodwill', targetCharacterId: 'office_worker' }, // 禁止上班族友好
      { cardId: 'mm-anxiety-1a', targetCharacterId: 'boy_student' },    // 男学生+1不安（干扰）
    ],
    narration:
      '这一轮变换策略：把女学生移到都市（上班族所在地），同时阻止主人公继续给上班族攒好感。\n' +
      '给男学生加不安做干扰——传谣人（刑警）很快登场。',
  },
  // L3D1 主人公
  {
    loop: 3, day: 1, role: 'protagonist',
    plays: [
      { cardId: 'pro-forbid-move-1', targetCharacterId: 'shrine_maiden' }, // 锁死巫女
      { cardId: 'pro-forbid-intrigue', targetLocation: 'city' },           // 都市禁止密谋
      { cardId: 'pro-goodwill-1-1', targetCharacterId: 'office_worker' },  // 上班族+1友好
    ],
    narration:
      '巫女是杀人狂——必须锁死。上班族身上密谋太危险——给都市贴禁止密谋。\n' +
      '继续给上班族攒好感……但剧作家打了禁止友好。',
  },

  // L3D2 剧作家
  {
    loop: 3, day: 2, role: 'mastermind',
    plays: [
      { cardId: 'mm-vert', targetCharacterId: 'shrine_maiden' },       // 巫女: shrine→school
      { cardId: 'mm-diag', targetCharacterId: 'girl_student' },        // 女学生: city→hospital? 不对，需要去school
      { cardId: 'mm-anxiety-1b', targetCharacterId: 'detective' },     // 刑警+1不安（无意义干扰）
    ],
    narration:
      '巫女已经不被禁止移动了（Day1的禁移只管一天）。\n' +
      '把巫女移到学校，把女学生也移过去——杀人狂再次出击！\n' +
      '主人公以为防住了密谋路线，却没防住巫女的第二次偷袭。',
  },
  // L3D2 主人公
  {
    loop: 3, day: 2, role: 'protagonist',
    plays: [
      { cardId: 'pro-horiz-1', targetCharacterId: 'detective' },       // 刑警移动（试探）
      { cardId: 'pro-goodwill-1-2', targetCharacterId: 'boy_student' }, // 男学生+1友好
      { cardId: 'pro-anxiety-minus-2', targetCharacterId: 'office_worker' }, // 上班族-1不安
    ],
    narration:
      '上班族的密谋已经防住了。给男学生也攒一点好感——\n' +
      '但没注意到巫女在移动……',
  },

  // L3 Night: 巫女和女学生又在同区了 → 杀人狂触发 → 轮回结束

  // ══════════════════════════════════════════════════════════════
  // 轮回 4 — 自杀事件（教学：事件触发 + 传谣人配合）
  // 目标：利用传谣人给女学生追加不安 → Day3自杀事件触发
  // 重置后位置: 全部回初始位
  // ══════════════════════════════════════════════════════════════

  // L4D1 剧作家
  {
    loop: 4, day: 1, role: 'mastermind',
    plays: [
      { cardId: 'mm-anxiety-1a', targetCharacterId: 'girl_student' },   // 女学生+1不安
      { cardId: 'mm-horiz', targetCharacterId: 'detective' },           // 刑警: city→school（和女学生同区）
      { cardId: 'mm-forbid-anxiety', targetCharacterId: 'boy_student' }, // 禁止男学生不安（干扰）
    ],
    narration:
      '最后一轮——走自杀路线。女学生不安上限3，需要3点不安。\n' +
      '先给+1不安，同时把刑警移到学校（传谣人需要和目标同区域）。\n' +
      '禁止不安打到男学生身上做掩护。',
  },
  // L4D1 主人公
  {
    loop: 4, day: 1, role: 'protagonist',
    plays: [
      { cardId: 'pro-forbid-move-1', targetCharacterId: 'shrine_maiden' }, // 锁死巫女
      { cardId: 'pro-anxiety-minus-1', targetCharacterId: 'girl_student' }, // 女学生-1不安
      { cardId: 'pro-goodwill-1-1', targetCharacterId: 'office_worker' },  // 上班族+1友好
    ],
    narration:
      '巫女一定要锁死。给女学生降不安，继续给上班族攒好感。\n' +
      '结算后女学生不安变化取决于双方牌的抵消结果。',
  },

  // L4D2 剧作家
  // 状态: 女学生(school,不安1), 刑警(school)
  {
    loop: 4, day: 2, role: 'mastermind',
    plays: [
      { cardId: 'mm-anxiety-1a', targetCharacterId: 'girl_student' },   // 女学生+1不安
      { cardId: 'mm-anxiety-1b', targetCharacterId: 'boy_student' },    // 男学生+1不安（干扰）
      { cardId: 'mm-forbid-goodwill', targetCharacterId: 'office_worker' }, // 禁止上班族友好
    ],
    narration:
      '继续堆不安。禁止上班族友好——不让主人公解锁坦白身份。\n' +
      '给男学生也加不安——分散注意力。\n' +
      '第⑤步：刑警（传谣人）和女学生同在学校 → 传谣+1不安！',
  },
  // L4D2 主人公
  {
    loop: 4, day: 2, role: 'protagonist',
    plays: [
      { cardId: 'pro-anxiety-minus-2', targetCharacterId: 'girl_student' }, // 女学生-1不安
      { cardId: 'pro-horiz-1', targetCharacterId: 'detective' },            // 移动刑警: school→city
      { cardId: 'pro-goodwill-1-2', targetCharacterId: 'office_worker' },   // 上班族+1友好
    ],
    narration:
      '拼命给女学生降不安，试着把刑警移走断开传谣人的连接。\n' +
      '继续给上班族攒好感……\n' +
      '结算后不安牌互抵，但第⑤步传谣人+1不安无法阻挡。',
  },

  // L4D3 剧作家
  // 状态: 女学生(school, 不安~2)
  {
    loop: 4, day: 3, role: 'mastermind',
    plays: [
      { cardId: 'mm-anxiety-1a', targetCharacterId: 'girl_student' },   // 女学生+1不安
      { cardId: 'mm-horiz', targetCharacterId: 'detective' },           // 刑警移回学校
      { cardId: 'mm-intrigue-1', targetLocation: 'school' },           // 学校+1密谋（烟雾弹）
    ],
    narration:
      '最后一天！再加一次不安，把刑警拉回来准备传谣。\n' +
      '第⑤步传谣人能力再+1不安——女学生不安达到上限！\n' +
      '自杀事件触发条件：当事人存活 + 不安≥上限。',
  },
  // L4D3 主人公
  {
    loop: 4, day: 3, role: 'protagonist',
    plays: [
      { cardId: 'pro-anxiety-minus-3', targetCharacterId: 'girl_student' }, // 女学生-1不安
      { cardId: 'pro-forbid-move-2', targetCharacterId: 'detective' },      // 禁止刑警移动
      { cardId: 'pro-goodwill-2-1', targetCharacterId: 'office_worker' },   // 上班族+2友好
    ],
    narration:
      '最后的挣扎——降不安、锁刑警、给上班族冲好感，什么都试了。\n' +
      '但即使禁止了移动，刑警昨天已经在学校了……\n' +
      '传谣人的+1不安在第⑤步触发，最终女学生不安≥3。\n' +
      '自杀事件触发——第四次轮回也失败了。',
  },
];
