import { create } from 'zustand';
import type { CardRef, MissingChildGameState, LogEntry } from './types';
import { getCardDef } from './types';
import {
  createInitialState,
  drawFromLeftByInstanceId as engineDrawFromLeft,
  drawFromDeckTop,
  playCards as enginePlayCards,
  getLeftPlayerIndex,
  advanceTurnWhenNoPlayable,
  confirmTurnEnd as engineConfirmTurnEnd,
  confirmGameEnd as engineConfirmGameEnd,
  resolveCrossroadDraw,
  resolveBrightStreetReturn,
  resolvePoliceStation,
  resolveAmuletProtect,
  resolveLighthouseDesignate,
  resolveRumorPick,
  resolveDiscardToHand,
  resolveAquariumPick,
  resolvePickPlayerDraw2,
  resolvePickPlayerSwapTop,
  resolveConvenienceStore,
  resolvePickPlayerDraw1,
  resolveTunnelDiscard,
  resolveShrinePickTarget,
  resolveTransferAllMaigo,
  resolveRiverPick,
} from './engine';

interface MissingChildStore {
  gameState: MissingChildGameState | null;
  selectedInstanceIds: number[];
  /** 打出牌后获得的额外行动数，用于浮现动画，展示后需 clear */
  extraGained: number;
  /** 回合开始抽牌：暂存抽到的牌，动画播放完后再提交到 gameState */
  pendingDraw: { card: CardRef; fromPlayerName: string; animKey: number } | null;
  /** 水族馆分发结果：展示当前玩家收到的牌（热座模式），展示后需 clear */
  aquariumReveal: { receivedCard: CardRef; playerName: string } | null;

  clearAquariumReveal: () => void;
  startGame: (playerNames: string[]) => void;
  drawFromLeftByInstanceId: (instanceId: number) => void;
  /** 动画播完后提交回合开始的抽牌 */
  commitPendingDraw: () => void;
  drawFromDeck: () => void;
  toggleSelect: (instanceId: number) => void;
  playSelected: () => void;
  skipTurnNoPlayable: () => void;
  confirmTurnEnd: () => void;
  clearExtraGained: () => void;
  resetGame: () => void;
  setGameState: (state: MissingChildGameState) => void;
  /** 平交道抽牌动画播完后结算 Bad End */
  crossroadDrawDone: () => void;
  /** Normal End 确认，进入 game_end 结算页 */
  confirmGameEnd: () => void;
  /** 抽牌阶段发现无可抽上家（手牌全空）时触发 Normal End */
  triggerNormalEndFromDraw: () => void;
  /** 跳过 Bad End 动画 */
  skipBadEndAnimation: () => void;

  // ===== pendingEffect 处理函数 =====
  /** 明亮的街道：是否取回手牌 */
  brightStreetReturn: (accept: boolean) => void;
  /** 派出所：选一张迷子放回牌库顶（null=取消） */
  policeStationSelect: (instanceId: number | null) => void;
  /** 护身符：选一张手牌保护 */
  amuletProtectSelect: (instanceId: number) => void;
  /** 灯塔：选一张手牌指定给下家 */
  lighthouseDesignateSelect: (instanceId: number) => void;
  /** 传闻：选一张迷子取走（null=不取） */
  rumorPickSelect: (instanceId: number | null) => void;
  /** 回头：从弃牌堆选一张加入手牌 */
  selectFromDiscard: (instanceId: number) => void;
  /** 水族馆：选择一张牌（多轮收集） */
  aquariumSelect: (playerIndex: number, instanceId: number | null) => void;
  /** 电话亭：选择一名玩家抽两张 */
  phoneBoothSelect: (targetPlayerIndex: number) => void;
  /** 投币洗衣机：第1步选玩家 */
  laundromatSelectPlayer: (targetPlayerIndex: number) => void;
  /** 投币洗衣机：第2步选手牌 */
  laundromatSelectCard: (instanceId: number) => void;
  /** 便利店：第1步选一张入手；第2步确认顺序 */
  convenienceStoreSelect: (instanceId: number) => void;
  convenienceStoreArrange: (cards: CardRef[]) => void;
  /** 分岔路：选一名玩家抽一张 */
  forkRoadSelect: (targetPlayerIndex: number) => void;
  /** 隧道：当前受影响玩家弃一张亮牌 */
  tunnelDiscardSelect: (instanceId: number | null) => void;
  /** 神社：选目标玩家 */
  shrineSelectTarget: (targetPlayerIndex: number) => void;
  /** 小黑崎：选目标玩家 */
  kurosakiSelect: (targetPlayerIndex: number) => void;
  /** 河：选一张牌给左手边（多轮收集） */
  riverSelect: (playerIndex: number, instanceId: number | null) => void;
  /** 取消当前 pendingEffect（跳过效果） */
  cancelEffect: () => void;
}

function applyState(set: (s: Partial<MissingChildStore>) => void, next: MissingChildGameState) {
  set({ gameState: next, selectedInstanceIds: [] });
}

export const useMissingChildStore = create<MissingChildStore>((set, get) => ({
  gameState: null,
  selectedInstanceIds: [],
  extraGained: 0,
  pendingDraw: null,
  aquariumReveal: null,

  startGame: (playerNames) => {
    set({ gameState: createInitialState(playerNames), selectedInstanceIds: [], extraGained: 0 });
  },

  drawFromLeftByInstanceId: (instanceId) => {
    const { gameState, pendingDraw } = get();
    if (!gameState || gameState.phase !== 'playing') return;
    if (pendingDraw || gameState.turnEndPending || gameState.pendingEffect) return;

    const cur = gameState.players[gameState.currentPlayerIndex];
    if (!cur.alive || cur.drawnCard !== null) return;

    const leftIdx = getLeftPlayerIndex(gameState);
    const leftPlayer = gameState.players[leftIdx];
    const card = leftPlayer.hand.find(c => c.instanceId === instanceId);
    if (!card) return;

    // 先存 pendingDraw，等动画播完后再提交
    set({ pendingDraw: { card, fromPlayerName: leftPlayer.name, animKey: Date.now() } });
  },

  commitPendingDraw: () => {
    const { gameState, pendingDraw } = get();
    if (!gameState || !pendingDraw) return;

    const cur = gameState.players[gameState.currentPlayerIndex];
    const leftIdx = getLeftPlayerIndex(gameState);
    const leftPlayer = gameState.players[leftIdx];
    const next = engineDrawFromLeft(gameState, pendingDraw.card.instanceId);
    if (next !== gameState) {
      const cardDef = getCardDef(pendingDraw.card.cardId);
      const log: LogEntry = {
        id: `log-${Date.now()}-${cur.id}`,
        type: 'draw_from_left',
        round: gameState.round,
        turn: gameState.turn,
        playerIndex: cur.id,
        timestamp: Date.now(),
        message: `${cur.name} 从 ${leftPlayer.name} 手牌中抽取了【${cardDef?.name ?? '?'}】`,
        detail: cardDef ? `【${cardDef.name}】${cardDef.description}` : undefined,
      };
      set({ gameState: { ...next, logs: [...(next.logs ?? []), log] }, pendingDraw: null });
    } else {
      set({ pendingDraw: null });
    }
  },

  drawFromDeck: () => {
    const { gameState, pendingDraw } = get();
    if (!gameState || gameState.phase !== 'playing') return;
    if (pendingDraw || gameState.turnEndPending || gameState.pendingEffect) return;

    const cur = gameState.players[gameState.currentPlayerIndex];
    if (!cur.alive || cur.drawnCard !== null) return;

    const next = drawFromDeckTop(gameState);
    if (next) {
      const drawnCard = next.players[cur.id].hand.at(-1);
      const cardDef = drawnCard ? getCardDef(drawnCard.cardId) : null;
      const log: LogEntry = {
        id: `log-${Date.now()}-${cur.id}`,
        type: 'draw_from_deck',
        round: gameState.round,
        turn: gameState.turn,
        playerIndex: cur.id,
        timestamp: Date.now(),
        message: `${cur.name} 从牌库抽了一张牌`,
        detail: cardDef ? `【${cardDef.name}】${cardDef.description}` : undefined,
      };
      set({ gameState: { ...next, logs: [...(next.logs ?? []), log] } });
    }
  },

  toggleSelect: (instanceId) => {
    const { gameState, selectedInstanceIds, pendingDraw } = get();
    if (!gameState || gameState.phase !== 'playing') return;
    if (pendingDraw || gameState.turnEndPending || gameState.pendingEffect) return;

    const cur = gameState.players[gameState.currentPlayerIndex];
    if (!cur.alive || !cur.hand.some(c => c.instanceId === instanceId)) return;

    // 反选：已选中则取消
    if (selectedInstanceIds.includes(instanceId)) {
      set({ selectedInstanceIds: selectedInstanceIds.filter(id => id !== instanceId) });
      return;
    }

    const card = cur.hand.find(c => c.instanceId === instanceId)!;
    const isDarkStreet = (id: number) => id >= 18 && id <= 22;

    // 空选 → 直接选中
    if (selectedInstanceIds.length === 0) {
      set({ selectedInstanceIds: [instanceId] });
      return;
    }

    // 当前选择全为坏掉的街灯 且 新牌也是 → 追加
    const allDark = selectedInstanceIds.every(id => {
      const c = cur.hand.find(h => h.instanceId === id);
      return c && isDarkStreet(c.cardId);
    });
    if (allDark && isDarkStreet(card.cardId)) {
      set({ selectedInstanceIds: [...selectedInstanceIds, instanceId] });
    } else {
      // 其他情况：替换为单选
      set({ selectedInstanceIds: [instanceId] });
    }
  },

  playSelected: () => {
    const { gameState, selectedInstanceIds, pendingDraw } = get();
    if (!gameState || gameState.phase !== 'playing') return;
    if (pendingDraw || gameState.turnEndPending || gameState.pendingEffect || selectedInstanceIds.length === 0) return;

    const cur = gameState.players[gameState.currentPlayerIndex];
    if (!cur) return;

    const playedCards = selectedInstanceIds
      .map(id => cur.hand.find(c => c.instanceId === id))
      .filter(Boolean) as CardRef[];

    const extraSum = playedCards.reduce(
      (acc, c) => acc + (getCardDef(c.cardId)?.extra_round ?? 0),
      0,
    );

    const next = enginePlayCards(gameState, gameState.currentPlayerIndex, selectedInstanceIds);
    // engine 拒绝出牌（返回原状态）→ 清除选中，不触发任何副作用
    if (next === gameState) {
      set({ selectedInstanceIds: [] });
      return;
    }
    const cardDefs = playedCards.map(c => getCardDef(c.cardId)).filter(Boolean);
    const cardNames = cardDefs.map(d => d!.name).join('、');
    const logs: LogEntry[] = [...(next.logs ?? [])];

    logs.push({
      id: `log-${Date.now()}-${cur.id}`,
      type: 'play_card',
      round: gameState.round,
      turn: gameState.turn,
      playerIndex: cur.id,
      timestamp: Date.now(),
      message: `${cur.name} 打出了 ${playedCards.length > 1 ? '多张牌' : cardNames}`,
      detail: cardDefs.map(d => `【${d!.name}】${d!.description}`).join('\n'),
    });

    if (extraSum > 0) {
      logs.push({
        id: `log-${Date.now()}-${cur.id}-extra`,
        type: 'extra_action',
        round: gameState.round,
        turn: gameState.turn,
        playerIndex: cur.id,
        timestamp: Date.now(),
        message: `${cur.name} 获得 ${extraSum} 点额外行动`,
      });
    }

    set({ gameState: { ...next, logs }, selectedInstanceIds: [], extraGained: extraSum });
  },

  clearExtraGained: () => set({ extraGained: 0 }),

  skipTurnNoPlayable: () => {
    const { gameState, pendingDraw } = get();
    if (!gameState || gameState.phase !== 'playing') return;
    if (pendingDraw || gameState.turnEndPending || gameState.pendingEffect) return;

    const cur = gameState.players[gameState.currentPlayerIndex];
    const next = advanceTurnWhenNoPlayable(gameState);
    if (next) {
      const log: LogEntry = {
        id: `log-${Date.now()}-${cur.id}`,
        type: 'turn_skip',
        round: gameState.round,
        turn: gameState.turn,
        playerIndex: cur.id,
        timestamp: Date.now(),
        message: `${cur.name} 跳过回合（无牌可出）`,
      };
      set({ gameState: { ...next, logs: [...(next.logs ?? []), log] }, selectedInstanceIds: [] });
    }
  },

  confirmTurnEnd: () => {
    const { gameState, pendingDraw } = get();
    if (!gameState?.turnEndPending || pendingDraw) return;

    const next = engineConfirmTurnEnd(gameState);
    if (!next) return;

    const logs: LogEntry[] = [...(next.logs ?? [])];
    if (next.phase === 'playing') {
      const nextPlayer = next.players[next.currentPlayerIndex];
      const roundChange = next.round !== gameState.round;
      logs.push({
        id: `log-${Date.now()}-turn`,
        type: 'turn_start',
        round: next.round,
        turn: next.turn,
        playerIndex: next.currentPlayerIndex,
        timestamp: Date.now(),
        message: roundChange
          ? `第 ${next.round + 1} 轮开始，${nextPlayer?.name} 的回合`
          : `${nextPlayer?.name} 的回合`,
        detail: roundChange ? `进入第 ${next.round + 1} 轮` : undefined,
      });
    }

    set({ gameState: { ...next, logs }, selectedInstanceIds: [] });
  },

  crossroadDrawDone: () => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolveCrossroadDraw(gameState));
  },

  confirmGameEnd: () => {
    const { gameState } = get();
    if (!gameState || !gameState.gameEndPending) return;
    const next = engineConfirmGameEnd(gameState);
    if (next) set({ gameState: next, selectedInstanceIds: [] });
  },

  triggerNormalEndFromDraw: () => {
    const { gameState } = get();
    if (!gameState || gameState.phase !== 'playing') return;
    set({ gameState: { ...gameState, endReason: 'Normal', gameEndPending: true } });
  },

  resetGame: () => {
    set({ gameState: null, selectedInstanceIds: [], extraGained: 0, pendingDraw: null });
  },

  setGameState: (state) => {
    set({ gameState: state, selectedInstanceIds: [] });
  },

  // ===== pendingEffect 实现 =====

  brightStreetReturn: (accept) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolveBrightStreetReturn(gameState, accept));
  },

  policeStationSelect: (instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolvePoliceStation(gameState, instanceId));
  },

  amuletProtectSelect: (instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolveAmuletProtect(gameState, instanceId));
  },

  lighthouseDesignateSelect: (instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolveLighthouseDesignate(gameState, instanceId));
  },

  rumorPickSelect: (instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolveRumorPick(gameState, instanceId));
  },

  selectFromDiscard: (instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolveDiscardToHand(gameState, instanceId));
  },

  aquariumSelect: (playerIndex, instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    const effect = gameState.pendingEffect;
    const next = resolveAquariumPick(gameState, playerIndex, instanceId);

    // 检测水族馆是否刚刚完成（pendingEffect 被清除）
    const justFinished = effect?.type === 'aquarium_pick' && !next.pendingEffect;
    if (!justFinished) {
      set({ gameState: next, selectedInstanceIds: [] });
      return;
    }

    // 推断当前玩家收到了哪张牌（新增的那张）
    const curIdx = gameState.currentPlayerIndex;
    const newSelections = { ...(effect.selections ?? {}), [playerIndex]: instanceId };
    const selectedByCurrentPlayer = newSelections[curIdx];

    const handBeforeIds = new Set(
      gameState.players[curIdx].hand
        .filter(c => c.instanceId !== selectedByCurrentPlayer)
        .map(c => c.instanceId),
    );
    const receivedCard = next.players[curIdx].hand.find(c => !handBeforeIds.has(c.instanceId));
    const playerName = gameState.players[curIdx].name;

    set({
      gameState: next,
      selectedInstanceIds: [],
      aquariumReveal: receivedCard ? { receivedCard, playerName } : null,
    });
  },

  clearAquariumReveal: () => set({ aquariumReveal: null }),

  phoneBoothSelect: (targetPlayerIndex) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolvePickPlayerDraw2(gameState, targetPlayerIndex));
  },

  laundromatSelectPlayer: (targetPlayerIndex) => {
    const { gameState } = get();
    if (!gameState) return;
    const next = resolvePickPlayerSwapTop(gameState, targetPlayerIndex);
    set({ gameState: next, selectedInstanceIds: [] });
  },

  laundromatSelectCard: (instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolvePickPlayerSwapTop(gameState, instanceId));
  },

  convenienceStoreSelect: (instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    const next = resolveConvenienceStore(gameState, instanceId);
    set({ gameState: next, selectedInstanceIds: [] });
  },

  convenienceStoreArrange: (cards) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolveConvenienceStore(gameState, cards));
  },

  forkRoadSelect: (targetPlayerIndex) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolvePickPlayerDraw1(gameState, targetPlayerIndex));
  },

  tunnelDiscardSelect: (instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    const next = resolveTunnelDiscard(gameState, instanceId);
    set({ gameState: next, selectedInstanceIds: [] });
  },

  shrineSelectTarget: (targetPlayerIndex) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolveShrinePickTarget(gameState, targetPlayerIndex));
  },

  kurosakiSelect: (targetPlayerIndex) => {
    const { gameState } = get();
    if (!gameState) return;
    applyState(set, resolveTransferAllMaigo(gameState, targetPlayerIndex));
  },

  riverSelect: (playerIndex, instanceId) => {
    const { gameState } = get();
    if (!gameState) return;
    const next = resolveRiverPick(gameState, playerIndex, instanceId);
    set({ gameState: next, selectedInstanceIds: [] });
  },

  cancelEffect: () => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: { ...gameState, pendingEffect: undefined }, selectedInstanceIds: [] });
  },

  skipBadEndAnimation: () => {
    const { gameState } = get();
    if (!gameState?.badEndAnimation) return;
    const cleared = { ...gameState, badEndAnimation: undefined };

    if (cleared.gameEndPending) {
      set({ gameState: cleared });
      return;
    }

    const next = engineConfirmTurnEnd(cleared);

    if (!next) {
      set({ gameState: cleared });
      return;
    }

    const logs: LogEntry[] = [...(next.logs ?? [])];
    if (next.phase === 'playing') {
      const nextPlayer = next.players[next.currentPlayerIndex];
      const roundChange = next.round !== gameState.round;
      logs.push({
        id: `log-${Date.now()}-turn`,
        type: 'turn_start',
        round: next.round,
        turn: next.turn,
        playerIndex: next.currentPlayerIndex,
        timestamp: Date.now(),
        message: roundChange
          ? `第 ${next.round + 1} 轮开始，${nextPlayer?.name} 的回合`
          : `${nextPlayer?.name} 的回合`,
        detail: roundChange ? `进入第 ${next.round + 1} 轮` : undefined,
      });
    }

    set({ gameState: { ...next, logs }, selectedInstanceIds: [] });
  },
}));
