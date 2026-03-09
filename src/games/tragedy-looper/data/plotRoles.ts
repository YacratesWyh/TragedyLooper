/**
 * 剧情必需身份数据
 * 数据来源：doc/tragedy-sets.md
 */

import type { RoleType } from '@/games/tragedy-looper/types';

export interface PlotRoleRequirement {
  roleId: RoleType;
  count: number;
}

export interface PlotDef {
  id: string;
  name: string;
  type: 'main' | 'sub';
  requiredRoles: PlotRoleRequirement[];
}

// ── First Steps 主线 ──────────────────────────────────────────────
const FS_MAIN: PlotDef[] = [
  {
    id: 'murder_plan',
    name: '杀人计划',
    type: 'main',
    requiredRoles: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'killer', count: 1 },
      { roleId: 'brain', count: 1 },
    ],
  },
  {
    id: 'light_of_avenger',
    name: '复仇者的灯火',
    type: 'main',
    requiredRoles: [
      { roleId: 'brain', count: 1 },
    ],
  },
  {
    id: 'seal_of_place',
    name: '必须守护之地',
    type: 'main',
    requiredRoles: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'cultist', count: 1 },
    ],
  },
];

// ── First Steps 支线 ──────────────────────────────────────────────
const FS_SUB: PlotDef[] = [
  {
    id: 'shadow_of_ripper',
    name: '开膛手之影',
    type: 'sub',
    requiredRoles: [
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'serial_killer', count: 1 },
    ],
  },
  {
    id: 'anxiety_rumor',
    name: '不安的传闻',
    type: 'sub',
    requiredRoles: [
      { roleId: 'conspiracy_theorist', count: 1 },
    ],
  },
  {
    id: 'worst_script',
    name: '最坏的剧本',
    type: 'sub',
    requiredRoles: [
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'friend', count: 1 },
      // 阴角 0~2，最坏情况取 2
      { roleId: 'shadow', count: 2 },
    ],
  },
];

// ── Basic Tragedy X 主线 ─────────────────────────────────────────
const BTX_MAIN: PlotDef[] = [
  {
    id: 'murder_plan',
    name: '杀人计划',
    type: 'main',
    requiredRoles: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'killer', count: 1 },
    ],
  },
  {
    id: 'sealed_item',
    name: '被封印之物',
    type: 'main',
    requiredRoles: [
      { roleId: 'cultist', count: 1 },
    ],
  },
  {
    id: 'sign_with_me',
    name: '和我签订契约吧！',
    type: 'main',
    requiredRoles: [],
  },
  {
    id: 'change_future',
    name: '改变未来计划',
    type: 'main',
    requiredRoles: [
      { roleId: 'key_person', count: 1 },
    ],
  },
  {
    id: 'giant_time_bomb_x',
    name: '不明巨型定时炸弹X',
    type: 'main',
    requiredRoles: [
      { roleId: 'time_traveler', count: 1 },
    ],
  },
];

// ── Basic Tragedy X 支线 ─────────────────────────────────────────
const BTX_SUB: PlotDef[] = [
  {
    id: 'friendship_circle',
    name: '友情同好会',
    type: 'sub',
    requiredRoles: [
      { roleId: 'friend', count: 2 },
      { roleId: 'conspiracy_theorist', count: 1 },
    ],
  },
  {
    id: 'love_scenery',
    name: '恋爱风景',
    type: 'sub',
    requiredRoles: [
      { roleId: 'loved_one', count: 1 },
      { roleId: 'lover', count: 1 },
    ],
  },
  {
    id: 'hidden_killer',
    name: '潜藏的杀人魔',
    type: 'sub',
    requiredRoles: [
      { roleId: 'serial_killer', count: 1 },
    ],
  },
  {
    id: 'anxiety_rumor',
    name: '不安的传闻',
    type: 'sub',
    requiredRoles: [],
  },
  {
    id: 'paranoia_virus',
    name: '病毒式妄想传播',
    type: 'sub',
    requiredRoles: [],
  },
  {
    id: 'causal_thread',
    name: '因果之线',
    type: 'sub',
    requiredRoles: [],
  },
  {
    id: 'random_factor_x',
    name: '随机因子X',
    type: 'sub',
    requiredRoles: [
      { roleId: 'factor_role', count: 1 },
    ],
  },
];

export const FS_PLOTS = { main: FS_MAIN, sub: FS_SUB };
export const BTX_PLOTS = { main: BTX_MAIN, sub: BTX_SUB };

/** 每套悲剧配置中合法存在的角色身份（用于猜测选项，排除 civilian） */
export const TRAGEDY_SET_ROLES: Record<'first_steps' | 'basic_tragedy', RoleType[]> = {
  first_steps: [
    'key_person',
    'killer',
    'brain',
    'serial_killer',
    'conspiracy_theorist',
    'cultist',
    'friend',
    'shadow',
  ],
  basic_tragedy: [
    'key_person',
    'killer',
    'brain',
    'serial_killer',
    'conspiracy_theorist',
    'cultist',
    'friend',
    'time_traveler',
    'witch',
    'lover',
    'loved_one',
    'factor_role',
  ],
};

export function getPlotsForSet(tragedySet: 'first_steps' | 'basic_tragedy') {
  return tragedySet === 'first_steps' ? FS_PLOTS : BTX_PLOTS;
}

/**
 * 合并多条剧情的必需身份，相同 roleId 取各剧情中的最大值（而非累加）
 */
export function mergeRequiredRoles(plots: PlotDef[]): PlotRoleRequirement[] {
  const map = new Map<RoleType, number>();
  for (const plot of plots) {
    for (const req of plot.requiredRoles) {
      const current = map.get(req.roleId) ?? 0;
      map.set(req.roleId, Math.max(current, req.count));
    }
  }
  return Array.from(map.entries()).map(([roleId, count]) => ({ roleId, count }));
}
