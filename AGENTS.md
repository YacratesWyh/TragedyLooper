# 多桌游平台 · 开发指南

Next.js 16 + TypeScript 5 + Tailwind CSS 4 + Zustand 5 + Framer Motion 12

游戏规则、架构、状态文档见 `doc/` 目录。

## 构建命令

```bash
npm install          # 安装依赖
npm run dev          # 开发服务器（含 combined-server）
npm run build        # 生产构建
npm run lint         # 代码检查
npx tsc --noEmit     # 类型检查
```

## 代码规范

### 导入顺序

```typescript
import { useState } from 'react';        // 1. React / Next.js
import { motion } from 'framer-motion';   // 2. 第三方库
import type { Game } from '@/types/game'; // 3. 内部类型
import { GameBoard } from '@/components'; // 4. 内部组件
import { cn } from '@/lib/utils';         // 5. 工具 / 样式
```

### 命名

| 类别 | 规则 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `GameBoard.tsx` |
| 逻辑/类型文件 | camelCase | `engine.ts` |
| 常量 | SCREAMING_SNAKE | `MAX_LOOPS` |
| 接口/类型 | PascalCase | `GameState` |

### 类型

- 禁止 `any`，用 `unknown` 或联合类型
- 不可变更新（Zustand `set` / 结构化拷贝）
- 明确区分 `null` 和 `undefined`

### 错误处理

```typescript
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
```

### 提交规范

```
feat(game): 实现 FS-01 脚本加载
fix(ui): 修复行动牌翻转动画
docs: 更新架构文档
```
