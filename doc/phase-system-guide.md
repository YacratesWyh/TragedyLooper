# 游戏阶段系统实现指南

> 版本：v0.3.0  
> 更新：2026-01-21

---

## 📋 概述

完整实现了惨剧轮回的7阶段游戏流程：
1. ✅ 黎明阶段（Dawn）
2. ✅ 剧作家行动（Mastermind Action）
3. ✅ 主人公行动（Protagonist Action）
4. ✅ 结算阶段（Resolution）
5. ✅ 友好能力（Ability）
6. ✅ 事件检查（Incident）
7. ⚠️ 夜晚阶段（Night）- 待实现具体效果

---

## 🎮 完整游戏流程

### 每日流程

```
黎明 → 剧作家行动 → 主人公行动 → 结算 → 友好能力 → 事件检查 → 夜晚 → (下一天)
```

### 阶段详情

#### 1. 黎明阶段（Dawn）
**自动执行**：所有"亲友"角色自动获得 +1 友好

```typescript
// engine.ts: processDawnPhase()
const friendRoles = state.privateInfo.roles.filter(r => r.role === 'friend');
// 亲友角色 +1 友好
```

**UI显示**：
- 🌅 橙黄色面板
- "☀️ 所有亲友角色自动获得 +1 友好"

---

#### 2. 剧作家行动（Mastermind Action）
**玩家操作**：剧作家打出最多 3 张行动牌，暗置

**规则**：
- 每张牌必须放在不同的目标上
- 对方看到牌背，不知道具体内容
- 可以随时撤回未结算的牌

**UI显示**：
- 🎭 红色面板
- "剧作家打出行动牌（最多3张，暗置）"
- 只有剧作家能看到"继续"按钮

---

#### 3. 主人公行动（Protagonist Action）
**玩家操作**：主人公打出最多 3 张行动牌，暗置

**规则**：
- 与剧作家行动相同
- 主人公可以看到剧作家放牌的位置（但不知道牌的类型）

**UI显示**：
- 🦸 蓝色面板
- "主人公打出行动牌（最多3张，暗置）"
- 只有主人公能看到"继续"按钮

---

#### 4. 结算阶段（Resolution）
**自动执行**：翻开所有牌并按顺序结算

**结算顺序**：
1. **移动牌**（同时结算）
   - 检查"禁止移动"牌
   - 其他移动牌生效
2. **指示物牌**（友好、不安、密谋）
   - 检查"禁止"牌，抵消对方同类型牌
   - 其他指示物牌生效
3. **角色被动能力**
4. **清空所有已打出的牌**

**UI显示**：
- ✅ 绿色面板
- "📋 翻开所有牌 → 移动 → 指示物 → 角色被动"

---

#### 5. 友好能力阶段（Ability）
**玩家操作**：使用满足友好度要求的角色能力

**能力使用条件**：
```typescript
canUseAbility(characterState, abilityIndex) {
  return (
    characterState.alive &&                             // 角色存活
    characterState.indicators.goodwill >= required &&   // 友好度足够
    usageCount < maxUsesPerLoop                        // 未达使用上限
  );
}
```

**能力类型示例**：
- 男学生（友好≥2）：移除同区域学生的1点不安
- 巫女（友好≥5，每轮1次）：揭露一名角色的身份
- 异界人（友好≥2，每轮1次）：检测同区域是否有杀手
- 异界人（友好≥3，每轮1次）：移除一名角色的所有密谋

**UI显示**：
- ✨ 紫色面板
- "达到友好度要求的角色可以使用能力"
- TODO: 添加能力使用UI

---

#### 6. 事件检查阶段（Incident）
**自动检查**：是否触发事件

**触发条件**（三个条件同时满足）：
1. 今天有事件
2. 当事人存活
3. 当事人不安 ≥ 不安极限

```typescript
canIncidentTrigger(incident, state) {
  return (
    incident.day === state.currentDay &&
    actor?.alive === true &&
    actor.anxiety >= actor.anxietyLimit
  );
}
```

**UI显示**：
- ⚠️ 橙色面板
- "检查事件触发条件（不安≥上限）"

---

#### 7. 夜晚阶段（Night）
**自动执行**：杀手/杀人狂角色能力发动

**能力效果**：
- **杀手（Killer）**：在特定条件下杀死目标
- **杀人狂（Serial Killer）**：无差别杀人

**UI显示**：
- 🌙 深蓝色面板
- "杀手/杀人狂能力发动"
- TODO: 实现具体效果

---

## 🎨 不安预警系统

### 视觉效果

#### 差1点达到极限（警告）
```typescript
anxietyDiff === 1
```

**样式**：
- 边框：橙色 (`border-orange-500`)
- 背景：橙色渐变 (`from-orange-900/40`)
- 光晕：橙色发光 (`shadow-orange-500`)
- 文字：橙色，**不闪烁**
- 图标：⚡ 警告

#### 已达极限（危险）
```typescript
anxietyDiff <= 0
```

**样式**：
- 边框：红色 (`border-red-600`)，**不闪烁**
- 背景：红色渐变 (`from-red-900/80`)
- 光晕：红色发光 (`shadow-red-600`)
- **只有"不安"文字和数值闪烁**（`animate-pulse`）
- 图标：⚠️ 危险（闪烁）

---

## 📁 核心文件

### 类型定义
```typescript
// src/types/game.ts
export type GamePhase = 
  | 'dawn'
  | 'mastermind_action'
  | 'protagonist_action'
  | 'resolution'
  | 'ability'
  | 'incident'
  | 'night'
  | 'game_over';
```

### 游戏逻辑
```typescript
// src/game/engine.ts
export function processDawnPhase(state: GameState): GameState;
export function canUseAbility(characterState, abilityIndex, characters): boolean;
export function useCharacterAbility(state, characterId, abilityIndex, targetId?): GameState;
```

### 状态管理
```typescript
// src/store/gameStore.ts
interface GameStore {
  // 阶段控制
  startDawn: () => void;
  proceedToMastermindAction: () => void;
  proceedToProtagonistAction: () => void;
  proceedToResolution: () => void;
  proceedToAbility: () => void;
  proceedToIncident: () => void;
  proceedToNight: () => void;
  nextDay: () => void;
}
```

### UI组件
```typescript
// src/components/PhaseControl.tsx
export function PhaseControl();  // 阶段控制面板

// src/components/CharacterCard.tsx
// 不安预警：差1橙色，达到红色渐变+文字闪烁
```

---

## 🎯 使用方式

### 启动游戏
```typescript
const { initializeGame } = useGameStore();
initializeGame('mastermind'); // 或 'protagonist'
```

### 阶段推进
游戏会自动显示 `PhaseControl` 组件，玩家点击"继续"按钮即可推进阶段。

### 阶段流程
1. **黎明**：自动执行 → 点击"进入剧作家行动"
2. **剧作家行动**：打牌（最多3张）→ 点击"进入主人公行动"
3. **主人公行动**：打牌（最多3张）→ 点击"开始结算"
4. **结算**：自动结算所有牌 → 点击"进入友好能力阶段"
5. **友好能力**：使用角色能力 → 点击"进入事件检查"
6. **事件检查**：自动检查事件 → 点击"进入夜晚阶段"
7. **夜晚**：杀手能力发动 → 点击"进入下一天"

### 查看不安状态
角色卡片会自动根据不安值显示预警：
- **正常**：灰色边框
- **警告**（差1）：橙色渐变边框 + ⚡ 图标
- **危险**（达到）：红色渐变边框 + 闪烁文字 + ⚠️ 图标

---

## 🔜 待实现功能

### 高优先级
1. **夜晚阶段具体逻辑**
   - 杀手角色能力判定
   - 杀人狂角色能力判定
   - 死亡结算

2. **友好能力使用UI**
   - 在能力阶段显示可用能力列表
   - 点击能力选择目标
   - 执行能力效果

3. **具体能力实现**
   - 男学生/女学生：移除不安
   - 巫女：揭露身份
   - 异界人：检测杀手、移除密谋
   - 偶像：移除不安、放置友好

### 中优先级
4. **多主人公支持**
   - 1-3名主人公玩家
   - 每轮限用牌可使用3次（每位主人公1次）

5. **游戏回放**
   - 记录每个阶段的操作
   - 重播功能

---

## 🐛 已知问题

1. ❌ 夜晚阶段只是占位，没有实际逻辑
2. ❌ 友好能力阶段无法实际使用能力（缺少UI）
3. ❌ 结算阶段立即执行，玩家看不到牌的翻开动画

---

## ✅ 已完成

- [x] 7阶段类型定义
- [x] 阶段推进逻辑
- [x] 黎明阶段（亲友+1友好）
- [x] 剧作家/主人公行动阶段（打牌）
- [x] 结算阶段（翻牌并结算）
- [x] 事件检查阶段
- [x] 能力使用条件检查（canUseAbility）
- [x] PhaseControl UI组件
- [x] 不安预警视觉效果
- [x] 角色卡片渐变警告（橙色/红色）
- [x] 不安文字闪烁效果

---

**版本**：v0.3.0-alpha  
**状态**：核心流程完成，待实现具体能力效果
