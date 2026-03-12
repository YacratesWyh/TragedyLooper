---
name: missing-child-boardgame
description: 迷子 (Missing Child) 桌游的卡牌、技能与 TypeScript 实现参考。当开发迷子游戏功能、实现卡牌效果或调试回合/死亡判定时使用此技能。
---

# 迷子 (Missing Child) 桌游规则与实现

> 2～4 人 | 每回合从上家抽一张牌再打出一张，手牌仅剩迷子则出局，最后存活者胜。

## 1. 卡牌总览

牌分为三类：**MAIGO（迷子）**、**BRIGHT（光亮）**、**DARK（黑暗）**。迷子不能打出到场上。

| 类型 | 说明 |
|------|------|
| MAIGO | 迷子 ×3（id 0,1,2）— 不能打出 |
| BRIGHT | 光亮场所牌（街道、传闻、护身符、回头、来电、水族馆、派出所、人行横道、电话亭、投币洗衣机、灯塔、便利店、小神白 等） |
| DARK | 黑暗场所牌（坏掉的街道×5、雨、河、海、小道、分岔路、隧道、神社、公园、传闻、小黑崎 等） |

## 2. 卡牌与技能摘要（id 0–33）

### 迷子 (MAIGO)
- **0,1,2 迷子** — 这张卡不能打出到场上。

### 光亮 (BRIGHT)
- **3–5 明亮的街道** — 使用此卡时，若手牌中只有迷子，可将此卡放回手牌。
- **6 平交道** — 从牌堆抽一张；若抽到迷子则直接进入 BRIGHTADEND。extra_round 2。
- **7 传闻** — 查看整个牌堆，若有迷子可抽一张并洗牌，然后将迷子放回牌堆顶。index_num 1。
- **8 护身符** — 下一名从你手中抽牌的玩家由你挑一张给他；该回合他不能抽到那张（剩一张时不发动）。
- **9 回头** — 从弃牌堆任选一张加入手牌。
- **10 来电** — 左手边玩家从牌堆抽一张。extra_round 1。
- **11 水族馆** — 每人从手牌选一张，打乱后随机发回所有人。
- **12 派出所** — 手牌有迷子时，可将迷子放回牌堆顶。
- **13 人行横道** — 手牌有迷子的玩家按顺序从牌库各抽一张。
- **14 电话亭** — 选择一名玩家（含自己），从牌堆抽两张加入其手牌。index_num 1。
- **15 投币洗衣机** — 选择一名玩家，其手牌一张与牌库顶交换。index_num 1，extra_round 1。
- **16 灯塔** — 下一名从你手中抽牌时由你挑一张（剩一张时不发动）。
- **17 便利店** — 查看牌库顶 3 张，选 1 张加入手牌，其余以任意顺序放回牌顶。index_num 2，extra_round 1。
- **32 小神白** — 无效果。extra_round 2。

### 黑暗 (DARK)
- **18–22 坏掉的街道** ×5 — 可将两张及以上坏掉的街道一起打出。
- **23 雨** — 所有玩家按序（从左侧第一位开始）从牌库各抽一张。
- **24 河** — 每人从手牌选一张交给左手边玩家。
- **25 海** — 所有手牌放入牌堆并洗混，再抽回相同数量。
- **26 小道** — 从牌堆抽两张加入手牌。
- **27 分岔路** — 选择一名玩家，其从牌堆抽一张，然后你也从牌堆抽一张。index_num 1。
- **28 隧道** — 手牌中有两张以上光亮牌的玩家各弃一张光亮牌。
- **29 神社** — 选手牌最多的一名玩家，所有人将手牌中的迷子交给该玩家。
- **30 公园** — 从牌堆抽一张加入手牌。
- **31 传闻** — 同 BRIGHT 传闻（查看牌堆、若有迷子可抽一张并洗牌，迷子放回牌顶）。
- **33 小黑崎** — 选择一名玩家，将你手牌中所有迷子交给该玩家。index_num 1。

## 3. 核心数据结构（本仓库实现）

```typescript
type CardKind = 'MAIGO' | 'BRIGHT' | 'DARK';

interface CardDef {
  id: number;        // 0..33
  name: string;
  type: CardKind;
  description: string;
  index_num: number; // 使用时的目标数
  extra_round: number;
}

interface CardRef {
  cardId: number;    // 引用 CARD_DEFS[id]
  instanceId: number; // 实例 id，用于 React key
}

interface Player {
  id: number;
  name: string;
  hand: CardRef[];
  alive: boolean;
  drawnCard: CardRef | null;  // 本回合从上家抽到的牌
  actionEnd: boolean;
}

interface MissingChildGameState {
  phase: 'waiting' | 'playing' | 'game_end';
  players: Player[];
  deck: CardRef[];
  discard: CardRef[];
  currentPlayerIndex: number;
  nextInstanceId: number;
  endReason: 'Playing' | 'Good' | 'Bad' | 'Normal' | null;
}
```

## 4. 回合流程

1. **回合开始**：当前玩家从上家（左侧存活玩家）手中**随机抽一张**牌。
2. **死亡判定**：抽牌后若上家手牌为 0 则上家出局；若当前玩家手牌仅剩迷子（无光亮牌）则当前玩家出局。存活人数 ≤1 则游戏结束。
3. **出牌**：当前玩家打出一张牌到弃牌堆（或多张「坏掉的街道」一起打出）。迷子不能打出。
4. **推进**：出牌后再次死亡判定，然后下一名存活玩家成为当前玩家，回到步骤 1。

## 5. 实现要点

- **牌堆**：34 张牌（id 0–33 各一张），洗牌后每人 5 张，剩余为牌堆。
- **可出牌**：`canPlayToField(cardId)` 为假当且仅当 cardId 为 0,1,2（迷子）。
- **多张打出**：仅「坏掉的街道」（id 18–22）可多选一起打出。
- **死亡判定**：`deathCheck(hand)` — 手牌全为迷子且无光亮牌则死亡。发牌后与抽牌后、出牌后均需执行。
- **index_num / extra_round**：当前实现未解析具体卡牌效果（如选目标、额外回合），仅支持基础抽牌→出牌循环；扩展时可按 `CardDef.index_num` 做目标选择，按 `extra_round` 做回合数修正。

## 6. 模块位置

- 类型与卡表：`src/games/missing-child/types.ts`
- 引擎：`src/games/missing-child/engine.ts`
- 状态：`src/games/missing-child/store.ts`
- 主界面：`src/games/missing-child/components/GameBoard.tsx`
- 路由：`src/app/missing-child/page.tsx`
