---
name: multi-boardgame-admin
description: 多桌游平台的架构管理规范。定义玩家注册、房间/房主公共逻辑、游戏模块边界和新增游戏的检查清单。当新增游戏模块、重构共享逻辑、或设计跨游戏功能时使用此技能。
---

# 多桌游平台架构规范

本项目是一个多桌游合集平台，多个独立桌游共享同一套玩家系统和房间系统。

## 1. 架构总览

```
src/
├── app/                      # Next.js 路由
│   ├── page.tsx              # 平台首页（游戏选择）
│   ├── tragedy-looper/       # 惨剧轮回入口
│   └── poison/               # Poison 入口
├── games/                    # 各游戏独立模块
│   ├── tragedy-looper/
│   │   ├── types.ts          # 游戏专属类型
│   │   ├── engine.ts         # 游戏引擎
│   │   ├── store.ts          # Zustand store
│   │   └── components/       # 游戏专属组件
│   └── poison/
│       ├── types.ts
│       ├── engine.ts
│       ├── store.ts
│       └── components/
├── shared/                   # 跨游戏共享模块
│   ├── useMultiplayer.tsx     # WebSocket + 房间逻辑
│   ├── LobbyScreen.tsx       # 公共大厅 UI
│   ├── types/
│   │   └── room.ts           # 房间、玩家类型
│   └── components/           # 公共 UI 组件
└── lib/
    └── utils.ts
```

## 2. 共享系统

### 2.1 玩家身份

使用 `sessionStorage` 实现标签页隔离（非 `localStorage`）：

```typescript
const USERNAME_KEY = 'tl_username_v2';

// 读取 → sessionStorage.getItem(USERNAME_KEY)
// 写入 → sessionStorage.setItem(USERNAME_KEY, name)
// 清除 → sessionStorage.removeItem(USERNAME_KEY)
```

当前已在 `src/lib/useMultiplayer.tsx` 中实现。后续抽取到 `shared/` 时保持接口不变。

### 2.2 房间系统

WebSocket 消息协议（现有实现）：

| 消息类型 | 方向 | 用途 |
|----------|------|------|
| `IDENTIFY` | C→S | 发送 userId 标识身份 |
| `CREATE_ROOM` | C→S | 创建房间（含可选密码） |
| `JOIN_ROOM` | C→S | 加入房间 |
| `LEAVE_ROOM` | C→S | 离开房间 |
| `REJOIN_ROOM` | C→S | 断线重连 |
| `SELECT_ROLE` | C→S | 选择角色/座位 |
| `REFRESH_ROOMS` | C→S | 刷新房间列表 |
| `WELCOME` | S→C | 连接确认 + 房间列表 |
| `ROOM_JOINED` | S→C | 加入成功 + 可用角色 |
| `ROOM_LEFT` | S→C | 离开成功 |
| `REJOIN_SUCCESS` | S→C | 重连成功 |
| `ROLE_CONFIRMED` | S→C | 角色确认 |
| `PLAYERS_UPDATE` | S→C | 玩家变动广播 |
| `STATE_SYNC` | S→C | 游戏状态同步 |
| `GAME_RESET` | S→C | 游戏重置 |
| `ERROR` | S→C | 错误信息 |

### 2.3 房主逻辑

- 房间创建者为房主（Host）
- 房主离开时转移给下一位玩家
- 房主拥有权限：选择游戏类型、开始游戏、重置游戏

### 2.4 会话恢复

```typescript
interface SessionData {
  roomId: string;
  roomName: string;
  role: PlayerRole;
  timestamp: number;
}
// 5分钟 TTL，过期自动清除
// 断线时自动尝试 REJOIN_ROOM
// 固定 2 秒间隔重连，最多 15 次
```

## 3. 游戏模块边界

每个游戏模块**必须自包含**，不依赖其他游戏的代码：

### 3.1 必须实现

| 导出 | 类型 | 说明 |
|------|------|------|
| `GameState` | type | 游戏状态类型 |
| `createInitialState()` | function | 创建初始状态 |
| `gameStore` | Zustand store | 状态管理 |
| `GameBoard` | component | 主游戏界面 |

### 3.2 可选实现

| 导出 | 说明 |
|------|------|
| `RulesReference` | 规则参考面板 |
| `ScriptSetup` | 游戏配置界面（如剧本选择） |

### 3.3 与共享系统的接口

每个游戏通过以下方式与共享系统交互：

```typescript
// 游戏状态同步: 通过 updateGameState() 发送变更
const { updateGameState } = useMultiplayer();

// 角色/座位选择: 通过 selectRole() 选择
const { selectRole, myRole } = useMultiplayer();

// 状态接收: 监听 STATE_SYNC 消息，更新本地 store
```

## 4. 新增游戏检查清单

添加新游戏时按以下步骤执行：

1. 在 `src/games/[game-name]/` 下创建模块目录
2. 实现 `types.ts` — 定义游戏状态和核心数据结构
3. 实现 `engine.ts` — 纯函数游戏逻辑，零副作用
4. 实现 `store.ts` — Zustand store，调用 engine 函数
5. 实现 `components/GameBoard.tsx` — 主界面
6. 在 `src/app/[game-name]/page.tsx` 创建路由入口
7. 在共享大厅的游戏列表中注册
8. 创建对应的 `.cursor/skills/[game-name]-boardgame/SKILL.md`

## 5. 技术栈约束

所有游戏统一使用：

- **框架**: Next.js (App Router) + TypeScript
- **状态**: Zustand（每个游戏独立 store）
- **样式**: Tailwind CSS
- **动画**: framer-motion
- **联机**: WebSocket（共享连接）
- **存储**: sessionStorage（会话隔离）

禁止引入与上述冲突的状态管理库或 CSS 方案。
