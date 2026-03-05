# 多桌游平台 - 系统架构文档

> 版本：0.3.0
> 最后更新：2026-03-05

---

## 1. 架构概览

### 1.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16 |
| 语言 | TypeScript | 5 |
| 运行时 | React | 19 |
| 状态管理 | Zustand | 5 |
| 样式 | Tailwind CSS | 4 |
| 动画 | Framer Motion | 12 |
| 联机 | ws (WebSocket) | 8 |

### 1.2 目录结构

```
src/
├── app/                          # Next.js 页面路由
│   ├── page.tsx                  # 首页（游戏选择）
│   ├── layout.tsx                # 全局布局
│   ├── globals.css
│   ├── tragedy-looper/page.tsx   # 惨剧轮回入口
│   └── poison/page.tsx           # Poison 入口
├── changelog.ts                  # 应用内版本说明
├── games/                        # 各游戏独立模块
│   ├── tragedy-looper/
│   │   ├── components/           # 18 个 UI 组件
│   │   ├── scripts/fs-01.ts      # 剧本数据
│   │   ├── characterAssets.ts    # 角色资产映射
│   │   ├── engine.ts             # 游戏引擎
│   │   ├── store.ts              # Zustand 状态
│   │   └── types.ts              # 类型定义
│   └── poison/
│       ├── components/GameBoard.tsx
│       ├── engine.ts
│       ├── store.ts
│       ├── types.ts
│       └── usePoisonMultiplayer.tsx
├── shared/                       # 跨游戏公共层
│   ├── ClientWrapper.tsx         # 客户端包装器
│   ├── identity.ts               # 用户身份管理
│   └── useMultiplayer.tsx         # WebSocket 联机 Hook
└── lib/
    └── utils.ts                  # 通用工具（cn 等）

server/
└── combined-server.js            # HTTP + WebSocket 合并服务器

public/assets/
├── common/                       # 公共资产（角色立绘）
├── fs/                           # FS 剧本资产
├── btx/                          # BTX 剧本资产
└── poison/                       # Poison 游戏资产
```

---

## 2. 核心设计

### 2.1 多游戏隔离

每个游戏是 `src/games/<game>/` 下的独立模块，包含自己的 engine / store / types / components。公共的联机和身份逻辑在 `src/shared/` 中复用。

```
app/poison/page.tsx  →  games/poison/store  →  games/poison/engine
app/tragedy-looper/  →  games/tragedy-looper/store  →  .../engine
                     ↘  shared/useMultiplayer  ↙
```

### 2.2 联机架构

```
浏览器 ←→ combined-server.js ←→ 浏览器
          (HTTP: Next.js)
          (WS: 房间/状态同步)
```

- 房间制：创建 → 加入 → 同步游戏状态
- 断线重连：5 分钟窗口内自动恢复
- 身份持久化：`shared/identity.ts` 生成并缓存用户 ID

### 2.3 惨剧轮回 - 数据流

```typescript
GameState {
  currentLoop, currentDay,
  characters: CharacterState[],
  boardIntrigue: Record<LocationType, number>,
  privateInfo,    // 仅剧作家可见
  publicInfo,     // 所有玩家可见
  phase
}
```

结算顺序：移动牌 → 禁止牌抵消 → 指示物应用 → 事件检查

---

## 3. 新增游戏指引

1. 在 `src/games/<name>/` 创建 engine / store / types / components
2. 在 `src/app/<name>/page.tsx` 添加路由
3. 如需联机，复用 `shared/useMultiplayer.tsx` 或编写专用 Hook
4. 在 `public/assets/<name>/` 放置资产
