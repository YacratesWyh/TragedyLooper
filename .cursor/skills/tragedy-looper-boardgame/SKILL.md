---
name: tragedy-looper-boardgame
description: 惨剧轮回 (Tragedy Looper) 桌游的核心规则与现有实现参考。当开发游戏引擎逻辑、新增剧本、调试阶段结算、或实现角色能力时使用此技能。
---

# 惨剧轮回 (Tragedy Looper) 规则与实现

> 非对称推理桌游 | 1名剧作家 vs 1-3名主人公 | 时间轮回机制

## 1. 核心机制

- **剧作家 (Mastermind)**: 知道所有隐藏信息（角色身份、事件当事人），目标是让惨剧发生
- **主人公 (Protagonist)**: 通过观察和推理，阻止惨剧发生，跨轮回积累线索
- **时间轮回**: 惨剧发生后重置状态进入下一轮回，主人公保留记忆

## 2. 关键文件引用

| 文件 | 职责 |
|------|------|
| `src/types/game.ts` | 核心类型: `GameState`, `ActionCard`, `Character`, `PlayerDeck` |
| `src/game/engine.ts` | 引擎: 结算、移动叠加、事件检查、阶段处理 |
| `src/game/scripts/fs-01.ts` | 剧本数据 + `ScriptTemplate` 接口 + `ALL_CHARACTERS` 角色库 |
| `src/store/gameStore.ts` | Zustand 状态管理: 牌组、阶段控制、历史回放 |

## 3. 每日阶段流程

```
dawn → mastermind_action → protagonist_action → resolution
     → mastermind_ability → protagonist_ability → incident → night
```

| 阶段 | 操作 |
|------|------|
| `dawn` | 亲友角色自动+1友好 |
| `mastermind_action` | 剧作家暗放最多3张牌 |
| `protagonist_action` | 主人公暗放最多3张牌 |
| `resolution` | 翻开所有牌，按优先级结算 |
| `mastermind_ability` | 剧作家被动能力（身份相关） |
| `protagonist_ability` | 主人公使用友好能力（需达到友好度要求） |
| `incident` | 检查事件触发条件 |
| `night` | 杀手/杀人狂夜间能力 |

## 4. 结算优先级

结算在 `processResolution()` 中执行，严格按此顺序：

1. **移动牌** — 同时结算，方向叠加（模3群: H+V=D, D+H=V, D+V=H）
2. **禁止移动牌** — 抵消对应角色的所有移动
3. **指示物牌** (友好/不安/密谋) — 禁止牌抵消对方同类型牌
4. **地点密谋** — 密谋牌打在地点上时增加版图密谋指示物

## 5. 事件触发三条件

```typescript
function canIncidentTrigger(incident, state): boolean {
  return (
    incident.day === state.currentDay &&     // 当天有事件
    actor.alive === true &&                  // 当事人存活
    actor.anxiety >= character.anxietyLimit   // 不安达上限
  );
}
```

三个条件缺一不可。主人公的策略：降低不安、移走当事人、或消灭当事人。

## 6. 牌组结构

### 剧作家 (10张红牌)

| 牌 | 效果 | 限制 |
|----|------|------|
| 斜向移动 | 对角移动 | 每轮回限1次 |
| 横向移动 | 左右移动 | - |
| 纵向移动 | 上下移动 | - |
| 禁止友好 | 抵消友好 | - |
| 不安+1 x2 | 加不安 | - |
| 不安-1 | 减不安 | - |
| 禁止不安 | 抵消不安 | - |
| 密谋+1 | 加密谋 | - |
| 密谋+2 | 加密谋 | 每轮回限1次 |

### 主人公 (22张蓝牌 = 3套x7 + 禁止密谋x1)

每套7张: 禁止移动*, 横向, 纵向, 友好+1, 友好+2*, 不安+1, 不安-1*
(带*为每轮回限1次，用1张少1张)

## 7. 版图

2x2 网格，4个地点：

```
医院(0,0)  神社(1,0)
都市(0,1)  学校(1,1)
```

移动方向: 横向=翻转X, 纵向=翻转Y, 斜向=翻转XY

## 8. 剧作家信息公开规则

剧作家在任何阶段触发效果时，必须公开**结果**和**发生阶段**，但**不得说明原因**，原因由主人公自行推理。

| 必须说明 | 禁止说明 | 示例 |
|----------|----------|------|
| 发生了什么（结果） | 为什么发生（原因） | ✅ "第⑧步·夜晚：山田死亡" |
| 发生在哪个阶段 | 哪个身份/能力造成的 | ❌ "山田被杀手杀了" |

**规则要点：**
- 说阶段编号（第⑤步、第⑦步等），让主人公能定位到具体步骤
- 角色死亡、指示物变化等所有状态改变均须当场公告结果
- 若多个效果同一阶段连续触发，逐条公告，不合并
- 主人公可在任何时候质询"这发生在第几步"，剧作家必须如实回答

## 9. 胜利条件

- **主人公胜**: 在最终轮回存活过所有天数
- **剧作家胜**: 所有轮回中惨剧均发生（轮回次数耗尽）

## 10. 剧本扩展规范

剧本文件存放在 `src/game/scripts/` 下：

```
src/game/scripts/
├── fs-01.ts      # 现有: First Steps (FS) 入门剧本集
├── fs/           # FS 系列其他剧本（预留）
├── bt/           # Basic Tragedy (BT) 标准剧本集（预留）
└── [缩写]/       # 其他扩展包
```

每个剧本必须导出 `ScriptTemplate` 接口:

```typescript
interface ScriptTemplate {
  id: string;                    // 如 'bt-03'
  name: string;                  // 中文名
  nameEn?: string;               // 英文名
  tragedySet: 'first_steps' | 'basic_tragedy';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  loops: string;                 // "2~3" 或 "4"
  days: number;
  mainPlot: string;
  subPlot?: string;
  characters: CharacterId[];
  incidents: Array<{ day: number; type: IncidentType }>;
}
```

角色固有属性（不安限度、初始位置、禁行区域、能力）统一在 `ALL_CHARACTERS` 中定义，剧本只引用 `CharacterId`。

## 11. 角色能力系统

每个角色可有 0~N 个能力，由友好度解锁：

```typescript
interface CharacterAbility {
  goodwillRequired: number;       // 需要的友好度
  maxUsesPerLoop: number | null;  // null = 无限
  description: string;
  effect: string;
}
```

能力使用检查: `canUseAbility()` → 存活 + 友好度足够 + 未达使用上限
