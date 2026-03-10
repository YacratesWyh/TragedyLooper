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
  title: string;
  content: string;
  /** 正文里需要加粗的关键词；同时作为 body[data-tutorial-highlight] 的值来高亮对应 UI 区域 */
  highlight?: string;
  /** 可选的补充小字 */
  tip?: string;
  /** 可选的操作指引（会以操作框高亮展示） */
  action?: string;
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
    position: 'center',
    title: '惨剧轮回',
    content:
      '每当惨剧发生，时间就会倒流，一切重来——\n' +
      '但记忆不会消失。\n\n' +
      '在这场宿命对决中，1 名「剧作家」对抗 1-3+ 名「主人公」。\n' +
      '两位玩家都不会现身于版图之上；舞台上行走的，唯有被命运摆布的 NPC 角色。',
    tip: '请双方玩家一起阅读接下来的教学内容，熟悉基本规则。\n💨 已熟悉本轮规则？直接点击左下角「结束当前轮回」可跳过当前轮回的教学。',
  },
  {
    id: 'both-board',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
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
    position: 'top-left',
    highlight: 'rules-reference',
    title: '技能怎么发动？',
    content:
      '技能在结算阶段按顺序触发，分为两类：\n\n' +
      '🌑 剧作家技能（第⑤步）\n' +
      '剧作家根据角色身份发动（这些技能剧情/身份速查里都有！），会暴露信息！\n' +
      '☀️ 主人公技能（第⑥步）\n' +
      '好感度达到 NPC 的要求后，主人公可主动声明触发。\n' +
      '技能效果与 NPC 本人有关，和身份无关。\n\n' +
      '注意身份中的词条能力：\n'+
      '• 「无视友好」：剧作家可以选择不发动友好技能\n' +
      '• 「绝对无视友好」：无论如何，友好技能永远不会发动\n\n' +
      '⚠️ 重要规则：\n' +
      '主人公声明发动技能时，剧作家只需宣告结果（如「无事发生」），\n' +
      '不需要说明原因——保持推理信息的神秘感。\n' +
      '每个技能每天只能发动一次；标注「1/L」的技能每个轮回只能发动一次。',
    tip: '技能触发顺序很重要——先结算剧作家技能，再结算主人公技能。如果同一步骤有多个技能，按执行人喜欢的顺序发动。',
  },
  {
    id: 'both-handoff',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    position: 'top-left',
    highlight: 'rules-reference',
    title: '⚠️ 请将设备交给剧作家',
    content:
      '接下来进入剧作家专属阶段。\n\n' +
      '主人公请回避屏幕，将设备交给剧作家。\n' +
      '剧作家独自阅读完毕后，再交还设备继续游戏。',
    tip: '剧作家拿到设备后，先做一件事：打开左侧专属「速查」面板。',
  },

  // ─── 剧作家引导 ──────────────────────────────────────────────────────────
  {
    id: 'mm-role-intro',
    role: 'mastermind',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    position: 'center',
    title: '你是这场惨剧的编剧',
    content:
      '在这局游戏中，你是唯一知道全部真相的人——\n' +
      '每个角色的身份、事件的犯人、一切幕后布局，都在你手中。\n\n' +
      '你的目标：在每一次轮回中制造惨剧，耗尽主人公的所有机会。\n\n' +
      '同时，你也是这场游戏的主持人。你必须遵守规则：\n' +
      '• 如实宣告——所有结果必须据实公布，绝不撒谎\n' +
      '• 按步宣告——在正确的阶段宣告正确的效果，不跳步不提前\n' +
      '• 只说结果——只说「发生了什么」和「在第几步」，绝不解释原因\n\n' +
      '主人公的唯一情报来源，就是你每一步的宣告。\n' +
      '你透露的真实信息越少，或者误导他们想知道的信息，他们就越迷茫，这就是你的武器。',
    tip: '接下来先打开左侧「速查」面板，了解你手中的底牌。',
  },
  {
    id: 'mm-welcome',
    role: 'mastermind',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    position: 'top-left',
    highlight: 'rules-reference',
    title: '剧作家步骤 1：打开速查',
    content:
      '点击展开「剧情·身份速查」区域。\n\n' +
      '热座模式下，剧作家专属脚本卡默认隐藏——\n' +
      '点击底部「确认查看」解锁全部内容。\n\n' +
      '这里有你需要的一切：\n' +
      '角色的真实身份、每个身份的能力说明、事件的犯人列表。\n' +
      '图片可以点击放大查看细节。',
    tip: '速查面板在整局游戏中随时可以重新打开，不用急着一次记住。',
  },
  {
    id: 'mm-welcome-identities',
    role: 'mastermind',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 1,
    position: 'top-left',
    highlight: 'rules-reference',
    title: '剧作家步骤 2：确认身份与路线',
    content:
      '在速查面板中重点确认三件事：\n\n' +
      '① 身份分配——每个 NPC 的真实身份是什么？\n' +
      '哪些身份有剧作家主动能力？（第⑤步需要你宣告结果）\n\n' +
      '② 关键人物——谁是关键人物？\n' +
      '关键人物死亡会立即终结轮回，她既是你的武器也是软肋。\n\n' +
      '③ 事件日程——Day2、Day3 各有什么事件？当事人是谁？\n' +
      '事件触发条件：当事人存活 + 不安达到上限。',
    tip: '你有多条致胜路线，不必孤注一掷。下一步会告诉你第一天的具体操作。',
  },
  {
    id: 'mm-action-day1',
    role: 'mastermind',
    phases: ['mastermind_action'],
    day: 1,
    loop: 1,
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
    loop: 1,
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
    loop: 4,
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
    position: 'top-right',
    title: '翻牌结算完毕——进入宣告阶段',
    content:
      '所有行动牌已翻开并结算完毕。\n' +
      '角色的移动和指示物变化已反映在版图上——请双方确认当前位置。\n\n' +
      '接下来依次进入四个宣告子阶段（双方可见）：\n\n' +
      '⑤ 剧作家能力\n' +
      '剧作家检查角色的身份能力是否可以发动，宣告结果。\n' +
      '⚠️「无事发生」≠ 没有能力。可能是条件不满足，也可能是剧作家主动选择不发动。\n\n' +
      '⑥ 主人公能力\n' +
      '主人公可声明发动好感达标的 NPC 友好能力。\n' +
      '⚠️「无事发生」无法区分是「能力条件不满足」还是「NPC 身份无视友好」——两者外观完全相同，不能据此推理。\n\n' +
      '⑦ 事件检查\n' +
      '检查当天是否有预定事件。今天 Day1 没有事件（事件从 Day2 开始）。\n\n' +
      '⑧ 夜晚\n' +
      '检查夜间身份能力（杀人狂、杀手等）。',
    tip: '主人公请观察版图：谁被移动了？谁的不安增加了？每一步的「无事发生」和「有事发生」都是推理线索。',
  },
  {
    id: 'mm-ability-day1',
    role: 'mastermind',
    phases: ['mastermind_ability'],
    day: 1,
    loop: 1,
    position: 'top-right',
    title: '⑤ 剧作家能力',
    content:
      '🔒 默读（不要念出来）：\n' +
      '检查所有角色的剧作家身份能力是否可以发动。\n\n' +
      '本局你有一个可主动发动的能力：\n' +
      '• 刑警（传谣人）：可对同区域的一名角色+1不安\n' +
      '• 条件：刑警必须与目标在同一区域\n' +
      '• 今天刑警（都市）与目标不在同一区域 → 条件不满足，无法发动\n\n' +
      '⚠️ 教学要点：\n' +
      '即使今天条件不满足，后续轮回中你可能会主动选择不发动——\n' +
      '另外，「无视友好」身份允许你在关键时刻，不发动主人公的友好能力。\n' +
      '主人公无法区分「没有能力」「条件不满足」和「选择不发动」。\n\n' +
      '🔊 向主人公宣告：\n' +
      '「第⑤步：无事发生。」\n\n' +
      '然后点击按钮推进到下一阶段。',
    tip: '主人公听到「无事发生」后会记录下来——在后续轮回中，如果你发动了能力，他们会与今天对比来推理。',
  },
  {
    id: 'pro-ability-girl-student',
    role: 'protagonist',
    phases: ['protagonist_ability'],
    day: 1,
    loop: 1,
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
    id: 'both-incident-day1',
    role: 'both',
    phases: ['incident'],
    day: 1,
    loop: 1,
    position: 'top-right',
    title: '⑦ 事件检查：今天无事件',
    content:
      '今天是 Day1，没有预定事件。\n\n' +
      '本局的事件日程（公开信息）：\n' +
      '• Day2 —— 谋杀案\n' +
      '• Day3 —— 自杀\n\n' +
      '事件触发需要同时满足三个条件：\n' +
      '① 当天有预定事件\n' +
      '② 当事人（犯人）仍然存活\n' +
      '③ 当事人的不安达到上限\n\n' +
      '三个条件缺一不可。主人公只要破坏其中任意一个，就能阻止事件。',
    tip: '事件日程和类型是公开的，但「当事人是谁」只有剧作家知道。找出当事人是主人公的核心任务之一。',
  },
  {
    id: 'mm-night-day1',
    role: 'mastermind',
    phases: ['night'],
    day: 1,
    loop: 1,
    position: 'top-right',
    title: '⑧ 夜晚：检查杀人狂',
    content:
      '🔊 切换阶段：\n' +
      '「现在进入第⑧步·夜晚阶段，请将设备交还给剧作家，由剧作家执行夜晚检查并宣告结果。」\n\n' +
      '🔒 总结：\n' +
      '翻牌结算后，你的纵向移动让巫女从神社移到了学校，\n' +
      '横向移动让男学生从学校移到了都市。\n' +
      '现在确认版图：巫女和女学生是否在学校独处？\n\n' +
      '巫女的真实身份是「杀人狂」——强制能力：\n' +
      '若有其他角色与她独处同一区域，那名角色立即死亡。\n\n' +
      '• 独处 → 触发，进入下一步宣告（本剧本），剧作家不能决定杀人狂操作\n' +
      '• 未独处 → 不触发',
    tip:
      '🔊 以下内容按顺序朗读给所有玩家：\n' +
      '1) 剧作家结算宣告格式：\n' +
      '✅「第⑧步·夜晚：女学生死亡。」\n' +
      '✅「第⑧步·夜晚：无事发生。」\n' +
      '❌ 不要说出巫女、杀人狂、独处等任何原因。\n\n' +
      '2) 本剧本中，第一天夜晚阶段若出现角色死亡，原因只有「杀人狂」。\n' +
      '3) 由于剧作家宣布当前轮回立刻结束，第一天原因只有「关键人物死亡」。',
  },
  {
    id: 'mm-night-kill-day1',
    role: 'mastermind',
    phases: ['night'],
    day: 1,
    loop: 1,
    position: 'center',
    title: '⑧ 夜晚：女学生死亡',
    content:
      '巫女与女学生在学校独处——杀人狂能力强制触发。\n\n' +
      '🔊 向主人公宣告：\n' +
      '「第⑧步·夜晚：女学生被发现死亡。」\n\n' +
      '主人公可能追问原因，你只需回答：\n' +
      '「这发生在第⑧步·夜晚阶段。」——其余让他们自己推理。\n\n' +
      '女学生是关键人物——关键人物死亡，当前轮回立即结束。\n' +
      '也就是说：结束轮回的原因只有关键人物死亡。',
    action: '点击女学生卡片左下角的「☠ 死亡」按钮。',
    tip: '提醒主人公回想：今天谁被移动了？谁和女学生在同一区域？这就是推理的起点。',
  },
  {
    id: 'both-loop-end-day1',
    role: 'both',
    phases: ['night'],
    day: 1,
    loop: 1,
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
    id: 'mm-ability-loop2-day2',
    role: 'mastermind',
    phases: ['mastermind_ability'],
    day: 2,
    loop: 2,
    position: 'top-right',
    title: '⑤ 剧作家能力：黑幕追加密谋',
    content:
      '🔒 默读：\n' +
      '医生的真实身份是「黑幕」——能力：对同区域任一角色 +1 密谋。\n' +
      '医生和上班族现在都在都市，条件满足。\n\n' +
      '🔊 向主人公宣告：\n' +
      '「第⑤步：上班族密谋 +1。」',
    action: '手动点击上班族卡片，将密谋 +1。',
    tip: '主人公会记下这个信息——有人在第⑤步给上班族加了密谋，但他们不知道是谁、为什么。',
  },
  {
    id: 'pro-ability-loop2-day2',
    role: 'mastermind',
    phases: ['protagonist_ability'],
    day: 2,
    loop: 2,
    position: 'top-right',
    title: '⑥ 主人公能力：上班族坦白身份',
    content:
      '主人公声明发动上班族的友好能力「坦白身份」（好感≥3）。\n\n' +
      '🔊 向主人公宣告：\n' +
      '「上班族的身份是——杀手。」',
    tip: '这是主人公主动逼出的情报。从现在起，他们知道了上班族就是杀手。',
  },
  {
    id: 'mm-night-loop2-day2',
    role: 'mastermind',
    phases: ['night'],
    day: 2,
    loop: 2,
    position: 'center',
    title: '⑧ 夜晚：双杀',
    content:
      '🔒 默读 · 检查杀手能力：\n' +
      '上班族（杀手）密谋 4 ≥ 2，女学生（关键人物）在同区 → 可选触发。\n' +
      '选择发动——女学生死亡，主人公死亡。\n\n' +
      '🎭 剧作家宣告：\n' +
      '「第⑧步·夜晚：女学生死亡——你们，也就是主人公，也死了。」\n\n' +
      '然后向主人公说明「双杀」：\n' +
      '① 女学生是关键人物——关键人物死亡是基础失败条件，轮回立即结束。\n' +
      '② 主人公死亡——这是一种独立的基础胜利方式，剧作家可以直接击杀主人公玩家。\n' +
      '两种死法同时发生在这一晚。',
    action: '点击女学生卡片的「☠ 死亡」按钮。',
    tip: '这是惨剧轮回的仪式感——剧作家不只是主持人，也是这场惨剧的导演。享受这个瞬间。',
  },
  {
    id: 'both-loop-end-loop2',
    role: 'both',
    phases: ['night'],
    day: 2,
    loop: 2,
    position: 'center',
    highlight: 'end-loop-btn',
    title: '轮回2回顾：已见过三种胜利方式',
    content:
      '两个轮回下来，你们已经见过剧作家的三种胜利方式：\n\n' +
      '轮回1 — 杀人狂击杀关键人物：巫女与女学生独处，强制触发，女学生死亡。\n' +
      '轮回2 — 杀手击杀关键人物：上班族密谋≥2 + 女学生同区，可选触发，女学生死亡。\n' +
      '轮回2 — 主人公死亡：杀手4密谋触发。这是一种全游戏通用的基础胜利方式,主人公死亡意味立刻开始轮回。\n\n' +
      '⚠️ 本教学轮回没有 Loop3——教学中这个轮回算作两次轮回消耗，暴露了两个信息：主谋存在、上班族是杀手。\n' +
      '💡 实战中，主人公其实应该给上班族打「禁止密谋」来阻止密谋积累。\n' +
      '但教学局刻意不这样做，只是为了完整展示剧本中剧作家的所有埋点种类。',
    action: '点击左下角「结束当前轮回」按钮两次（跳过轮回3，直接进入轮回4）。',
    tip: '实际游玩中，剧作家不会在同一轮回同时走多条路线，而是分别消耗轮回。教学是为了压缩演示。',
  },
  {
    id: 'both-loop3-skip',
    role: 'both',
    phases: ['dawn', 'mastermind_action'],
    loop: 3,
    position: 'top-left',
    title: '教学局：跳过轮回3',
    content:
      '本轮回在教学局中强制跳过，不进行任何操作。\n\n' +
      '轮回2已经算作两次轮回消耗——\n' +
      '直接点击「结束当前轮回」进入轮回4。',
    action: '点击左下角「结束当前轮回」按钮。',
    tip: '轮回4将是最后一个轮回，届时你们将自由发挥。',
  },
  {
    id: 'mm-night-general',
    role: 'mastermind',
    phases: ['night'],
    position: 'top-right',
    title: '请将设备交给剧作家',
    content:
      '🔊 朗读给所有玩家：\n' +
      '「现在进入第⑤步～第⑧步。\n' +
      '请将设备交还给剧作家，由剧作家依次主持：\n' +
      '能力阶段 → 事件检查 → 夜晚阶段，并宣告结果。」\n\n' +
      '🔒 剧作家拿到设备后，按左侧速查面板逐项检查，完成后朗读结果。',
    tip: '每个阶段只宣告「发生了什么」和「在第几步」，绝不解释原因。',
  },
  {
    id: 'mm-loop2',
    role: 'mastermind',
    phases: ['dawn', 'mastermind_action'],
    loop: 2,
    position: 'top-right',
    title: '轮回2：杀手路线',
    content:
      '本轮教学固定出牌请按顺序执行：\n' +
      'Day1：给上班族堆密谋，同时用巫女的移动逼主人公交出禁止移动牌。\n' +
      'Day2：继续堆密谋（+2牌），不动女学生——她已经和上班族在都市同区了。\n\n' +
      'Day2 第⑤步：医生（黑幕）和上班族同在都市，发动能力再给上班族 +1 密谋。\n' +
      '夜晚：上班族密谋≥2，女学生（关键人物）在同区 → 杀手触发 → 女学生死亡 → 轮回结束。',
    tip: '轮回1展示了杀人狂路线，轮回2展示杀手路线。实际游玩中剧作家只会分别消耗轮回，教学为了方便压缩演示。',
  },

  // ─── 主人公引导 ──────────────────────────────────────────────────────────
  {
    id: 'pro-loop2',
    role: 'protagonist',
    phases: ['dawn', 'protagonist_action'],
    day: 1,
    loop: 2,
    position: 'top-right',
    title: '轮回2：你已经知道了一些事',
    content:
      '本轮教学固定出牌请按顺序执行：\n' +
      'Day1：先锁巫女移动，再给上班族增加好感，并让女学生横向移动。\n' +
      'Day2：尝试把女学生从高风险位置移开，同时继续上班族好感推进。\n\n' +
      '这里让女学生进都市，可以规避无法进入都市的巫女。\n' +
      '目标是优先规避夜晚被击杀的风险，再在后续结算里观察剧作家的真实路线。\n\n' +
      '以后：如果剧作家没有在上班族打牌，就可以在下次打出「友好+2」，直接触发上班族技能，逼迫剧作家浪费友好禁止牌。',
    tip:
      '行动阶段先做可执行操作，不在这里提前下结论。'
  },
  {
    id: 'pro-welcome',
    role: 'protagonist',
    phases: ['dawn', 'protagonist_action'],
    day: 1,
    loop: 1,
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
    position: 'top-left',
    title: '📋 分析公开信息——你的第一个推理',
    content:
      '事件表告诉了你很多：\n' +
      '• 第2天「谋杀案」→ 由某犯人杀死另一人（注意事件的犯人和身份的杀手/杀人狂不同！）\n' +
      '• 第3天「自杀」→ 当事人自己死亡\n\n' +
      '失败条件中涉及死亡的只有「关键人物死亡」，\n' +
      '因此剧作家的主线规则（Rule Y）大概率是\n' +
      '「谋杀计划」或「守护此地」——\n' +
      '只有这样关键人物才有机会以死亡触发失败。\n\n' +
      '结论：你们的核心任务是保护关键人物。\n' +
      '前两个轮回信息极少，很可能守不住——\n' +
      '但每次失败都是信息，不要放弃观察。',
    tip:
      '先关注各角色的技能，再决定行动路线。\n例：上班族好感≥3后可发动「坦白身份」，剧作家必须当场公开上班族的身份牌——直接排除一个嫌疑人。',
  },
  {
    id: 'pro-shrine-maiden-read',
    role: 'protagonist',
    phases: ['resolution'],
    day: 1,
    loop: 1,
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
      '巫女好感=3（轮回限）：移除神社的1个密谋标记。\n' +
      '巫女好感=5（轮回限）：公开同区域1名角色身份。\n' +
      '如果你在神社附近的角色里发现一个剧作家始终没打牌的——重点怀疑她就是巫女。',
  },
  {
    id: 'pro-action-day1',
    role: 'protagonist',
    phases: ['protagonist_action'],
    day: 1,
    loop: 1,
    position: 'bottom-right',
    title: '第一次行动',
    content:
      '第一轮回，你对这个世界一无所知。\n没关系——观察本身就是胜利。\n\n' +
      '最多打出3张牌：\n' +
      '① 给1~2名角色放「友好+1」——好感是你撬开秘密的杠杆\n' +
      '② 给看起来危险的角色放「不安-1」——也许能拖住某场灾难\n\n' +
      '这一局的目的不是赢，而是让剧作家暴露他的计划。',
    tip: '迷茫时，就加好感。\n信息就是力量——\n刑警好感≥4：逼出事件犯人\n上班族好感≥3：逼出上班族身份\n巫女好感≥3：清除神社密谋；巫女好感≥5：公开同区域身份\n医生好感≥2：为同区角色移除不安；医生好感≥3：公开同区域身份\n\n哪怕这轮回失败，收集到足够线索，最终至少能 Normal End。',
  },
  {
    id: 'pro-loop2-day2',
    role: 'protagonist',
    phases: ['dawn', 'protagonist_action'],
    day: 2,
    loop: 2,
    position: 'top-right',
    title: '总算多过了一天！',
    content:
      '上一次轮回，你们连第一天都没撑过去。\n' +
      '这一次，巫女被锁住了，女学生挺过了夜晚——时间线终于推进到了 Day2。\n\n' +
      '但危机没有解除。剧作家一直在给上班族堆密谋，而女学生还在都市……\n' +
      '如果你不做点什么，今晚可能就是另一种死法。\n\n' +
      '现在的关键：让医生进城，同时继续给上班族加好感——\n' +
      '信息越多，下一轮你就越有底牌。',
    tip: '就算这轮守不住，只要逼出足够信息，后面的轮回就能精准防守。',
  },
  {
    id: 'pro-force-reveal',
    role: 'protagonist',
    phases: ['protagonist_action'],
    day: 2,
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
    position: 'top-right',
    title: '时间倒流，记忆犹在',
    content:
      '世界回到了起点——但你没有。\n' +
      '上一次轮回的惨剧还历历在目：有人在夜晚死去。\n\n' +
      '这一次，你知道该先做什么了——控制住巫女。\n' +
      '只要她无法与任何人独处，夜晚就不会重演。\n\n' +
      '锁死巫女之后，腾出手来观察剧作家的其他布局：\n' +
      '他的牌会集中在谁身上？那个人，很可能就是下一个目标。',
    tip: '行动阶段只做操作，不下结论。把观察到的事实留到轮回结束再统一解读。',
  },
  {
    id: 'pro-incident-trigger',
    role: 'both',
    phases: ['incident'],
    day: 2,
    loop: 2,
    position: 'top-left',
    highlight: 'incident-schedule',
    title: '事件检查：请先看左侧事件日程',
    content:
      '现在进入事件检查。\n' +
      '请先看左侧「事件日程」并逐条核对三件事：\n' +
      '1) 今天是否有该事件\n' +
      '2) 当事人是否存活\n' +
      '3) 当事人不安是否达到上限\n\n' +
      '确认后再宣告是否触发。',
    tip: '事件日程会自动展开并高亮。先核对条件，再给结论。',
  },

  {
    id: 'mm-loop4',
    role: 'mastermind',
    phases: ['dawn', 'mastermind_action'],
    day: 1,
    loop: 4,
    position: 'top-right',
    title: '轮回4：自由发挥——混淆身份',
    content:
      '本轮交给你自由发挥，不再有固定出牌。\n\n' +
      '⚠️ 关键提醒：规避 Normal End\n' +
      '如果主人公猜对所有角色的身份，他们可以直接获胜。\n' +
      '你必须混淆医生、刑警、男学生这三人的身份——\n' +
      '他们分别是黑幕、传谣人、平民，能力差异很大。\n\n' +
      '混淆技巧：\n' +
      '• 尽量让医生和刑警在同一区域时再发动第⑤步能力\n' +
      '• 这样主人公无法分辨「+1 密谋」来自黑幕还是「+1 不安」来自传谣人\n' +
      '• 对男学生也偶尔打干扰牌，制造他可能有身份的假象\n\n' +
      '你的目标不变：让惨剧发生。但同时要让主人公猜不准谁是谁。',
    tip: '如果主人公没能通关，还要他们猜错至少一个身份，你才能赢。',
  },
  {
    id: 'pro-loop4',
    role: 'protagonist',
    phases: ['dawn', 'protagonist_action'],
    day: 1,
    loop: 4,
    position: 'top-right',
    title: '轮回4：自由发挥——终盘防守',
    content:
      '本轮没有固定出牌，由你自由决策。\n\n' +
      '防守优先级：\n' +
      '1) 锁巫女移动，防止杀人狂路线\n' +
      '2) 压低女学生不安，阻止 Day3 自杀事件\n' +
      '3) 拆散刑警与女学生同区，切断传谣人 +1 不安\n\n' +
      '经过三轮观察，你应该已经锁定了关键身份——用行动验证你的推理。',
    tip: '三天全部存活即通关。集中资源在最危险的一天。',
  },

  // ─── 教学总结（轮回4开头，紧跟在角色引导之后） ──────────────────────────
  {
    id: 'tutorial-game-over',
    role: 'both',
    phases: ['dawn', 'mastermind_action', 'protagonist_action'],
    loop: 4,
    position: 'center',
    highlight: 'plot-guess',
    title: '🎓 教程结束',
    content:
      '你已经见过了剧作家的三种武器：\n' +
      '• 杀人狂（夜晚强制击杀同区角色）\n' +
      '• 杀手（密谋≥2 时夜晚击杀同区关键人物）\n' +
      '• 黑幕（第⑤步给同区角色 +1 密谋）\n\n' +
      '但剧本中还有一个身份没有暴露——\n' +
      '点击顶栏的剧情猜测下拉框，选择主线「杀人计划」和支线「开膛手之影」，\n' +
      '系统会自动推算必须存在的身份组合。\n' +
      '对比你已经确认的身份，剩下那个就是隐藏的第四人。\n\n' +
      '💡 即使四次轮回全部失败，主人公仍有最后机会：\n' +
      '猜中所有角色的真实身份 → 达成 Normal End。\n\n' +
      '从现在开始，双方自由发挥。\n' +
      '教学引导不再出现——祝你好运。',
    action: '在顶栏点击「Y 主线」选择「杀人计划」，「X1 支线」选择「开膛手之影」。',
    tip:
      'Ending 体系：\n' +
      '• Best End — 在较短轮回内通关\n' +
      '• Good End — 在较长轮回内通关\n' +
      '• Normal End — 猜中全部角色身份（最后的翻盘机会）\n' +
      '• Bad End — 猜错身份\n\n' +
      '实战技巧：本剧本中，主人公只要让所有人四处移动来消耗剧作家的移动牌，让巫女乱杀人（毕竟这个剧本大部分NPC都是坏人！）\n' +
      '就能迫使剧作家暴露大量信息，最终使其无法达成击杀条件。但是这样就达不成教学目的了！',
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
  const isInitialTurn = gameState?.currentLoop === 1 && gameState?.currentDay === 1;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDismissedIds([]);
      setCollapsed(false);
      setHidden(false);
      setExecutedTurns(new Set());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isInitialTurn]);

  const scriptName = gameState?.publicInfo.scriptName ?? '';
  const scriptId = currentScript?.id;
  const shouldRenderGuide = !!gameState && isTutorialScript(scriptName, scriptId) && !hidden;
  const phase: GamePhase = gameState?.phase ?? 'dawn';
  const currentDay = gameState?.currentDay ?? 1;
  const currentLoop = gameState?.currentLoop ?? 1;

  const dismissedSet = new Set(dismissedIds);

  // 当前可展示的步骤：匹配 + 未消除 + 按声明顺序
  const candidates = shouldRenderGuide
    ? STEPS
      .filter(s => !dismissedSet.has(s.id))
      .filter(s => matchesStep(s, phase, currentDay, currentLoop, playerRole))
    : [];

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

  // 已完成数：分母 = 已消除 + 当前待读，只统计玩家实际会遇到的步骤
  const completedCount = dismissedIds.length;
  const totalCount = dismissedIds.length + candidates.length;

  useEffect(() => {
    // 教学配牌执行后会进入“等待推进到下一阶段”状态，此时关闭高亮闪烁，避免左栏视觉抖动感。
    const target = shouldDockLeft ? null : (current?.highlight ?? null);
    if (target) {
      document.body.dataset.tutorialHighlight = target;
    } else {
      delete document.body.dataset.tutorialHighlight;
    }
    return () => { delete document.body.dataset.tutorialHighlight; };
  }, [current?.highlight, shouldDockLeft]);

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

  const tutorialNeedsSidebarByContent = !!current && (
    current.title.includes('速查')
    || current.title.includes('身份')
    || current.title.includes('技能')
    || current.title.includes('循环')
    || current.content.includes('速查')
    || current.content.includes('身份')
    || current.content.includes('技能')
    || current.content.includes('循环')
  );

  const shouldOpenSidebarForTutorial =
    shouldDockLeft
    || stepPosition === 'top-left'
    || current?.highlight === 'rules-reference'
    || tutorialNeedsSidebarByContent;

  useEffect(() => {
    if (shouldOpenSidebarForTutorial) {
      document.body.dataset.tutorialSidebar = 'open';
    } else {
      delete document.body.dataset.tutorialSidebar;
    }
    return () => { delete document.body.dataset.tutorialSidebar; };
  }, [shouldOpenSidebarForTutorial]);

  if (!shouldRenderGuide) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      className={`fixed z-[130] w-80 pointer-events-none cursor-grab active:cursor-grabbing transition-all duration-300 ${positionClass}`}
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

                      {/* 操作框 */}
                      {current.action && (
                        <div className="bg-sky-50 border border-sky-300 rounded-lg px-3 py-2">
                          <p className="text-sky-800 text-[11px] leading-relaxed font-medium">
                            🛠 操作：{formatContent(current.action)}
                          </p>
                        </div>
                      )}

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
                <span className="text-[11px] text-amber-900 font-semibold truncate max-w-[220px] whitespace-nowrap">
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
