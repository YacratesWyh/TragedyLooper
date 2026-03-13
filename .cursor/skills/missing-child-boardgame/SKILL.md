---
name: missing-child-boardgame
description: 迷子 (Missing Child) 桌游的卡牌、技能与 TypeScript 实现参考。当开发迷子游戏功能、实现卡牌效果或调试回合/死亡判定时使用此技能。
---

# 迷子 (Missing Child) 桌游规则与实现

> 2～4 人 · 3 轮制 · 每回合从上家盲抽一张再打出一张  
> 主题 meme：迷子牌 = 高松灯企鹅（MyGO!!!!!）

---

## 1. 结局体系（优先级从高到低）

| 结局 | 触发条件 | 结果 |
|------|----------|------|
| **Happy End** | 牌库 + 所有人手牌全部打空 | 全员 **+2 血**（上限 7），重新发牌进入下一轮 |
| **Bad End** | 某玩家手牌无光亮牌（仅迷子 / 迷子+黑暗 / 仅黑暗） | 该玩家自爆 **-3 血**，永久出局（badEnded=true） |
| **Normal End** | 存活玩家 ≤ 1 | 游戏结束，最后存活者获胜 |
| **3 轮结算** | 3 轮全部结束后 | 血量最高者获胜（并列亦可） |

**Bad End 判定函数（已修正）**：
```typescript
// 手牌不为空 且 没有任何光亮牌 → Bad End
export function badEndCheck(hand: CardRef[]): boolean {
  if (hand.length === 0) return false;
  return !hand.some(c => isBright(c.cardId));
}
```
> ⚠️ 错误模式（已修复）：之前用 `hand.every(c => isMaigo(c.cardId))`，导致「迷子+黑暗牌」不触发 Bad End。

---

## 2. 回合流程

```
1. 抽牌阶段
   ├─ 从左侧（上家）存活玩家手牌中【盲抽】一张（按 instanceId 指定）
   ├─ 抽牌完成后立即执行 applyMidTurnEndCheck（检查所有玩家 Bad End / Happy End / Normal End）
   └─ 若上家手牌抽空 → 检查上家是否触发 Bad End

2. 出牌阶段
   ├─ 当前玩家从手牌打出 1 张（或多张「坏掉的街灯」）
   ├─ 迷子牌不能打出
   ├─ 出牌后立即结算卡牌效果
   │   ├─ 无 pendingEffect → 调用 finalizeTurn（检查所有结局）
   │   └─ 有 pendingEffect → 先执行 applyEndCheck，再等待玩家选择
   └─ extra_round > 0 的牌给予额外行动次数（playsLeft +N）

3. 回合推进
   ├─ 若有额外行动（playsLeft > 0）→ 继续出牌阶段
   ├─ 否则设置 turnEndPending，等待当前玩家点击确认
   └─ 确认后切换到下一个存活玩家
```

**Bad End 检查时机**（所有触发点）：
- `drawFromLeftByInstanceId` → `applyMidTurnEndCheck`
- `playCards`（无 pendingEffect）→ `finalizeTurn` → `applyEndCheck`
- `playCards`（有 pendingEffect）→ 内联 `applyEndCheck` 后返回
- 每个 `resolveXxx` 函数 → `advanceAfterEffect` → `finalizeTurn` → `applyEndCheck`
- `confirmTurnEnd` → `applyEndCheck`
- `resetRound` → `applyEndCheck`

---

## 3. 卡牌总览（id 0–33）

牌库：id 0–31 各一张（共 32 张）。id 32（小神白）和 id 33（小黑崎）**不放入牌库**，是特殊牌。

### 迷子 MAIGO（id 0–2）
- 不能打出，持有即风险，手牌仅此类（+黑暗）触发 Bad End

### 光亮 BRIGHT

| id | 名称 | 效果摘要 | extra_round |
|----|------|----------|-------------|
| 3–5 | 明亮的街道 | 打出后若手牌仅剩迷子，可取回 | 0 |
| 6 | 平交道 | 从牌库抽 1 张；若为迷子 → 直接 Bad End（特例，无视手牌其他内容） | 2 |
| 7 | 传闻 | 看全部牌库，有迷子可取 1 张；洗牌；迷子放回牌库顶 | 1 |
| 8 | 护身符 | 下家从你手中抽牌时由你选一张**禁止**被抽（手牌≥2时生效） | 0 |
| 9 | 回头 | 从弃牌堆任选 1 张加入手牌 | 0 |
| 10 | 来电 | 左侧玩家从牌库抽 1 张 | 1 |
| 11 | 水族馆 | 所有人各选 1 张手牌，打乱后重新随机分发 | 0 |
| 12 | 派出所 | 手牌有迷子时，可将 1 张迷子放回牌库顶 | 0 |
| 13 | 人行横道 | 手牌有迷子的玩家（从打出者起）各从牌库抽 1 张 | 0 |
| 14 | 电话亭 | 选 1 名玩家（含自己），为其从牌库抽 2 张 | 0 |
| 15 | 投币洗衣机 | 选 1 名玩家，其手牌 1 张与牌库顶交换 | 1 |
| 16 | 灯塔 | 下家从你手中抽牌时由你选一张**必须**被抽（手牌≥2时生效） | 0 |
| 17 | 便利店 | 看牌库顶 3 张，选 1 张入手，其余以任意顺序放回牌库顶 | 1 |
| 32 | 小神白 | 无效果 | 2 |

### 黑暗 DARK

| id | 名称 | 效果摘要 | extra_round |
|----|------|----------|-------------|
| 18–22 | 坏掉的街灯 | 可将 2 张及以上一起打出 | 0 |
| 23 | 雨 | 从左侧第一位起，所有存活玩家各从牌库抽 1 张 | 0 |
| 24 | 河 | 所有人各选 1 张传给左手边玩家（同时传递） | 0 |
| 25 | 海 | 所有手牌入牌库洗混，再各抽回原数量 | 0 |
| 26 | 小道 | 从牌库抽 2 张加入手牌 | 0 |
| 27 | 分岔路 | 选 1 名玩家抽 1 张，然后你也从牌库抽 1 张 | 0 |
| 28 | 隧道 | 手牌有 ≥2 张光亮牌的玩家各弃 1 张光亮牌 | 0 |
| 29 | 神社 | 选手牌最多的 1 名玩家，所有人将手中迷子交给他 | 0 |
| 30 | 公园 | 从牌库抽 1 张加入手牌 | 0 |
| 31 | 传闻 | 同 BRIGHT 传闻（id 7） | 0 |
| 33 | 小黑崎 | 选 1 名玩家，将你手中所有迷子交给他 | 0 |

---

## 4. 核心数据结构

```typescript
// types.ts

type CardKind = 'MAIGO' | 'BRIGHT' | 'DARK';

interface CardDef {
  id: number;           // 0..33
  name: string;
  type: CardKind;
  description: string;
  index_num: number;    // 需要选择的目标数
  extra_round: number;  // 给予的额外行动次数
}

interface CardRef {
  cardId: number;       // 对应 CARD_DEFS[id]
  instanceId: number;   // 全局唯一实例 id，发牌时分配
}

interface Player {
  id: number;
  name: string;
  hand: CardRef[];
  alive: boolean;       // false 后不再参与回合
  hp: number;           // 初始 7，上限 7；Happy End +2，Bad End -3
  drawnCard: CardRef | null;  // 本回合从上家抽到的牌（已在手牌中）
  actionEnd: boolean;   // 本回合出牌阶段是否已结束
  badEnded?: boolean;   // true = 自爆永久出局，不参与新一轮
}

type EndReason = 'Playing' | 'Good' | 'Bad' | 'Normal' | 'RoundsComplete';

interface MissingChildGameState {
  phase: 'waiting' | 'playing' | 'game_end';
  players: Player[];
  deck: CardRef[];          // 末尾为牌库顶
  discard: CardRef[];
  currentPlayerIndex: number;
  round: number;            // 0-based，到 3 结束
  turn: number;             // 1-based
  playsLeft: number;        // 本回合剩余可出牌次数
  nextInstanceId: number;
  endReason: EndReason | null;
  turnEndPending?: boolean;
  pendingNextPlayerIndex?: number;
  pendingRound?: number;
  deckTopIsMaigo?: boolean;
  pendingEffect?: PendingEffect;
  protectedDraw?: { targetPlayer: number; pickedBy: number; source: 'amulet' | 'lighthouse'; instanceId?: number };
  gameEndPending?: boolean;
  logs: LogEntry[];
}
```

---

## 5. pendingEffect 体系

需要玩家交互的卡牌效果通过 `pendingEffect` 暂停回合推进，由 store 调用对应 `resolveXxx` 函数完成。

| pendingEffect type | 触发卡 | store 方法 |
|--------------------|--------|-----------|
| `bright_street_return` | 明亮的街道 3/4/5 | `brightStreetReturn(accept)` |
| `crossroad_draw` | 平交道 6 | `crossroadDrawDone()` |
| `rumor_pick` | 传闻 7/31 | `rumorPickSelect(instanceId\|null)` |
| `amulet_protect` | 护身符 8 | `amuletProtectSelect(instanceId)` |
| `discard_to_hand` | 回头 9 | `selectFromDiscard(instanceId)` |
| `aquarium_pick` | 水族馆 11 | `aquariumSelect(playerIndex, instanceId)` |
| `police_station` | 派出所 12 | `policeStationSelect(instanceId\|null)` |
| `pick_player_draw2` | 电话亭 14 | `phoneBoothSelect(targetPlayerIndex)` |
| `pick_player_swap_top` | 投币洗衣机 15 | `laundromatSelectPlayer()` → `laundromatSelectCard()` |
| `lighthouse_designate` | 灯塔 16 | `lighthouseDesignateSelect(instanceId)` |
| `convenience_store` | 便利店 17 | `convenienceStoreSelect()` → `convenienceStoreArrange()` |
| `river_pick` | 河 24 | `riverSelect(playerIndex, instanceId)` |
| `pick_player_draw1` | 分岔路 27 | `forkRoadSelect(targetPlayerIndex)` |
| `tunnel_discard` | 隧道 28 | `tunnelDiscardSelect(instanceId)` |
| `shrine_pick_target` | 神社 29（并列时） | `shrineSelectTarget(targetPlayerIndex)` |
| `transfer_all_maigo` | 小黑崎 33 | `kurosakiSelect(targetPlayerIndex)` |

所有 `resolveXxx` 完成后调用 `advanceAfterEffect` → `finalizeTurn`，统一执行结局检查。

---

## 6. 引擎关键函数

```typescript
// engine.ts 导出

badEndCheck(hand)                    // 手牌无光亮牌 → true
applyMidTurnEndCheck(st)             // 抽牌后：Bad End + Happy End + Normal End
finalizeTurn(st, currentIdx, plays)  // 出牌后推进：同上 + extra_round + turnEndPending
advanceAfterEffect(st)               // pendingEffect 解决后推进（调 finalizeTurn）

drawFromLeftByInstanceId(state, instanceId)   // 抽牌（含 applyMidTurnEndCheck）
playCards(state, playerIndex, instanceIds)     // 出牌（含完整结局链）
confirmTurnEnd(state)                          // 确认回合结束
createInitialState(playerNames)                // 初始化游戏
getWinnersByHp(players)                        // 3 轮后按血量取胜者
getLeftPlayerIndex(state)                      // 上家索引
hasPlayableCard(state)                         // 当前玩家是否有可出牌
```

---

## 7. Store 关键状态

```typescript
// store.ts (useMissingChildStore)

gameState: MissingChildGameState | null
selectedInstanceIds: number[]        // 当前选中的手牌 instanceId 列表
extraGained: number                  // 刚获得的额外行动数（动画用，1.2s 后自动清除）
pendingDraw: { card, fromPlayerName, animKey } | null  // 抽牌动画暂存
aquariumReveal: { receivedCard, playerName } | null    // 水族馆分发结果展示
```

---

## 8. 模块位置

```
src/games/missing-child/
  types.ts          卡表（CARD_DEFS）、所有类型定义
  engine.ts         纯函数游戏引擎（无副作用）
  store.ts          Zustand store，封装引擎调用 + UI 状态
  components/
    GameBoard.tsx   主界面（SetupScreen / 游戏中 / 结算）
    Card.tsx        MaigoCard / DeckPile / DiscardPile 组件
    EffectPanel.tsx pendingEffect 交互面板
    LogPanel.tsx    游戏日志面板
    WaitingIndicator.tsx  当前等待状态指示
    TestMode.tsx    测试模式面板

public/assets/maigo/
  rule.png          规则图（可缩放查看）
  gugugaga.mp3      抽到迷子 / Bad End 时播放的音效

src/app/missing-child/page.tsx  路由入口
```

---

## 9. 常见开发陷阱

1. **Bad End 判定**：用 `badEndCheck(hand)` = `!hand.some(c => isBright(c.cardId))`，**不是** `hand.every(c => isMaigo(c.cardId))`。迷子+黑暗牌也是 Bad End。

2. **deck 末尾 = 牌库顶**：`deck[deck.length - 1]` 是下一张要被抽的牌。`drawFromDeckToPlayer` 从末尾取。

3. **protectedDraw**：护身符（`amulet`）设置禁止抽的牌；灯塔（`lighthouse`）设置必须抽的牌。`drawFromLeftByInstanceId` 强制执行约束。

4. **pendingEffect 期间也要检查 Bad End**：`playCards` 在设置 pendingEffect 之前会先执行 `applyEndCheck`，若游戏已结束则取消 pendingEffect 直接终局。

5. **extra_round**：`playsLeft = (current - 1) + extra_round`。每次 `playCards` 后 finalizeTurn 用 `newPlaysLeft` 判断是否还有行动。

6. **热座模式**：所有玩家共用一个屏幕，`currentPlayerIndex` 决定当前谁操作。`turnEndPending` 作为换手屏障，防止下一个玩家看到当前玩家手牌。
