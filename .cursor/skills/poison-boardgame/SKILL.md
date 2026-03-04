---
name: poison-boardgame
description: Poison (ポイズン) 桌游的完整规则与 TypeScript 实现指南。当开发 Poison 游戏功能、调试大锅结算逻辑、或实现计分系统时使用此技能。
---

# Poison 桌游规则与实现

> 设计: Reiner Knizia | 3-6人 | 时长: 玩家数 x 10分钟

## 1. 游戏目标

避免从大锅中取牌，尽量少拿分。**分数最低者获胜。**

## 2. 组件

| 物品 | 数量 | 说明 |
|------|------|------|
| 大锅版图 | 3 | 每个大锅锁定一种颜色（毒药除外） |
| 灵药牌 | 42 | 红/蓝/紫各14张: 值1×3, 值2×3, 值4×2, 值5×3, 值7×3 |
| 毒药牌 | 8 | 全部值为4，绿色特殊牌 |

总计50张牌。

## 3. 核心数据结构

```typescript
type PotionColor = 'red' | 'blue' | 'purple';
type CardColor = PotionColor | 'poison';

interface Card {
  color: CardColor;
  value: number; // 灵药: 1|2|4|5|7, 毒药: 固定4
}

interface Cauldron {
  lockedColor: PotionColor | null; // null = 尚未锁定（只有毒药牌时）
  cards: Card[];
  total: number; // 所有牌的value之和
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  collected: Card[]; // 从大锅取回的牌（面朝下，游戏结束前不可查看）
  roundScores: number[];
}

interface PoisonGameState {
  cauldrons: [Cauldron, Cauldron, Cauldron];
  players: Player[];
  dealerIndex: number;
  currentPlayerIndex: number;
  round: number;
  totalRounds: number; // = players.length
  phase: 'dealing' | 'playing' | 'scoring' | 'game_over';
}
```

## 4. 游戏准备

1. 选一名玩家为庄家（Dealer），之后每轮顺移
2. 庄家洗牌，将**全部50张**均匀发给所有玩家
3. **3人特例**: 按4份发牌，多出的1份面朝下弃置不用

```typescript
function deal(cards: Card[], playerCount: number): Card[][] {
  const shuffled = shuffle(cards);
  const dealTo = playerCount === 3 ? 4 : playerCount;
  const hands: Card[][] = Array.from({ length: dealTo }, () => []);
  shuffled.forEach((card, i) => hands[i % dealTo].push(card));
  // 3人时丢弃第4份
  return hands.slice(0, playerCount);
}
```

## 5. 回合流程

从庄家**左侧**开始，**顺时针**轮流出牌。

每个回合玩家**必须打出1张手牌**到某个大锅中：

### 5.1 颜色锁定规则

- 大锅里**第一张非毒药牌**决定该锅的颜色，之后只接受同色灵药牌或毒药牌
- 毒药牌可以放入**任何**大锅
- 只放了毒药牌的大锅视为"颜色未定"，可以接收任意颜色的第一张灵药牌
- **两个以上大锅不能是同一颜色**

```typescript
function canPlayCard(card: Card, cauldron: Cauldron, allCauldrons: Cauldron[]): boolean {
  if (card.color === 'poison') return true;
  if (cauldron.lockedColor === null) {
    // 该颜色不能已在其他锅中
    return !allCauldrons.some(c => c !== cauldron && c.lockedColor === card.color);
  }
  return cauldron.lockedColor === card.color;
}
```

### 5.2 大锅溢出（爆炸）

出牌后，若大锅内数字总和**超过13**：

1. 出牌者必须取走该大锅中**之前所有的牌**（不含刚打出的那张）
2. 取回的牌面朝下放在自己面前，**游戏结束前不可查看**
3. 刚打出的那张牌**留在大锅中**，作为新的起点

```typescript
function playCard(state: PoisonGameState, card: Card, cauldronIndex: number): PlayResult {
  const cauldron = state.cauldrons[cauldronIndex];
  const newTotal = cauldron.total + card.value;

  if (newTotal > 13) {
    // 爆炸: 取走之前的牌，打出的牌留下
    const collectedCards = [...cauldron.cards];
    return {
      collected: collectedCards,
      cauldron: {
        lockedColor: card.color === 'poison' ? null : card.color,
        cards: [card],
        total: card.value,
      },
      exploded: true,
    };
  }

  // 安全放入
  return {
    collected: [],
    cauldron: {
      lockedColor: cauldron.lockedColor ?? (card.color === 'poison' ? null : card.color),
      cards: [...cauldron.cards, card],
      total: newTotal,
    },
    exploded: false,
  };
}
```

### 5.3 爆炸特效

大锅溢出时播放视觉特效，使用 framer-motion：

```typescript
// 爆炸动画状态
interface ExplosionEffect {
  cauldronIndex: number;
  timestamp: number;
}

// 推荐特效: 大锅抖动 + 牌飞散 + 烟雾扩散
// 使用 motion.div 的 animate 属性:
//   shake: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } }
//   smoke: { scale: [1, 1.5], opacity: [0.8, 0], transition: { duration: 0.6 } }
```

## 6. 回合结束与计分

所有手牌出完后，一轮结束。翻开面朝下的收集牌，按以下规则计分：

### 6.1 丢弃判定（最关键的规则）

对红、蓝、紫**每种颜色分别判定**：

```typescript
function resolveDiscards(players: Player[]): Map<string, Card[]> {
  const discardMap = new Map<string, Card[]>(); // playerId -> 可丢弃的牌

  for (const color of ['red', 'blue', 'purple'] as PotionColor[]) {
    // 统计每人持有该颜色的张数
    const counts = players.map(p => ({
      playerId: p.id,
      count: p.collected.filter(c => c.color === color).length,
    }));

    const maxCount = Math.max(...counts.map(c => c.count));
    if (maxCount === 0) continue;

    // 有多少人并列最多
    const winners = counts.filter(c => c.count === maxCount);

    if (winners.length === 1) {
      // 唯一最多 -> 该玩家丢弃此颜色全部牌
      const winnerId = winners[0].playerId;
      const existing = discardMap.get(winnerId) ?? [];
      const player = players.find(p => p.id === winnerId)!;
      existing.push(...player.collected.filter(c => c.color === color));
      discardMap.set(winnerId, existing);
    }
    // 平局: 无人可丢弃该颜色 ← 惩罚性规则
  }

  // 毒药牌永远不可丢弃，不参与上述判定
  return discardMap;
}
```

### 6.2 计分

```typescript
function calculateScore(player: Player, discardedCards: Card[]): number {
  const remaining = player.collected.filter(
    c => !discardedCards.includes(c)
  );
  return remaining.reduce((sum, card) => {
    return sum + (card.color === 'poison' ? 2 : 1);
  }, 0);
}
```

| 牌类型 | 每张分值 |
|--------|----------|
| 灵药牌（红/蓝/紫） | 1分 |
| 毒药牌 | **2分** |

## 7. 游戏结束

- 每人当过一次庄家后游戏结束（总轮数 = 玩家人数）
- 累加所有轮次分数，**总分最低者获胜**

## 8. 规则速查

| 场景 | 处理 |
|------|------|
| 出牌后总和 <= 13 | 牌留在大锅，下一位 |
| 出牌后总和 > 13 | 爆炸：取走之前的牌，出的牌留下 |
| 某色唯一最多 | 该玩家丢弃此色全部牌 |
| 某色并列最多（平局） | **无人可丢弃** |
| 毒药牌 | 永远不可丢弃，每张2分 |
| 3人游戏 | 发4份牌，弃1份 |
| 大锅颜色 | 首张非毒药牌锁定颜色，不可重复 |
