# Tragedy Looper Web 开发指南

## 1. 项目概览
本项目为《惨剧轮回》(Tragedy Looper) 的网页版实现，采用 Next.js + TypeScript + Tailwind CSS 技术栈。

**核心机制**：
- **非对称推理**：1 名剧作家（Mastermind）vs 1-3 名主人公（Protagonists）
- **时间轮回**：游戏包含多个轮回（Loop），每个轮回有数天（Day）
- **隐藏信息**：剧作家知道所有角色身份和事件当事人，主人公需要通过推理发现真相

## 2. 构建与测试命令

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 单个文件测试
npx eslint src/app/page.tsx --fix

# 类型检查
npx tsc --noEmit
```

## 3. 代码规范

### 3.1 导入顺序
```typescript
// 1. React 与 Next.js
import { useState, useEffect } from 'react';

// 2. 第三方库
import { motion } from 'framer-motion';
import { create } from 'zustand';

// 3. 内部类型
import type { Game, Character } from '@/types/game';

// 4. 内部组件
import { GameBoard } from '@/components/GameBoard';

// 5. 样式
import { cn } from '@/lib/utils';
import '@/styles/globals.css';
```

### 3.2 命名约定
- **组件文件**：PascalCase (`GameBoard.tsx`, `CharacterCard.tsx`)
- **逻辑/类型**：camelCase (`gameState.ts`, `calculateAnxiety.ts`)
- **常量**：SCREAMING_SNAKE_CASE (`MAX_LOOPS`, `LOCATIONS`)
- **接口/类型**：PascalCase (`GameState`, `ActionCard`)

### 3.3 类型规范
- **强制 TypeScript**：禁止使用 `any`，使用 `unknown` 或联合类型
- **不可变更新**：使用 `immer` 或结构化更新
- **空值处理**：明确区分 `null` 和 `undefined`

```typescript
// ✅ 正确
type CardType = 'movement' | 'paranoia' | 'goodwill' | 'intrigue';

// ❌ 错误
const card: any = getCard();
```

### 3.4 错误处理
```typescript
// 使用 Result 模式而非抛出异常
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

function resolveAction(action: Action): Result<ResolvedAction, string> {
  if (!isValid(action)) {
    return { success: false, error: '无效的行动牌' };
  }
  return { success: true, data: action };
}
```

### 3.5 状态管理
使用 Zustand 管理全局游戏状态，保持不可变性：

```typescript
interface GameStore {
  // 公开状态（所有玩家可见）
  currentLoop: number;
  currentDay: number;
  locations: Location[];

  // 私有状态（仅剧作家可见）
  privateInfo: PrivateInfo;

  // 动作
  playCard: (card: ActionCard) => void;
  startNewLoop: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  currentLoop: 1,
  // ...
}));
```

## 4. 游戏逻辑实现规范

### 4.1 隐藏信息安全
**严禁在客户端暴露剧作家的私有信息**：

```typescript
// ✅ 正确：区分可见性
const getVisibleState = (state: GameState, playerRole: PlayerRole) => {
  if (playerRole === 'mastermind') {
    return { ...state, privateInfo: state.privateInfo };
  }
  // 对主人公隐藏私有信息
  return { ...state, privateInfo: null };
};
```

### 4.2 行动牌结算顺序
严格按照以下顺序结算：
1. **移动牌**（同时结算，无优先级）
2. **指示物牌**（友好、不安、密谋）
3. **角色被动能力**
4. **事件检查**

### 4.3 事件触发条件
事件发生必须满足以下三个条件：
```typescript
function canIncidentTrigger(incident: Incident, state: GameState): boolean {
  const actor = state.characters.find(c => c.id === incident.actorId);
  return (
    incident.day === state.currentDay &&          // I. 今天有事件
    actor?.alive === true &&                        // II. 当事人存活
    actor.anxiety >= actor.anxietyLimit            // III. 达到不安限度
  );
}
```

### 4.4 FS-01 模组特性
- **新手模组**：主人公不能通过推理身份获胜
- **主线**：谋杀计划（Rule Y）
- **支线**：隐藏角色（Rule X）
- **角色配置**：学生、巫女、医生、异界人

## 5. 组件开发指南

### 5.1 Tailwind CSS 使用
```tsx
<div className="flex items-center justify-center gap-2 rounded-lg bg-blue-500 p-4">
  <span className="text-white font-bold">角色名</span>
</div>
```

### 5.2 动画效果
```tsx
import { motion, AnimatePresence } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.9 }}
>
  <CharacterCard />
</motion.div>
```

## 6. 文件结构
```
src/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 主页面
│   └── layout.tsx         # 全局布局
├── components/            # React 组件
│   ├── GameBoard.tsx      # 游戏版图
│   ├── CharacterCard.tsx   # 角色卡片
│   └── ActionCard.tsx     # 行动牌
├── game/                 # 游戏逻辑
│   ├── engine.ts          # 核心游戏引擎
│   ├── rules.ts           # 规则判定
│   └── scripts/          # 剧本数据
│       └── fs-01.ts      # FS-01 脚本
├── store/               # Zustand 状态管理
│   └── gameStore.ts
├── types/               # TypeScript 类型定义
│   └── game.ts
└── lib/                # 工具函数
    └── utils.ts
```

## 7. 协作指南

### 7.1 代码审查
- 所有 `git commit` 前运行 `npm run lint` 和类型检查
- PR 必须通过 CI 检查

### 7.2 与其他代理协作
- **UI/UX 任务**：委托给 `frontend-ui-ux-engineer`
- **架构决策**：咨询 `oracle` 代理
- **代码搜索**：使用 `explore` 代理查找现有实现

### 7.3 提交规范
```
feat(game): 实现 FS-01 脚本加载
fix(ui): 修复行动牌翻转动画
docs: 更新 AGENTS.md 规范
```

## 8. 测试策略
- **单元测试**：使用 `vitest` 测试规则函数
- **集成测试**：测试完整的回合循环
- **E2E 测试**：验证用户交互流程

---

**重要提示**：本项目为纯前端实现，所有游戏逻辑在客户端运行。如需多人联机，需后续添加 WebSocket 服务器支持。
