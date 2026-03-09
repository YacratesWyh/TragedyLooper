'use client';

/**
 * TutorialGuide — fs-01 教学剧本全程引导
 *
 * 检测到当前剧本为教学剧本时，在游戏右下角浮现一个可折叠的提示卡片。
 * 每张卡片对应一个"教学节点"：特定阶段 + 天数 + 身份。
 * 用户点击「明白了」后该节点永久消除（本局内），自动切换至下一节点。
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ChevronDown, ChevronUp, X, ChevronLeft, Play } from 'lucide-react';
import { useGameStore } from '@/games/tragedy-looper/store';
import type { GamePhase, PlayerRole, TutorialTurn } from '@/games/tragedy-looper/types';
import { LOCATION_NAMES } from '@/games/tragedy-looper/types';
import { FS01_PLAYBOOK } from '@/games/tragedy-looper/scripts/fs-01';
import { ALL_CHARACTERS } from '@/games/tragedy-looper/scripts/characters';

// ─── 数据结构 ───────────────────────────────────────────────────────────────

/**
 * 卡片在屏幕上的位置锚点：
 *   top-right   — 右上角（默认，不遮挡主要 UI）
 *   bottom-right — 右下角手牌区上方（与出牌操作相关）
 *   top-left    — 左侧速查栏右边（与左侧面板相关）
 *   center      — 屏幕正中（需要全神贯注的关键步骤）
 */
type TutorialPosition = 'top-right' | 'bottom-right' | 'top-left' | 'center';

interface TutorialStep {
  id: string;
  role: PlayerRole | 'both';
  /** 匹配的阶段列表，undefined = 任意阶段 */
  phases?: GamePhase[];
  /** 匹配的天数，undefined = 任意天 */
  day?: number;
  /** 仅在这个轮回显示，undefined = 任意轮回 */
  loop?: number;
  /** 优先级：数字越小越先显示（同一时机多条时取最小值） */
  priority: number;
  title: string;
  content: string;
  /** 正文里需要加粗的关键词；同时作为 body[data-tutorial-highlight] 的值来高亮对应 UI 区域 */
  highlight?: string;
  /** 可选的补充小字 */
  tip?: string;
  /** 卡片锚点位置，默认 top-right */
  position?: TutorialPosition;
}

const STEPS: TutorialStep[] = [
  // ─── 双方共同阅读（开局教学） ─────────────────────────────────────────────
  {
    id: 'both-premise',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: -10,
    position: 'center',
    title: '惨剧轮回',
    content:
      '每当惨剧发生，时间就会倒流，一切重来——\n' +
      '但记忆不会消失。\n\n' +
      '在这场宿命对决中，1 名「剧作家」对抗 1-3+ 名「主人公」。\n' +
      '两位玩家都不会现身于版图之上；舞台上行走的，唯有被命运摆布的 NPC 角色。',
    tip: '请双方玩家一起阅读接下来的教学内容，熟悉基本规则。',
  },
  {
    id: 'both-board',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: -9,
    position: 'top-right',
    highlight: 'action-hand',
    title: '版图与角色',
    content:
      '版图是 2×2 的 4 个地点：医院、神社、都市、学校。\n' +
      'NPC 角色分布在各地点中，每人有一个隐藏身份（仅剧作家知道）。\n\n' +
      '双方可以使用「移动牌」带领 NPC 按横/纵方向移动到相邻地点，剧作家有一张斜向移动，主人公有禁止移动。\n' +
      '如果双方都在同一角色上使用移动，都是同方向则不变；有斜向则向另一方向移动；一横一竖则斜向移动。\n\n' +
      '每个角色身上有三种指示物：好感（♥）、不安（⚡）、密谋（👁）。',
  },
  {
    id: 'both-indicators',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: -8,
    position: 'top-right',
    highlight: 'character-indicators',
    title: '三种指示物',
    content:
      '♥ 好感：主人公放置。角色好感达标后，可发动友好能力获取情报。\n\n' +
      '⚡ 不安：双方都可放置。角色不安达到上限时，若角色为犯人则必定触发事件。\n\n' +
      '👁 密谋：仅剧作家放置。密谋积累过多可能触发某些身份能力或失败条件。',
    tip: '每个角色都有不安上限，在角色卡片上显示为「不安极限: X/Y」。',
  },
  {
    id: 'both-flow',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: -7,
    position: 'top-right',
    title: '每天的流程',
    content:
      '每天按以下顺序进行：\n\n' +
      '② 剧作家先暗置最多 3 张行动牌\n' +
      '③ 主人公后暗置最多 3 张行动牌\n' +
      '④ 翻牌结算——翻开所有牌，按优先级执行\n' +
      '⑤ 剧作家身份能力（只宣告结果，不说原因）\n' +
      '⑥ 主人公友好能力（好感达标后可发动）\n' +
      '⑦ 事件检查（当天有事件 + 当事人存活 + 不安达限）\n' +
      '⑧ 夜晚（杀手/杀人狂等夜间能力）',
    tip: '⑤～⑧ 是独立步骤，剧作家应在对应步骤才宣告效果，不要提前透露信息。',
  },
  {
    id: 'both-victory',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: -6,
    position: 'top-right',
    title: '胜负条件',
    content:
      '☀️ 主人公：在任意一次轮回中，撑到最后一天结束且未触发失败条件，即可获胜, 对于轮回数为范围的剧本，意味着更少循环的情况也可以通关，视为best end，反之为good end。\n\n' +
      '🌑 剧作家：所有轮回结束时主人公仍未打破轮回，剧作家获胜bad end。\n\n' +
      '未打破轮回时，如果主人公猜对全部人物身份，则也可获胜normal end。\n\n' +
      '常见失败条件：关键人物死亡（立即结束当前轮回）。\n' +
      '剧本还可能有额外失败条件（见速查面板）。',
  },
  {
    id: 'both-quickref',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: -5,
    position: 'top-left',
    title: '速查面板在哪里？',
    content:
      '这三个入口最常用，按位置找就不会迷路：\n\n' +
      '左侧：📖「速查」\n' +
      '查看当前剧本的规则、身份能力表、事件日程。\n\n' +
      '顶部：🎴「牌组」\n' +
      '查看剧作家 / 主人公的行动牌构成与用法。\n\n' +
      '右上角：📝「简介」\n' +
      '随时回看完整的游戏说明。',
    tip: '拿不准规则时，优先点左侧「速查」。',
  },
  {
    id: 'both-quickref-detail',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: -4,
    position: 'top-left',
    highlight: 'rules-reference',
    title: '速查：剧情与身份',
    content:
      '左侧「速查」面板有两个核心区块：\n\n' +
      '📜 剧情速查\n' +
      '• 主线（Y）和支线（X1/X2）的名称固定对应当前剧本，不能更改\n' +
      '• 包含额外失败条件——主人公必须时刻留意\n' +
      '• 列出该剧本所有剧情规则下必须出现的身份构成，帮助主人公推断角色身份\n\n' +
      '👤 身份速查\n' +
      '• 列出本剧本可能出现的所有身份及其能力描述\n' +
      '• 主人公可以对照这张表推理场上每个 NPC 到底是哪种身份',
    tip: '顶栏的 Y/X 下拉选择器可以帮助主人公快速推算：选定猜测的主线支线后，会自动计算出必需的身份组合，缩小排查范围。',
  },
  {
    id: 'both-skills',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: -3,
    position: 'top-right',
    title: '技能怎么发动？',
    content:
      '技能在结算阶段按顺序触发，分为两类：\n\n' +
      '🌑 剧作家技能（第⑤步）\n' +
      '剧作家根据角色身份发动，但会暴露信息！\n' +
      '• 「无视友好」身份：剧作家可以选择不发动\n' +
      '• 「绝对无视友好」身份：无论如何，技能永远不会发动\n\n' +
      '☀️ 主人公技能（第⑥步）\n' +
      '好感度达到 NPC 的要求后，主人公可主动声明触发。\n' +
      '技能效果与 NPC 本人有关，和身份无关。\n\n' +
      '⚠️ 重要规则：\n' +
      '主人公声明发动技能时，剧作家只需宣告结果（如「无事发生」），\n' +
      '不需要说明是否满足条件——保持信息的神秘感。\n' +
      '每个技能每天只能发动一次；标注「1/L」的技能每个轮回只能发动一次。',
    tip: '技能触发顺序很重要——先结算剧作家技能，再结算主人公技能。如果同一步骤有多个技能，按版图上角色顺序依次结算。',
  },
  {
    id: 'both-handoff',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: -1,
    position: 'center',
    title: '⚠️ 请将设备交给剧作家',
    content:
      '基础规则介绍完毕。\n\n' +
      '接下来的内容包含剧本机密——角色的真实身份和剧作家的战略。\n' +
      '请主人公回避，将设备交给剧作家单独阅读。\n\n' +
      '剧作家阅读完毕后，会有提示将设备交还给主人公。',
  },

  // ─── 剧作家引导 ──────────────────────────────────────────────────────────
  {
    id: 'mm-welcome',
    role: 'mastermind',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: 0,
    position: 'top-right',
    title: '剧作家，欢迎回到你的舞台',
    content:
      '这个世界是你亲手搭建的戏台。\n' +
      '那些在版图上行走的角色，以为自己活在真实的命运里——\n' +
      '而你知道，这不过是第一幕。\n\n' +
      '你是这场悲剧永恒的编织者。\n' +
      '主人公每一次轮回，每一次垂死挣扎，\n' +
      '都只是在延长你独自欣赏的表演。\n\n' +
      '引导惨剧走向终焉。\n' +
      '让轮回永不停止。',
    tip: '📖 点击屏幕左侧「速查」按钮可随时查看剧情规则和身份能力表。',
  },
  {
    id: 'mm-welcome-identities',
    role: 'mastermind',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    priority: 1,
    position: 'center',
    title: '🔒 你的秘密——请勿让主人公看见',
    content:
      '本局各角色真实身份如下：\n\n' +
      '• 女学生 ＝ 关键人物（死亡即轮回）\n' +
      '• 巫女 ＝ 杀人狂（夜晚若与人独处，对方立死）\n' +
      '• 上班族 ＝ 杀手（同区关键人物密谋≥2时可杀）\n' +
      '• 刑警 ＝ 传谣人（第⑤步可给同区角色+1不安）\n' +
      '• 医生 ＝ 主犯　　男学生 ＝ 平民',
    tip: '三条胜路：\n① Night1 巫女杀女学生\n② Day2 男学生谋杀案\n③ Day3 刑警传谣→女学生自杀\n\n你也可以在左侧剧作家专属区查看当前剧本。\n确认已记住后，将设备交给主人公。',
  },
  {
    id: 'mm-action-day1',
    role: 'mastermind',
    phases: ['mastermind_action'],
    day: 1,
    loop: 1,
    priority: 2,
    position: 'bottom-right',
    title: '第一次行动——三路并进',
    content:
      '你有三条胜路，今天为所有路线布局：\n\n' +
      '【胜路①·夜晚杀人】将「纵向移动」打到巫女身上，让她移到学校；' +
      '再将「横向移动」打到男学生上，把他移离学校——若巫女与女学生在学校独处，夜晚触发杀人狂能力！\n\n' +
      '【胜路②·Day2谋杀案】将「不安+1」打到男学生身上——他的上限是2，明天再加一张即可触发Day2谋杀案。\n\n' +
      '【胜路③·Day3自杀】将「不安+1」打到女学生身上开始积累（她上限3，需要3次才能触发）。',
    tip: '同时布置三路会分散主人公注意力。他们猜不透你要走哪条路！使用传谣人的能力（你不需要解释原因），可以额外在传谣人区域增加一个不安，这个能力是由剧作家发动的，注意会暴露传谣人身份！',
  },
  {
    id: 'mm-action-day2',
    role: 'mastermind',
    phases: ['mastermind_action'],
    day: 2,
    priority: 1,
    position: 'bottom-right',
    title: 'Day2——谋杀案触发检查',
    content:
      '今天第2天结束时会检查谋杀案（当事人：男学生，上限2）。\n若他不安≥2且存活，谋杀案触发，本轮回结束！\n\n推荐操作：\n① 补打「不安+1」到男学生，确保他今天达到上限\n② 继续给女学生加「不安+1」，为Day3铺路\n③ 若胜路①（巫女夜晚）昨晚未成功，可考虑用移动牌重新布置位置',
    tip: '主人公可能会给男学生加友好度来阻止事件。注意他们的动向，用「禁止友好」牌干扰。',
  },
  {
    id: 'mm-action-day3',
    role: 'mastermind',
    phases: ['mastermind_action'],
    day: 3,
    priority: 0,
    position: 'bottom-right',
    title: 'Day3——刑警传谣·女学生自杀',
    content:
      '今天第3天结束时检查自杀事件（当事人：女学生，上限3）。\n\n关键：在第⑤步（剧作家身份能力阶段），若刑警（传谣人）与女学生在同一区域，可使用「传谣人」能力对她+1不安。\n\n推荐操作：\n① 翻牌前确认刑警和女学生位置，若不同区则用移动牌调整\n② 打「不安+1」到女学生上（翻牌结算+1）\n③ 第⑤步使用刑警传谣能力（再+1）\n→ 合计可在一天内给女学生+2不安，大大提高触发概率',
    tip: '女学生不安≥3时自杀触发。主人公全力阻止——你必须分散他们的手牌，让他们无法同时防住所有的不安来源。',
  },
  // ─── L1D1 夜晚子阶段引导 ────────────────────────────────────────────────
  {
    id: 'both-night-phases-intro',
    role: 'both',
    phases: ['mastermind_ability'],
    day: 1,
    loop: 1,
    priority: -1,
    position: 'top-right',
    title: '夜晚阶段：双方可见',
    content:
      '从现在开始，进入夜晚结算的各子阶段，双方都可以看见操作过程：\n\n' +
      '⑤ 剧作家能力\n' +
      '⑥ 主人公能力\n' +
      '⑦ 事件检查\n' +
      '⑧ 夜晚\n\n' +
      '各阶段由剧作家主持宣告，游戏系统自动推进。\n' +
      '如遇到结算 bug，可向开发者反馈，同时通过手动点击角色卡片上的指示物按钮来修正数值。',
    tip: '双方现在都可以查看版图，讨论各角色的当前状态。',
  },
  {
    id: 'mm-ability-day1',
    role: 'mastermind',
    phases: ['mastermind_ability'],
    day: 1,
    loop: 1,
    priority: 0,
    position: 'top-right',
    title: '⑤ 剧作家能力：无事发生',
    content:
      '此阶段检查场上角色的剧作家身份能力。\n\n' +
      '传谣人（刑警）能力：可对同区域角色+1不安。\n' +
      '今天刑警未与目标同区域，暂不发动。\n\n' +
      '宣告「无事发生」，点击按钮推进到下一阶段。',
    tip: '宣告只说结果，不说原因。"无事发生"本身也是一种信息——主人公会记录的。',
  },
  {
    id: 'pro-ability-girl-student',
    role: 'protagonist',
    phases: ['protagonist_ability'],
    day: 1,
    loop: 1,
    priority: 0,
    position: 'top-left',
    title: '⑥ 主人公能力：女学生的「安慰同学」',
    content:
      '若女学生好感≥2，你可以发动「安慰同学」：\n消除同一区域内（除她自身外）一名学生的1个不安。\n\n' +
      '尝试发动——当前没有学生有不安可以移除，结果为无事发生。\n\n' +
      '⚠️ 注意：这次「无事发生」无法证明女学生是「绝对无视友好」身份。\n' +
      '条件不满足时技能同样无效，两种情况从外部看完全相同。',
    tip:
      '还记得「无视友好」与「绝对无视友好」的区别吗？\n' +
      '请对照左侧「速查」查看身份说明。\n' +
      '「绝对无视友好」：无论如何主人公技能永远不触发。\n' +
      '「无视友好」：剧作家可以选择不发动自身能力（主人公技能不受影响）。',
  },
  {
    id: 'mm-night-day1',
    role: 'mastermind',
    phases: ['night'],
    day: 1,
    loop: 1,
    priority: 0,
    position: 'top-right',
    title: '⑧ 夜晚：检查杀人狂',
    content:
      '夜晚阶段由你执行夜间身份能力。\n\n' +
      '巫女（杀人狂）强制能力：\n若有角色与她独处同一区域，那名角色立即死亡。\n\n' +
      '检查巫女与女学生是否独处同一区域：\n' +
      '• 若是 → 继续下一步宣告死亡\n' +
      '• 若否 → 宣告「无事发生」，继续Day2布局',
    tip:
      '⚠️ 公开规则：只说结果，不说身份！\n' +
      '✅「第⑧步·夜晚：女学生死亡」\n' +
      '❌「巫女的杀人狂能力杀了女学生」\n' +
      '原因、身份名、能力名一概不提。',
  },
  {
    id: 'mm-night-kill-day1',
    role: 'mastermind',
    phases: ['night'],
    day: 1,
    loop: 1,
    priority: 1,
    position: 'center',
    title: '⑧ 夜晚：宣布女学生死亡',
    content:
      '巫女与女学生独处同区域——杀人狂能力强制触发！\n\n' +
      '操作步骤：\n' +
      '① 宣告：「第⑧步·夜晚：女学生死亡」\n' +
      '② 点击女学生角色卡片左下角的「☠ 死亡」按钮\n' +
      '③ 关键人物死亡，当前轮回立刻结束',
    tip:
      '⚠️ 只说「女学生在夜晚死亡了」，不要说「因为巫女是杀人狂」。\n' +
      '主人公会自己推理死因——这正是游戏的核心乐趣。',
  },
  {
    id: 'both-loop-end-day1',
    role: 'both',
    phases: ['night'],
    day: 1,
    loop: 1,
    priority: 3,
    position: 'center',
    highlight: 'end-loop-btn',
    title: '轮回结束——等待主人公确认',
    content:
      '当前轮回已结束。\n\n' +
      '主人公之间：请充分讨论、记录信息，可以拍照截图，对本轮的结算做出推理。\n' +
      '• 谁被放过不安，这意味着他可能是犯人。\n' +
      '• 剧作家的牌集中在哪个角色上？\n' +
      '• 哪个阶段游戏结束的，为什么游戏结束，这说明什么？\n\n' +
      '准备好后，点击游戏左下角的「结束当前轮回」按钮。',
    tip: '时间倒流，但记忆不会消失。你已经知道了什么？',
  },
  {
    id: 'mm-night-general',
    role: 'mastermind',
    phases: ['night'],
    priority: 2,
    position: 'top-right',
    title: '夜晚结算',
    content:
      '依次检查：\n① 杀人狂（巫女，强制）：若有角色与她同在一区域→那名角色死亡，无条件触发\n② 杀手（上班族，任意）：若同区域有关键人物且该人物身上密谋≥2→可选择杀死那名关键人物\n只需口头宣告结果：“xxx被发现死亡了！”，不需要说明触发原因（保持神秘感）。',
  },
  {
    id: 'mm-loop2',
    role: 'mastermind',
    phases: ['dawn', 'mastermind_action'],
    loop: 2,
    priority: 0,
    position: 'top-right',
    title: '轮回2：主人公学到了什么？',
    content:
      '他们记住了你的行动。换一个迷惑策略：\n• 把不安打在和上局不同的角色上\n• 用密谋牌虚晃一枪\n• 改变巫女的移动路线\n你还有机会！',
    tip: '他们轮回次数有限，每次他们失败都离你的胜利更近一步。',
  },

  // ─── 主人公引导 ──────────────────────────────────────────────────────────
  {
    id: 'pro-loop2',
    role: 'protagonist',
    phases: ['dawn', 'protagonist_action'],
    day: 1,
    loop: 2,
    priority: 0,
    position: 'top-right',
    title: '轮回2：你已经知道了一些事',
    content:
      '观察剧作家把行动牌打在哪些位置——' +
      '那些位置就是他想控制的关键坐标。\n\n' +
      '你的首要任务是让巫女和女学生跟进到同一位置，' +
      '用她们的技能干扰或抵消剧作家的布局。\n' +
      '同时持续给她们加「好感+1」，好感满后即可发动主动技能，直接改变局面。',
    tip:
      '好感技能是本局最强的干预手段——' +
      '巫女满好感可移除角色上的阴谋，女学生满好感可阻止一次死亡。\n' +
      '不要等到危机出现才加好感，提前布局才来得及。'
  },
  {
    id: 'pro-welcome',
    role: 'protagonist',
    phases: ['dawn', 'protagonist_action'],
    day: 1,
    loop: 1,
    priority: 0,
    position: 'top-right',
    title: '欢迎来到惨剧轮回！',
    content:
      '版图上有6个NPC角色，你不知道谁是什么身份。\n你们的目标：在任意一次轮回中，撑到第3天结束，不触发任何失败条件。',
    tip: '失败条件：关键人物死亡 / 事件触发。\n📖 点击屏幕左侧「速查」按钮可随时查看剧情规则和身份能力表，。',
  },
  {
    id: 'pro-card-rules',
    role: 'protagonist',
    phases: ['protagonist_action'],
    day: 1,
    loop: 1,
    priority: 0,
    position: 'bottom-right',
    title: '打牌基础规则',
    content:
      '每位玩家每天最多打 3 张牌，面朝下放置。\n\n' +
      '打到「角色」上：\n' +
      '• 每个角色上你只能放 1 张自己的牌\n' +
      '打到「场所」上：\n' +
      '• 密谋牌可以放到场所上，给该地点增加密谋标记\n' +
      '• 禁止密谋牌放到场所上，可以抵消剧作家放到同一场所的密谋牌',
    tip: '有的剧本，场所密谋标记积累过多可能触发某些失败条件',
  },
  {
    id: 'pro-script-analysis',
    role: 'protagonist',
    phases: ['protagonist_action'],
    day: 1,
    loop: 1,
    priority: 1,
    position: 'top-left',
    title: '📋 分析公开信息——你的第一个推理',
    content:
      '事件表告诉了你很多：\n' +
      '• 第2天「谋杀案」→ 由某角色（杀手）杀死另一人\n' +
      '• 第3天「自杀」→ 当事人自己死亡\n\n' +
      '失败条件中涉及死亡的只有「关键人物死亡」，\n' +
      '因此剧作家的主线规则（Rule Y）大概率是\n' +
      '「谋杀计划」或「守护此地」——\n' +
      '只有这样关键人物才有机会以死亡触发失败。\n\n' +
      '结论：你们的核心任务是保护关键人物。\n' +
      '前两个轮回信息极少，很可能守不住——\n' +
      '但每次失败都是信息，不要放弃观察。',
    tip:
      '先关注各角色的技能，再决定行动路线。\n例：上班族好感≥2后可发动「坦白身份」，剧作家必须当场公开上班族的身份牌——直接排除一个嫌疑人。',
  },
  {
    id: 'pro-shrine-maiden-read',
    role: 'protagonist',
    phases: ['resolution'],
    day: 1,
    loop: 1,
    priority: 0,
    position: 'top-right',
    title: '翻牌：从剧作家的「空位」推理',
    content:
      '巫女的友好能力非常强力——但你不知道谁是巫女。\n\n' +
      '关键技巧：剧作家先打牌，你后打牌。\n' +
      '翻开后，注意剧作家【没有】打牌的角色位置。\n\n' +
      '他选择「跳过」的角色，说明这些角色\n' +
      '对他当前的计划威胁不大——\n' +
      '正因如此，这些位置反而是你加好感的好目标：\n' +
      '剧作家不会优先干扰你积累他「不在乎」的角色好感。',
    tip:
      '巫女好感=2（轮回限）：移除神社的1个密谋标记并公开同区域角色身份。\n' +
      '如果你在神社附近的角色里发现一个剧作家始终没打牌的——重点怀疑她就是巫女。',
  },
  {
    id: 'pro-action-day1',
    role: 'protagonist',
    phases: ['protagonist_action'],
    day: 1,
    loop: 1,
    priority: 2,
    position: 'bottom-right',
    title: '第一次行动',
    content:
      '第一轮回，你对这个世界一无所知。\n没关系——观察本身就是胜利。\n\n' +
      '最多打出3张牌：\n' +
      '① 给1~2名角色放「友好+1」——好感是你撬开秘密的杠杆\n' +
      '② 给看起来危险的角色放「不安-1」——也许能拖住某场灾难\n\n' +
      '这一局的目的不是赢，而是让剧作家暴露他的计划。',
    tip: '迷茫时，就加好感。\n信息就是力量——\n刑警好感≥4：逼出事件犯人\n上班族好感≥2：逼出上班族身份\n巫女好感≥2：清除密谋 + 公开神社附近角色\n医生好感≥2：为同区角色移除不安\n\n哪怕这轮回失败，收集到足够线索，最终至少能 Normal End。',
  },
  {
    id: 'pro-force-reveal',
    role: 'protagonist',
    phases: ['protagonist_action'],
    day: 2,
    priority: 0,
    position: 'bottom-right',
    title: '打破剧本：让剧作家失控',
    content:
      '有些情况一旦发生，剧作家就不得不暴露更多信息——\n这不受他控制，是你主动出击的机会。\n\n' +
      '本局中的例子：\n' +
      '• 上班族好感≥3 → 剧作家必须公开上班族的身份牌\n' +
      '• 刑警好感≥4 → 公开某事件的犯人的角色\n' +
      '• 巫女好感≥5（轮回限）→ 公开同区域1名角色身份\n\n' +
      '每次逼出一条信息，剧作家的计划就动摇一分。\n' +
      '试着出其不意——集中好感在他意想不到的角色上，\n' +
      '让他在「阻止你」和「推进计划」之间两难。',
    tip: '剧作家也只有3张牌，他无法同时阻止所有人。分散攻势，逼他做出取舍。',
  },
  {
    id: 'pro-action-general',
    role: 'protagonist',
    phases: ['protagonist_action'],
    day: 2,
    priority: 1,
    position: 'bottom-right',
    title: '行动进阶技巧',
    content:
      '「禁止移动」牌（轮回限 × 3）是你最强的控制工具：\n打在角色上，剧作家的移动牌对该角色无效。\n「移动」牌可以主动把角色移走安全区域，远离危险事件地点。',
    tip: '注意：你自己打的「不安+1」牌也会增加角色不安，慎用！',
  },
  {
    id: 'pro-resolution-day1',
    role: 'protagonist',
    phases: ['resolution'],
    day: 1,
    loop: 1,
    priority: 0,
    position: 'top-right',
    title: '翻牌！观察剧作家的行动',
    content:
      '双方牌同时翻开。\n重点观察：\n• 剧作家把「不安」打在了哪个角色上？重点怀疑该角色\n• 剧作家的「移动」牌想把谁移到哪里？\n每一次结算都是信息收集机会——把剧作家的行动记在脑中。',
  },
  {
    id: 'pro-day3-warning',
    role: 'protagonist',
    phases: ['mastermind_action', 'protagonist_action'],
    day: 3,
    priority: 0,
    position: 'center',
    title: '第3天有事件！',
    content:
      '今天是关键！版图上有一个事件将在晚间检查。\n核心任务：找出不安最高的角色，用「不安-1」降低他的不安，防止事件触发。\n也可以把当事人移动到不符合事件条件的地点（如果是地点限定事件）。',
    tip: '事件触发的条件是：当事人存活 + 不安≥上限 + 今天是事件日。',
  },
  {
    id: 'pro-loop2-remind',
    role: 'protagonist',
    phases: ['dawn', 'protagonist_action'],
    loop: 2,
    priority: 0,
    position: 'top-right',
    title: '你记住了！这次不同',
    content:
      '轮回重置，但你的记忆保留。\n回顾上一轮：哪个角色不安增长最快？剧作家的牌集中在谁身上？\n这一轮用掌握的线索来精准阻止——你离真相又近了一步。',
    tip: '推理身份：关键人物一般是剧作家最想「保住」同时主人公最该保护的那个。',
  },
  {
    id: 'pro-incident-trigger',
    role: 'protagonist',
    phases: ['incident'],
    priority: 0,
    position: 'top-right',
    title: '事件检查阶段',
    content:
      '剧作家正在检查今日事件是否触发。\n此时你无法再行动，只能等待结果。\n如果事件触发，轮回结束；如果没触发，则安全进入夜晚。',
    tip: '下一轮记住今天谁的不安最高——他很可能是当事人。',
  },

  // ─── 轮回3：YX线推理 ──────────────────────────────────────────────────
  {
    id: 'pro-loop3-yx',
    role: 'protagonist',
    phases: ['dawn', 'protagonist_action'],
    day: 1,
    loop: 3,
    priority: 0,
    position: 'top-left',
    title: '第三轮回：该暴露传谣人了',
    content:
      '经过两次轮回，你已经知道了巫女是杀人狂——剧作家靠这招赢过你一次。\n\n' +
      '但支线剧情「开膛手之影」意味着场上必定藏着一个传谣人。\n' +
      '现在剧作家已经不能再靠"你不知道谁是杀人狂"来赢了，\n' +
      '他必须启用传谣人这张暗牌。\n\n' +
      '仔细观察：剧作家能力阶段（第⑤步），\n' +
      '如果有角色莫名其妙地+1不安——那就是传谣人！',
    tip:
      '传谣人的能力是在第⑤步给同区域角色+1不安。这不受牌效控制，无法用「禁止不安」阻挡——只有把传谣人移走才能阻止。',
  },
  {
    id: 'mm-loop3',
    role: 'mastermind',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 3,
    priority: 0,
    position: 'top-right',
    title: '轮回3：启用传谣人',
    content:
      '主人公已经知道巫女是杀人狂了，但你还有暗牌——刑警是传谣人。\n' +
      '这一轮把刑警移到女学生附近，在第⑤步利用传谣能力额外+1不安。\n' +
      '同时别忘了巫女——主人公可能防密谋却忘了防移动。',
    tip: '传谣人+1不安在第⑤步执行，不受「禁止不安」牌的影响。这是你最隐蔽的武器。',
  },

  // ─── 游戏结束：教学总结 ────────────────────────────────────────────────
  {
    id: 'tutorial-game-over',
    role: 'both',
    phases: ['game_over'],
    priority: 0,
    position: 'center',
    title: '轮回的尽头',
    content:
      '「这个世界真是糟透了……四次轮回，四次失败。\n' +
      '时间的齿轮停止了转动。」\n\n' +
      '「但命运给了我们最后一个机会——\n' +
      '如果你能猜中所有角色的真实身份，就能逆转这一切，达成 Normal End。」\n\n' +
      '「相信经历了这么多轮回，你心中已经有了答案。」',
    tip:
      '教学中的每一步都是为了展示不同的游戏机制。\n' +
      '在真实对局中，主人公只要让所有人四处移动来消耗剧作家的移动牌，\n' +
      '就能迫使剧作家暴露大量信息，最终使其无法达成击杀条件而失败。\n\n' +
      'Ending 体系：\n' +
      '• Best End — 在较短轮回范围内通关\n' +
      '• Good End — 在较长轮回范围内通关\n' +
      '• Normal End — 猜中全部角色身份\n' +
      '• Bad End — 猜错身份',
  },
];

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

function matchesStep(
  step: TutorialStep,
  phase: GamePhase,
  day: number,
  loop: number,
  role: PlayerRole
): boolean {
  if (step.role !== 'both' && step.role !== role) return false;
  if (step.phases && !step.phases.includes(phase)) return false;
  if (step.day !== undefined && step.day !== day) return false;
  if (step.loop !== undefined && step.loop !== loop) return false;
  return true;
}

function isTutorialScript(scriptName: string, scriptId?: string): boolean {
  return scriptId === 'fs-01' || scriptName.includes('First Steps') || scriptName.includes('初学者');
}

function formatContent(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      {i < text.split('\n').length - 1 && <br />}
    </span>
  ));
}

const CARD_DISPLAY: Record<string, string> = {
  'mm-diag': '斜向移动',   'mm-horiz': '横向移动',   'mm-vert': '纵向移动',
  'mm-forbid-goodwill': '禁止友好',
  'mm-anxiety-1a': '不安+1', 'mm-anxiety-1b': '不安+1',
  'mm-anxiety-minus': '不安-1', 'mm-forbid-anxiety': '禁止不安',
  'mm-intrigue-1': '密谋+1', 'mm-intrigue-2': '密谋+2',
};

function getCardName(cardId: string): string {
  if (CARD_DISPLAY[cardId]) return CARD_DISPLAY[cardId];
  if (cardId.startsWith('pro-forbid-move'))   return '禁止移动';
  if (cardId.startsWith('pro-horiz'))         return '横向移动';
  if (cardId.startsWith('pro-vert'))          return '纵向移动';
  if (cardId.startsWith('pro-goodwill-2'))    return '友好+2';
  if (cardId.startsWith('pro-goodwill-1'))    return '友好+1';
  if (cardId.startsWith('pro-anxiety-minus')) return '不安-1';
  if (cardId.startsWith('pro-anxiety-plus'))  return '不安+1';
  if (cardId.startsWith('pro-forbid-intrigue')) return '禁止密谋';
  return cardId;
}

function getTargetName(play: { targetCharacterId?: string; targetLocation?: string }): string {
  if (play.targetCharacterId) return ALL_CHARACTERS[play.targetCharacterId as keyof typeof ALL_CHARACTERS]?.name ?? play.targetCharacterId;
  if (play.targetLocation) return LOCATION_NAMES[play.targetLocation as keyof typeof LOCATION_NAMES] ?? play.targetLocation;
  return '?';
}

function findPlaybookTurn(loop: number, day: number, role: PlayerRole): TutorialTurn | undefined {
  return FS01_PLAYBOOK.find(t => t.loop === loop && t.day === day && t.role === role);
}

// ─── 组件 ────────────────────────────────────────────────────────────────────

export function TutorialGuide() {
  const { gameState, playerRole, currentScript, executeTutorialPlays } = useGameStore();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  // 已执行的教学配牌 key: "loop-day-role"
  const [executedTurns, setExecutedTurns] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissedIds([]);
    setCollapsed(false);
    setHidden(false);
    setExecutedTurns(new Set());
  }, [gameState?.currentLoop === 1 && gameState?.currentDay === 1]);

  if (!gameState) return null;

  const scriptName = gameState.publicInfo.scriptName;
  const scriptId = currentScript?.id;
  if (!isTutorialScript(scriptName, scriptId)) return null;
  if (hidden) return null;

  const { phase, currentDay, currentLoop } = gameState;

  const dismissedSet = new Set(dismissedIds);

  // 当前可展示的步骤：匹配 + 未消除 + 按优先级排序
  const candidates = STEPS
    .filter(s => !dismissedSet.has(s.id))
    .filter(s => matchesStep(s, phase, currentDay, currentLoop, playerRole))
    .sort((a, b) => a.priority - b.priority);

  const current = candidates[0] ?? null;

  // 教学配牌：检测当前阶段是否有预设配牌，且只在最后一条步骤时展示
  const isActionPhase = phase === 'mastermind_action' || phase === 'protagonist_action';
  const phaseRole = phase === 'mastermind_action' ? 'mastermind' : 'protagonist';
  const isLastStep = candidates.length === 1;
  const playbookTurn = isActionPhase && isLastStep ? findPlaybookTurn(currentLoop, currentDay, phaseRole) : undefined;
  const turnKey = `${currentLoop}-${currentDay}-${phaseRole}`;
  const isExecuted = executedTurns.has(turnKey);

  // 配牌已执行 → 面板移到左侧提示"点击按钮进入下一阶段"
  const shouldDockLeft = !!playbookTurn && isExecuted;

  // 已完成数（用于底部进度提示）
  const roleSteps = STEPS.filter(s => s.role === playerRole || s.role === 'both');
  const completedCount = roleSteps.filter(s => dismissedSet.has(s.id)).length;
  const totalCount = roleSteps.length;

  useEffect(() => {
    const target = current?.highlight ?? null;
    if (target) {
      document.body.dataset.tutorialHighlight = target;
    } else {
      delete document.body.dataset.tutorialHighlight;
    }
    return () => { delete document.body.dataset.tutorialHighlight; };
  }, [current?.highlight]);

  const handleDismiss = () => {
    if (current) {
      setDismissedIds(prev => [...prev, current.id]);
      setCollapsed(false);
    }
  };

  const handleExecutePlaybook = () => {
    if (!playbookTurn || isExecuted) return;
    executeTutorialPlays(playbookTurn.plays);
    setExecutedTurns(prev => new Set(prev).add(turnKey));
  };

  // 回看上一条：弹出最后一个消除记录
  const handleGoBack = () => {
    setDismissedIds(prev => prev.slice(0, -1));
    setCollapsed(false);
  };

  // 根据当前步骤的 position 字段决定卡片落点
  // shouldDockLeft（配牌已执行）始终覆盖，将卡片移至左侧面板旁
  const stepPosition = current?.position ?? 'top-right';
  const positionClass = shouldDockLeft
    ? 'left-[292px] bottom-4'
    : stepPosition === 'top-left'
    ? 'top-14 left-[292px]'
    : stepPosition === 'bottom-right'
    ? 'bottom-28 right-4'
    : stepPosition === 'center'
    ? ''
    : 'top-14 right-4';

  const positionStyle: React.CSSProperties =
    stepPosition === 'center' && !shouldDockLeft
      ? { top: '20%', left: 'calc(50vw - 160px)', touchAction: 'none' }
      : { touchAction: 'none' };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      className={`fixed z-[80] w-80 pointer-events-none cursor-grab active:cursor-grabbing transition-all duration-300 ${positionClass}`}
      style={positionStyle}
    >
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={false}
            animate={{}}
            exit={{}}
            transition={{ duration: 0 }}
            className="pointer-events-auto"
          >
            {/* 卡片 */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* 头部 */}
              <div
                className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-300 cursor-pointer select-none"
                onClick={() => setCollapsed(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap size={15} className="text-amber-900" />
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    教学引导
                  </span>
                  <span className="text-[10px] text-amber-700/70">
                    {completedCount}/{totalCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setHidden(true); }}
                    className="p-0.5 text-amber-800/60 hover:text-amber-900 transition-colors"
                    title="关闭教学引导"
                  >
                    <X size={13} />
                  </button>
                  {collapsed
                    ? <ChevronUp size={14} className="text-amber-800/70" />
                    : <ChevronDown size={14} className="text-amber-800/70" />}
                </div>
              </div>

              {/* 正文（可折叠） */}
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pt-3 pb-4 space-y-3">
                      {/* 标题 */}
                      <h4 className="font-bold text-slate-800 text-sm leading-snug">
                        {current.title}
                      </h4>

                      {/* 正文 */}
                      <p className="text-slate-700 text-xs leading-relaxed">
                        {formatContent(current.content)}
                      </p>

                      {/* 小贴士 */}
                      {current.tip && (
                        <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
                          <p className="text-amber-800 text-[11px] leading-relaxed">
                            💡 {formatContent(current.tip)}
                          </p>
                        </div>
                      )}

                      {/* 教学配牌面板 */}
                      {playbookTurn && !isExecuted && (
                        <div className="bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
                          <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-600">
                            <span className="text-[11px] font-bold text-slate-200">
                              📋 教学配牌（{phaseRole === 'mastermind' ? '剧作家' : '主人公'}）
                            </span>
                          </div>
                          <div className="px-3 py-2 space-y-1">
                            {playbookTurn.plays.map((play, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className={phaseRole === 'mastermind' ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>
                                  {getCardName(play.cardId)}
                                </span>
                                <span className="text-slate-500">→</span>
                                <span className="text-slate-300">{getTargetName(play)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="px-3 py-2 border-t border-slate-600">
                            <p className="text-slate-400 text-[11px] leading-relaxed mb-2">
                              {formatContent(playbookTurn.narration)}
                            </p>
                            <button
                              onClick={handleExecutePlaybook}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              <Play size={12} />
                              执行教学操作
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 已执行配牌确认 */}
                      {playbookTurn && isExecuted && (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2">
                          <p className="text-emerald-800 text-[11px] font-medium">
                            ✓ 已打出 {playbookTurn.plays.length} 张牌，点击左侧进入下一阶段。
                          </p>
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex items-center justify-between pt-1">
                        {dismissedIds.length > 0 ? (
                          <button
                            onClick={handleGoBack}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            <ChevronLeft size={13} />
                            上一条
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {playerRole === 'mastermind' ? '🌑 剧作家视角' : '☀️ 主人公视角'}
                          </span>
                        )}
                        <button
                          onClick={handleDismiss}
                          disabled={!!(playbookTurn && !isExecuted)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                            playbookTurn && !isExecuted
                              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'
                          }`}
                          title={playbookTurn && !isExecuted ? '请先执行教学操作' : undefined}
                        >
                          明白了 →
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 折叠状态下的小徽章 */}
            {collapsed && (
              <div
                className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-300 border border-amber-400 rounded-lg cursor-pointer hover:bg-amber-200 transition-colors"
                onClick={() => setCollapsed(false)}
              >
                <GraduationCap size={12} className="text-amber-900" />
                <span className="text-[11px] text-amber-900 font-semibold">
                  {current.title}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 无当前阶段提示时——显示进度 + 可回看上一条 */}
      {!current && dismissedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg"
        >
          <GraduationCap size={12} className="text-amber-700" />
          <span className="text-[11px] text-amber-800 flex-1">教学进行中 {completedCount}/{totalCount}</span>
          <button
            onClick={handleGoBack}
            className="flex items-center gap-0.5 text-[11px] text-amber-700 hover:text-amber-900 transition-colors font-medium"
          >
            <ChevronLeft size={12} />
            回看
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
