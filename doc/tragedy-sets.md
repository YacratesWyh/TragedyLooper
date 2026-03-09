# 悲剧配置 · 速查数据参考

> 数据来源：`public/assets/tl/fs/` 与 `public/assets/tl/btx/` 速查图片
>
> 用途：引擎实现剧情规则、身份能力、事件效果的规范数据源

---

## 架构：引擎如何引用不同剧本

```
TragedySet（悲剧配置）
├── plots: PlotRule[]        ← 剧情速查
├── roles: RoleDefinition[]  ← 身份速查
└── incidents: IncidentDef[] ← 事件速查

ScriptConfig（具体剧本）
├── tragedySet: 'first_steps' | 'basic_tragedy_x'
├── ruleY: PlotId       ← 从 tragedySet.plots 中选取主线
├── ruleX: PlotId[]     ← 从 tragedySet.plots 中选取支线（1~2 条）
├── roles: RoleAssignment[]  ← 从 tragedySet.roles 中选取
└── incidents: Incident[]    ← 从 tragedySet.incidents 中选取
```

当前 `types.ts` 中 `RuleY` / `RuleX` 为枚举字符串；应统一为 `PlotId` 联合类型，由悲剧配置决定可选范围。

---

## 一、First Steps（第一步）

### 1.1 剧情速查

#### 主线（RuleY）

| 剧情名称 | plotId | 必需身份 | 额外规则 |
|---------|--------|---------|---------|
| 杀人计划 | `murder_plan` | 关键人物 ×1, 杀手 ×1  幕后黑手 ×1 | — |
| 复仇者的灯火 | `light_of_avenger` | 幕后黑手 ×1 | 【败北条件:轮回结束时】幕后黑手的初始区域有 ≥2 密谋 |
| 必须守护之地 | `seal_of_place` | 关键人物 ×1 邪教徒x1| 【败北条件:轮回结束时】学校有 ≥2 密谋 |

#### 支线（RuleX）

| 剧情名称 | plotId | 必需身份 | 额外规则 |
|---------|--------|---------|---------|
| 开膛手之影 | `shadow_of_ripper` | 误导者(传谣人) ×1 连环杀手x1| — |
| 不安的传闻 | `anxiety_rumor` | 误导者(传谣人) ×1 | 【任意能力:剧作家能力阶段】在任意区域版图上放置 1 密谋（每轮回限 1 次） |
| 最坏的剧本 | `worst_script` | 误导者(传谣人) ×1 阴角 ×0~2  挚友x1| 【任意:创作脚本时】阴角可以是 2 人、1 人或 0 人 |

### 1.2 身份速查

| 身份 | roleId | 上限修正 | 友好条件 | 时机 | 能力 |
|-----|--------|--------|---------|------|------|
| 关键人物 | `key_person` | — | — | 强制:死亡时 | 主角败北，结束当前轮回 |
| 杀手 | `killer` | — | 友好无视 | 任意:回合结束(夜晚) | ① 同区关键人物密谋 ≥2 → 关键人物死亡 ② 自身密谋 ≥4 → 主角死亡 |
| 幕后黑手 | `brain` | — | 友好无视 | 任意:剧作家能力阶段 | 同区 1 名角色或所在版图放置 1 密谋 |
| 邪教徒 | `cultist` | — | 绝对友好无视 | 任意:行动结算阶段 | 同区角色/版图上可无视「禁止密谋」效果 |
| 误导者(传谣人) | `conspiracy_theorist` | 不安上限 +1 | — | 任意:剧作家能力阶段 | 同区 1 名角色放置 1 不安 |
| 连环杀手 | `serial_killer` | — | — | 强制:回合结束(夜晚) | 同区仅 1 名角色 → 该角色死亡 |
| 阴角 | `shadow` | — | 友好无视 | — | （无主动能力，仅作为剧情身份存在） |
| 挚友 | `friend` | 不安上限 +2 | — | 败北条件:轮回结束时 | 死亡时身份公开；【强制:轮回开始时】身份已公开 → +1 友好 |

### 1.3 事件速查

| 事件名称 | incidentId | 效果 |
|---------|------------|------|
| 谋杀案 | `murder` | 令犯人以外的 1 名同区角色死亡 |
| 不安扩散 | `anxiety_spread` | 任意 1 名角色 +2 不安，另 1 名角色 +1 密谋 |
| 自杀 | `suicide` | 犯人死亡 |
| 医院的事件 | `hospital_incident` | 医院密谋 ≥1 → 医院全员死亡；医院密谋 ≥2 → 主角死亡 |
| 远距离杀人 | `faraway_murder` | 令 1 名密谋 ≥2 的角色死亡 |
| 行踪不明 | `missing_person` | 犯人移至任意区域，该区域版图 +1 密谋 |
| 流传 | `gossip` | 移除 1 名角色 2 友好，给另 1 名角色 +2 友好 |

---

## 二、Basic Tragedy X（基本悲剧 X）

### 2.1 剧情速查

#### 主线（RuleY）

| 剧情名称 | plotId | 必需身份 | 额外规则 |
|---------|--------|---------|---------|
| 杀人计划 | `murder_plan` | 关键人物 ×1, 杀手 ×1 | — |
| 被封印之物 | `sealed_item` | 邪教徒 ×1 | 【败北条件:轮回结束时】神社密谋 ≥2 |
| 和我签订契约吧！ | `sign_with_me` | — | 【强制:制作脚本时】关键人物必然是少女 |
| 改变未来计划 | `change_future` | 关键人物 ×1 | 【败北条件:轮回结束时】关键人物身上密谋 ≥2 |
| 不明巨型定时炸弹X | `giant_time_bomb_x` | 时间旅行者 ×1 | 【败北条件:轮回结束时】本轮回中发生过蝴蝶效应事件 |

#### 支线（RuleX）

| 剧情名称 | plotId | 必需身份 | 额外规则 |
|---------|--------|---------|---------|
| 友情同好会 | `friendship_circle` | 挚友 ×2, 误导者 ×1 | — |
| 恋爱风景 | `love_scenery` | 病娇恋人 ×1, 恋人 ×1 | — |
| 潜藏的杀人魔 | `hidden_killer` | 连环杀手 ×1 | — |
| 不安的传闻 | `anxiety_rumor` | — | 【任意能力:剧作家能力阶段】任意区域版图 +1 密谋（每轮回限 1 次） |
| 病毒式妄想传播 | `paranoia_virus` | — | 【强制:常时】路人身上不安 ≥3 时，身份变为连环杀手 |
| 因果之线 | `causal_thread` | — | 【强制:轮回开始时】上一轮回结束时有友好的角色，全部 +2 不安 |
| 随机因子X | `random_factor_x` | 因子 ×1 | — |

### 2.2 身份速查

| 身份 | roleId | 上限修正 | 友好条件 | 时机 | 能力 |
|-----|--------|--------|---------|------|------|
| 关键人物 | `key_person` | — | — | 强制:死亡时 | 主角败北，结束当前轮回 |
| 杀手 | `killer` | — | 友好无视 | 任意:回合结束(夜晚) | ① 同区关键人物密谋 ≥2 → 关键人物死亡 ② 自身密谋 ≥4 → 主角死亡 |
| 幕后黑手 | `brain` | — | 友好无视 | 任意:剧作家能力阶段 | 同区 1 名角色或所在版图放置 1 密谋 |
| 邪教徒 | `cultist` | — | 绝对友好无视 | 任意:行动结算阶段 | 同区角色/版图上可无视「禁止密谋」效果 |
| 时间旅行者 | `time_traveler` | — | — | 多项 | ① 【强制:常时】不会死亡 ② 【强制:行动结算】无视友好禁止 ③ 【任意:最终日回合结束】友好 ≤2 → 主角败北 |
| 女巫 | `witch` | — | 绝对友好无视 | — | （无主动能力，被剧情规则引用） |
| 挚友 | `friend` | 不安上限 +2 | — | 败北条件:轮回结束时 | 死亡时身份公开；【强制:轮回开始时】身份已公开 → +1 友好 |
| 误导者(传谣人) | `conspiracy_theorist` | 不安上限 +1 | — | 任意:剧作家能力阶段 | 同区 1 名角色 +1 不安 |
| 恋人 | `lover` | — | — | 强制:恋人死亡时 | 给此角色放置 6 不安 |
| 病娇恋人 | `loved_one` | — | — | 任意:回合结束(夜晚) | 自身密谋 ≥1 且不安 ≥3 → 主角死亡 |
| 连环杀手 | `serial_killer` | — | — | 强制:回合结束(夜晚) | 同区仅 1 名角色 → 该角色死亡 |
| 因子 | `factor_role` | — | 友好无视 | 强制:常时 | ① 学校密谋 ≥2 → 获得误导者能力 ② 都市密谋 ≥2 → 获得关键人物能力（身份不变） |

### 2.3 事件速查

> BTX 包含 FS 全部 7 种事件 + 2 种新增事件

| 事件名称 | incidentId | 效果 |
|---------|------------|------|
| 谋杀案 | `murder` | 令犯人以外的 1 名同区角色死亡 |
| 不安扩散 | `anxiety_spread` | 任意 1 名角色 +2 不安，另 1 名角色 +1 密谋 |
| **邪气污染** | `foul_play` | 神社 +2 密谋 |
| 自杀 | `suicide` | 犯人死亡 |
| 医院的事件 | `hospital_incident` | 医院密谋 ≥1 → 医院全员死亡；医院密谋 ≥2 → 主角死亡 |
| 远距离杀人 | `faraway_murder` | 令 1 名密谋 ≥2 的角色死亡 |
| 行踪不明 | `missing_person` | 犯人移至任意区域，该区域版图 +1 密谋 |
| 流传 | `gossip` | 移除 1 名角色 2 友好，给另 1 名角色 +2 友好 |
| **蝴蝶效应** | `butterfly_effect` | 给犯人同区任意 1 名角色放置 1 枚任意标记（友好/不安/密谋） |

---

## 三、差异对比

### 3.1 剧情差异

| 特征 | First Steps | Basic Tragedy X |
|------|-------------|-----------------|
| 主线数 | 3 | 5 |
| 支线数 | 3 | 7 |
| 支线上限 | 1 条 | 1~2 条 |
| 特有主线 | 复仇者的灯火, 必须守护之地 | 被封印之物, 和我签订契约吧, 改变未来计划, 不明巨型定时炸弹X |
| 共有主线 | 杀人计划 | 杀人计划 |
| 特有支线 | 开膛手之影, 最坏的剧本 | 友情同好会, 恋爱风景, 潜藏的杀人魔, 病毒式妄想传播, 因果之线, 随机因子X |
| 共有支线 | 不安的传闻 | 不安的传闻 |

### 3.2 身份差异

| 特征 | First Steps | Basic Tragedy X |
|------|-------------|-----------------|
| 身份总数 | 8 | 12 |
| 特有身份 | 阴角 | 时间旅行者, 女巫, 恋人, 病娇恋人, 因子 |
| 共有身份 | 关键人物, 杀手, 幕后黑手, 邪教徒, 误导者, 连环杀手, 挚友 | 同左 |

### 3.3 事件差异

| 特征 | First Steps | Basic Tragedy X |
|------|-------------|-----------------|
| 事件总数 | 7 | 9 |
| BTX 新增 | — | 邪气污染, 蝴蝶效应 |

---

## 四、当前类型系统缺口

### 4.1 PlotId 类型不完整

当前 `types.ts`：

```ts
type RuleY = 'murder_plan' | 'light_of_avenger' | 'change_of_future';
type RuleX = 'circle_of_friends' | 'a_secret_affair' | 'paranoia_virus';
```

应扩展为：

```ts
type PlotId =
  // ── FS + BTX 共有 ──
  | 'murder_plan'          // 杀人计划（主线）
  | 'anxiety_rumor'        // 不安的传闻（支线）
  // ── FS 专有 ──
  | 'light_of_avenger'     // 复仇者的灯火（主线）
  | 'seal_of_place'        // 必须守护之地（主线）
  | 'shadow_of_ripper'     // 开膛手之影（支线）
  | 'worst_script'         // 最坏的剧本（支线）
  // ── BTX 专有 ──
  | 'sealed_item'          // 被封印之物（主线）
  | 'sign_with_me'         // 和我签订契约吧！（主线）
  | 'change_future'        // 改变未来计划（主线）
  | 'giant_time_bomb_x'    // 不明巨型定时炸弹X（主线）
  | 'friendship_circle'    // 友情同好会（支线）
  | 'love_scenery'         // 恋爱风景（支线）
  | 'hidden_killer'        // 潜藏的杀人魔（支线）
  | 'paranoia_virus'       // 病毒式妄想传播（支线）
  | 'causal_thread'        // 因果之线（支线）
  | 'random_factor_x';     // 随机因子X（支线）
```

### 4.2 RoleType 缺少 shadow（阴角）

```ts
// 需新增
| 'shadow'  // 阴角（FS 专有）
```

### 4.3 引擎未实现的剧情规则

| plotId | 败北/额外条件 | 当前状态 |
|--------|-------------|---------|
| `murder_plan` | 关键人物死亡 | ✅ 已实现 |
| `light_of_avenger` | 幕后黑手初始区域密谋 ≥2 | ❌ 未实现 |
| `seal_of_place` | 学校密谋 ≥2 | ❌ 未实现 |
| `sealed_item` | 神社密谋 ≥2 | ❌ 未实现 |
| `sign_with_me` | 关键人物必须是少女（脚本约束） | ❌ 未实现 |
| `change_future` | 关键人物密谋 ≥2 | ❌ 未实现 |
| `giant_time_bomb_x` | 本轮回发生过蝴蝶效应 | ❌ 未实现 |
| `anxiety_rumor` | 剧作家能力阶段任意版图 +1 密谋 | ❌ 未实现 |
| `paranoia_virus` | 路人不安 ≥3 变连环杀手 | ❌ 未实现 |
| `causal_thread` | 轮回开始时上一轮有友好的角色 +2 不安 | ❌ 未实现 |

### 4.4 引擎未实现的身份能力

| roleId | 能力 | 当前状态 |
|--------|------|---------|
| `killer` | 同区关键人物密谋 ≥2 / 自身密谋 ≥4 | ✅ 部分（仅关键人物条件） |
| `brain` | 同区放置密谋 | ❌ 占位 |
| `cultist` | 无视禁止密谋 | ❌ 占位 |
| `conspiracy_theorist` | 同区角色 +1 不安 | ❌ 占位 |
| `serial_killer` | 同区独处杀人 | ✅ 已实现 |
| `friend` | 轮回开始 +1 友好 / 死亡公开 | ✅ 部分（+1 友好已实现，死亡公开未实现） |
| `time_traveler` | 不死 / 无视友好禁止 / 最终日友好 ≤2 败北 | ❌ 未实现 |
| `lover` | 恋人死亡时 +6 不安 | ❌ 未实现 |
| `loved_one` | 密谋 ≥1 且不安 ≥3 主角死亡 | ❌ 未实现 |
| `factor_role` | 条件获得其他身份能力 | ❌ 未实现 |
| `witch` | 被剧情引用（无主动能力） | ❌ 未实现 |
| `shadow` | 无主动能力 | ❌ 未定义 |

### 4.5 引擎未实现的事件

| incidentId | 当前状态 |
|------------|---------|
| `murder` | ✅ 已实现 |
| `suicide` | ✅ 已实现（犯人死亡） |
| `hospital_incident` | ✅ 已实现 |
| `anxiety_spread` | ❌ 未实现 |
| `faraway_murder` | ❌ 未实现 |
| `missing_person` | ❌ 未实现 |
| `gossip` | ❌ 未实现 |
| `foul_play` | ❌ 未实现 |
| `butterfly_effect` | ❌ 未实现 |

---

## 五、推荐引擎架构

```ts
// 悲剧配置注册表
interface TragedySet {
  id: 'first_steps' | 'basic_tragedy_x';
  name: string;
  plots: PlotRule[];
  roles: RoleDefinition[];
  incidents: IncidentDefinition[];
}

// 剧情规则
interface PlotRule {
  id: PlotId;
  name: string;
  type: 'main' | 'sub';
  requiredRoles: Array<{ roleId: RoleType; count: number }>;
  extraRules: ExtraRule[];
}

// 额外规则
interface ExtraRule {
  timing: 'loop_end' | 'always' | 'loop_start' | 'script_creation'
        | 'mastermind_ability';
  type: 'lose_condition' | 'mandatory' | 'optional_ability';
  condition?: string;   // 机器可读条件
  description: string;  // 人类可读描述
}

// 身份定义
interface RoleDefinition {
  id: RoleType;
  name: string;
  anxietyLimitModifier: number;    // 不安上限修正
  goodwillCondition: 'none' | 'ignore' | 'always_ignore';
  abilities: RoleAbility[];
}

interface RoleAbility {
  timing: GamePhase | 'death' | 'always' | 'loop_start' | 'loop_end'
        | 'final_day_night';
  trigger: 'mandatory' | 'optional' | 'lose_condition';
  condition?: string;
  effect: string;
}

// 事件定义
interface IncidentDefinition {
  id: IncidentType;
  name: string;
  effect: string;
  requiresChoice: boolean;   // 剧作家是否需要选择目标
}
```

引擎加载流程：

```
1. 根据 ScriptConfig.tragedySet 加载对应 TragedySet
2. 验证 ruleY/ruleX 在该 set 的 plots 中存在
3. 验证 roles 满足 plots 的 requiredRoles
4. 运行时根据 phase 查表执行 role.abilities 和 plot.extraRules
```
