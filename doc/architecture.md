# 惨剧轮回 - 系统架构文档

> 版本：0.2.0-alpha  
> 最后更新：2026-01-21  
> 状态：核心卡牌系统完成

---

## 1. 架构概览

### 1.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | Next.js 14+ (App Router) | React 服务端组件 + 客户端交互 |
| 语言 | TypeScript | 强类型，禁止 any |
| 状态管理 | Zustand | 轻量级不可变状态 |
| 样式 | Tailwind CSS | 原子化 CSS |
| 动画 | Framer Motion | 声明式动画 |

### 1.2 目录结构

```
src/
├── app/                    # Next.js 页面
│   ├── page.tsx           # 游戏主界面
│   └── layout.tsx         # 全局布局
├── components/            # React 组件
│   ├── GameBoard.tsx      # 版图组件
│   ├── LocationZone.tsx   # 区域组件
│   ├── CharacterCard.tsx  # 角色卡片（支持能力切换）
│   ├── ActionCard.tsx     # 行动牌
│   ├── ActionHand.tsx     # 手牌区
│   ├── PlacedCards.tsx    # 已放置的牌显示
│   ├── GameInfo.tsx       # 游戏信息面板
│   ├── DeckReference.tsx  # 牌组参考面板（右侧）
│   ├── RulesReference.tsx # 规则速查面板（左侧）
│   ├── IndicatorDisplay.tsx # 指示物显示
│   └── RoleSelector.tsx   # 角色选择
├── game/                  # 游戏核心逻辑
│   ├── engine.ts          # 游戏引擎
│   └── scripts/           # 剧本数据
│       └── fs-01.ts       # FS-01 新手模组
├── store/                 # 状态管理
│   └── gameStore.ts       # Zustand 全局状态
├── types/                 # TypeScript 类型
│   └── game.ts            # 游戏类型定义 + 牌组管理函数
└── lib/                   # 工具函数
    └── utils.ts           # 通用工具（cn等）
```

---

## 2. 核心数据结构

### 2.1 行动牌系统

```typescript
/** 玩家牌组 - 追踪卡牌使用状态 */
interface PlayerDeck {
  allCards: ActionCard[];           // 所有卡牌（10张剧作家/8张主人公）
  usedToday: Set<string>;           // 今天已使用的卡牌ID
  usedThisLoop: Set<string>;        // 本轮已使用的"once per loop"卡牌ID
}

/** 行动牌 */
interface ActionCard {
  id: string;                       // 唯一ID（如 'mm-diag'）
  type: ActionCardType;             // 'movement' | 'goodwill' | 'anxiety' | 'intrigue'
  owner: PlayerRole;                // 'mastermind' | 'protagonist'
  
  // 移动牌特有
  movementType?: 'horizontal' | 'vertical' | 'diagonal' | 'forbid';
  
  // 指示物牌特有
  value?: number;                   // +1, +2, -1
  isForbidden?: boolean;            // 禁止牌标记
  
  // 限制
  oncePerLoop?: boolean;            // 是否每轮限一次
}

/** 已放置的牌 */
interface PlayedCard {
  id: string;                       // 唯一ID（生成时随机）
  card: ActionCard;                 // 引用的卡牌
  owner: PlayerRole;                // 所有者
  targetCharacterId?: CharacterId;  // 目标角色
  targetLocation?: LocationType;    // 目标地点
}
```

### 2.2 游戏状态

```typescript
interface GameState {
  currentLoop: number;
  currentDay: number;
  characters: CharacterState[];
  boardIntrigue: Record<LocationType, number>;
  privateInfo: PrivateInfo | null;
  publicInfo: PublicInfo;
  phase: GamePhase;
  cardsPlayedToday: number;
}

interface GameStore {
  gameState: GameState | null;
  playerRole: PlayerRole;
  
  // 牌组状态
  mastermindDeck: PlayerDeck;
  protagonistDeck: PlayerDeck;
  
  // 当前打出的牌（暗置，对方看不到内容）
  currentMastermindCards: PlayedCard[];
  currentProtagonistCards: PlayedCard[];
  
  // 操作
  playCard: (card: PlayedCard) => void;
  retreatCard: (cardId: string) => void;
  resolveDay: () => void;
  endLoop: () => void;
  // ...
}
```

---

## 3. 已实现功能

### 3.1 核心系统 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| **卡牌系统** | ✅ 完成 | |
| - 唯一卡牌追踪 | ✅ | 每张牌只有一张，用ID标识 |
| - 使用状态追踪 | ✅ | usedToday + usedThisLoop |
| - 每轮限用 | ✅ | oncePerLoop 标记 |
| - 禁止牌机制 | ✅ | isForbidden + 结算时抵消 |
| - 撤回功能 | ✅ | retreatCard() |
| **放置系统** | ✅ 完成 | |
| - 暗置牌 | ✅ | 对方只看到有牌，不知道内容 |
| - 目标占用检查 | ✅ | 每个目标最多一张自己的牌 |
| - 已放置牌显示 | ✅ | PlacedCards 组件 |
| **UI组件** | ✅ 完成 | |
| - 牌组参考面板 | ✅ | DeckReference（右侧） |
| - 规则速查面板 | ✅ | RulesReference（左侧） |
| - 角色能力切换 | ✅ | 点击角色卡片切换显示 |
| - 事件显示 | ✅ | 当前剧本事件直接显示，其他折叠 |

### 3.2 游戏逻辑 🔶

| 功能 | 状态 | 说明 |
|------|------|------|
| 游戏初始化 | ✅ | initializeGameState |
| 移动处理 | ✅ | applyMovement |
| 指示物变更 | ✅ | applyIndicatorChange |
| 事件检查 | ✅ | canIncidentTrigger |
| 事件处理 | 🔶 | 仅 murder/suicide |
| 轮回重置 | ✅ | resetLoop |
| 天数推进 | ✅ | advanceDay |
| **结算系统** | 🔶 部分 | |
| - 移动牌结算 | ✅ | 优先结算 |
| - 禁止牌抵消 | ✅ | 同目标同类型抵消 |
| - 指示物牌结算 | ✅ | 应用数值变化 |
| - 地点密谋 | ✅ | 只有密谋牌生效 |
| **缺失功能** | ❌ | |
| 黎明阶段 | ❌ | 亲友+1友好 |
| 夜晚阶段 | ❌ | 杀手/杀人狂能力 |
| 角色能力执行 | ❌ | 无执行逻辑 |
| 最终决战 | ❌ | 身份推理系统 |

---

## 4. 卡牌系统实现细节

### 4.1 卡牌定义

**剧作家牌组（10张）**：
- 移动：斜向*, 禁止*, 横向, 纵向
- 友好：禁止友好
- 不安：不安+1 (×2), 禁止不安
- 密谋：密谋+1, 密谋+2*

**主人公牌组（8张）**：
- 移动：禁止*, 横向, 纵向
- 友好：友好+1, 友好+2*
- 不安：不安+1, 不安-1*
- 密谋：禁止密谋

*标记 = 每轮限一次

### 4.2 多主人公规则

- 游戏支持 1-3 名主人公玩家
- **每个主人公玩家各有一套完整牌组**
- "每轮限一次"的牌，主人公方最多可打出3次

### 4.3 禁止牌结算逻辑

```typescript
// resolveDay() 中的禁止牌处理
const allCardsForTarget = [...myCards, ...oppCards];

// 检查是否有禁止牌
const hasForbiddenGoodwill = allCardsForTarget.some(
  c => c.card.type === 'goodwill' && c.card.isForbidden
);

if (hasForbiddenGoodwill) {
  // 抵消所有友好牌（双方）
  allCardsForTarget
    .filter(c => c.card.type === 'goodwill' && !c.card.isForbidden)
    .forEach(/* 忽略 */);
}
```

### 4.4 交互流程

```
用户流程：
1. 点击手牌 → selectedCardId 设置
2. 点击角色/地点 → 调用 playCard()
3. 检查目标是否已占用
4. 创建 PlayedCard 并添加到 currentCards
5. 标记 usedToday / usedThisLoop

结算流程（点击"结算本日"）：
1. 移动牌先结算
2. 禁止牌抵消对应类型
3. 指示物牌应用数值
4. 重置 usedToday
```

---

## 5. UI/UX 设计

### 5.1 信息面板

```
[规则速查]  <────────────────────> [牌组参考]
左侧                                  右侧

规则速查内容：
- 身份能力（可折叠）
- 本剧本事件（直接显示）
- 角色能力（可折叠）
- 手牌列表（可折叠）
- 其他事件（整体折叠，灰色）

牌组参考内容：
- 所有卡牌状态
- usedToday 标记
- usedThisLoop 标记
- 按类型分组
```

### 5.2 角色卡片交互

```
默认状态：显示头像 + "点击查看能力"
点击后：显示能力文字 + "点击返回"

特殊规则：
- 选中牌后点击角色 → 只放牌，不切换显示
- 未选牌时点击角色 → 切换能力显示
```

### 5.3 已放置牌显示

```
PlacedCards 组件：
- 自己的牌：显示正面 + 撤回按钮
- 对方的牌：显示牌背（面朝下）
- 放置位置：角色卡片右上角 / 地点名称旁
```

---

## 6. 已知问题与技术债务

### 6.1 高优先级 (P0)

✅ ~~问题 #1: 函数签名不匹配~~ - 已修复

### 6.2 中优先级 (P1)

| 问题 | 说明 | 修复方案 |
|------|------|----------|
| 引擎与剧本紧耦合 | 硬编码 FS01_CHARACTERS | 移入 PublicInfo |
| 多剧本支持缺失 | 只有 FS-01 | 创建剧本加载器 |
| 多主人公未实现 | 当前只有单主人公测试 | 扩展 GameStore |

### 6.3 功能缺失 (P2)

| 缺失功能 | 优先级 | 说明 |
|----------|--------|------|
| 黎明阶段 | 高 | 亲友+1友好 |
| 夜晚阶段 | 高 | 杀手/杀人狂能力 |
| 角色能力执行 | 高 | 友好能力UI+逻辑 |
| 最终决战 | 中 | 身份推理系统 |
| 多人联机 | 低 | WebSocket + 服务端 |

---

## 7. 下一步开发计划

### Phase 1: 完善单人游戏循环

1. ✅ ~~卡牌系统完善~~
2. ✅ ~~禁止牌机制~~
3. ⏭️ 实现黎明阶段
4. ⏭️ 实现夜晚阶段
5. ⏭️ 实现角色能力执行

### Phase 2: 多主人公支持

1. 扩展 GameStore 支持多个 protagonistDeck
2. UI 支持选择当前主人公玩家
3. 测试 3 人主人公场景

### Phase 3: 完整游戏流程

1. 实现最终决战
2. 实现胜负判定
3. 添加更多剧本

### Phase 4: 多人联机

1. WebSocket 服务端
2. 状态同步
3. 信息安全（PrivateInfo 过滤）

---

## 8. 代码规范总结

### 8.1 命名规范

- 组件文件：PascalCase (`GameBoard.tsx`)
- 函数/变量：camelCase (`playCard`, `currentLoop`)
- 常量：SCREAMING_SNAKE_CASE (`MAX_LOOPS`)
- 类型/接口：PascalCase (`GameState`, `ActionCard`)

### 8.2 类型规范

- 禁止 `any`，使用 `unknown` 或联合类型
- 明确区分 `null` 和 `undefined`
- 使用 Result 模式处理错误

### 8.3 状态管理

- Zustand 管理全局状态
- 保持不可变性（structuredClone 或扩展运算符）
- 派生状态用 selector

---

## 9. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 0.2.0-alpha | 2026-01-21 | 卡牌系统完成，UI优化 |
| 0.1.0-alpha | 2026-01-21 | 初始架构审查 |

---

**当前状态**: 核心卡牌系统已完成，可开始补全游戏流程逻辑。
