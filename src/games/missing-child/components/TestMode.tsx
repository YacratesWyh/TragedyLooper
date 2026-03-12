'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMissingChildStore } from '../store';
import { getCardDef, isMaigo, isBright, canPlayToField } from '../types';
import { getLeftPlayerIndex, hasPlayableCard, advanceTurnWhenNoPlayable } from '../engine';
import { Bug, Play, Pause, Square, SkipForward, RotateCcw } from 'lucide-react';

interface TestLog {
  id: string;
  timestamp: number;
  type: 'info' | 'action' | 'error' | 'end';
  message: string;
  detail?: string;
}

export function TestMode() {
  const store = useMissingChildStore();
  const { gameState, startGame, drawFromLeftByInstanceId, drawFromDeck, playSelected, toggleSelect, skipTurnNoPlayable, confirmTurnEnd,
    brightStreetReturn, policeStationSelect, amuletProtectSelect, lighthouseDesignateSelect, rumorPickSelect,
    aquariumSelect, riverSelect, phoneBoothSelect, laundromatSelectPlayer, laundromatSelectCard,
    convenienceStoreSelect, convenienceStoreArrange, forkRoadSelect, shrineSelectTarget, kurosakiSelect, selectFromDiscard, tunnelDiscardSelect,
    crossroadDrawDone
  } = store;
  
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1000); // 毫秒
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((type: TestLog['type'], message: string, detail?: string) => {
    setLogs(prev => [...prev, {
      id: `test-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type,
      message,
      detail,
    }]);
  }, []);

  // 自动滚动日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 获取当前可执行的操作
  const getAvailableActions = useCallback(() => {
    if (!gameState || gameState.phase !== 'playing') return [];
    
    // 如果有待处理效果，优先处理
    if (gameState.pendingEffect) {
      return ['effect'];
    }
    
    const cur = gameState.players[gameState.currentPlayerIndex];
    const actions: string[] = [];
    
    if (!cur || !cur.alive) return ['next'];
    
    // 检查是否可以抽牌
    if (cur.drawnCard === null && !gameState.turnEndPending) {
      actions.push('draw');
    }
    
    // 检查是否可以打牌
    if (cur.drawnCard !== null && !cur.actionEnd && !gameState.turnEndPending) {
      const playableCards = cur.hand.filter(c => !isMaigo(c.cardId));
      if (playableCards.length > 0) {
        actions.push('play');
      } else {
        actions.push('skip');
      }
    }
    
    // 检查是否可以结束回合
    if (gameState.turnEndPending) {
      actions.push('confirm');
    }
    
    return actions;
  }, [gameState]);

  // 处理待处理效果
  const handlePendingEffect = useCallback(() => {
    if (!gameState?.pendingEffect) return;
    
    const effect = gameState.pendingEffect;
    const type = effect.type;
    
    addLog('action', `处理效果: ${type}`);
    
    switch (type) {
      case 'bright_street_return': {
        // 明亮的街道：随机选择是否取回
        const accept = Math.random() > 0.5;
        addLog('info', `明亮的街道: ${accept ? '取回手牌' : '不取回'}`);
        brightStreetReturn(accept);
        break;
      }
      case 'police_station': {
        // 派出所：随机选择一张迷子
        const maigoCards = gameState.players[effect.triggeredBy]?.hand.filter(c => c.cardId <= 2) ?? [];
        if (maigoCards.length > 0) {
          const card = maigoCards[Math.floor(Math.random() * maigoCards.length)];
          addLog('info', `派出所: 选择迷子 ${card.instanceId}`);
          policeStationSelect(card.instanceId);
        } else {
          policeStationSelect(null);
        }
        break;
      }
      case 'amulet_protect': {
        // 护身符：随机选择一张手牌保护
        const hand = gameState.players[effect.triggeredBy]?.hand ?? [];
        if (hand.length > 0) {
          const card = hand[Math.floor(Math.random() * hand.length)];
          addLog('info', `护身符: 保护手牌 ${card.instanceId}`);
          amuletProtectSelect(card.instanceId);
        }
        break;
      }
      case 'lighthouse_designate': {
        // 灯塔：随机选择一张手牌指定给下家
        const hand = gameState.players[effect.triggeredBy]?.hand ?? [];
        if (hand.length > 0) {
          const card = hand[Math.floor(Math.random() * hand.length)];
          addLog('info', `灯塔: 指定手牌 ${card.instanceId} 给下家`);
          lighthouseDesignateSelect(card.instanceId);
        }
        break;
      }
      case 'rumor_pick': {
        // 传闻：随机选择是否取走迷子
        const hasMaigo = effect.tempCards?.some((c) => c.cardId <= 2);
        if (hasMaigo) {
          const maigoCard = effect.tempCards?.find((c) => c.cardId <= 2);
          addLog('info', `传闻: 取走迷子 ${maigoCard?.instanceId}`);
          rumorPickSelect(maigoCard?.instanceId ?? null);
        } else {
          addLog('info', '传闻: 没有迷子可取');
          rumorPickSelect(null);
        }
        break;
      }
      case 'aquarium_pick': {
        // 水族馆：所有存活玩家依次选择一张牌，然后打乱重发
        const waitingPlayers = gameState.players
          .map((p, i) => ({ p, i }))
          .filter(({ p, i }) => p.alive && effect.selections?.[i] === undefined);
        
        if (waitingPlayers.length === 0) {
          addLog('info', '水族馆: 所有玩家已选择');
          break;
        }
        
        // 为第一个等待的玩家随机选择一张牌
        const current = waitingPlayers[0];
        const hand = current.p.hand;
        if (hand.length > 0) {
          const card = hand[Math.floor(Math.random() * hand.length)];
          addLog('info', `水族馆: ${current.p.name} 选择一张牌`);
          aquariumSelect(current.i, card.instanceId);
        } else {
          addLog('info', `水族馆: ${current.p.name} 没有手牌，跳过`);
          aquariumSelect(current.i, null);
        }
        break;
      }
      case 'river_pick': {
        // 河：所有存活玩家依次选择一张牌给左手边
        const waitingPlayers = gameState.players
          .map((p, i) => ({ p, i }))
          .filter(({ p, i }) => p.alive && effect.selections?.[i] === undefined);
        
        if (waitingPlayers.length === 0) {
          addLog('info', '河: 所有玩家已选择');
          break;
        }
        
        // 为第一个等待的玩家随机选择一张牌
        const current = waitingPlayers[0];
        const hand = current.p.hand;
        if (hand.length > 0) {
          const card = hand[Math.floor(Math.random() * hand.length)];
          addLog('info', `河: ${current.p.name} 选择手牌给左手边`);
          riverSelect(current.i, card.instanceId);
        } else {
          addLog('info', `河: ${current.p.name} 没有手牌，跳过`);
          riverSelect(current.i, null);
        }
        break;
      }
      case 'pick_player_draw2': {
        // 电话亭：随机选择一个玩家
        const targetIdx = Math.floor(Math.random() * gameState.players.length);
        addLog('info', `电话亭: 选择玩家 ${gameState.players[targetIdx]?.name}`);
        phoneBoothSelect(targetIdx);
        break;
      }
      case 'pick_player_swap_top': {
        // 投币洗衣机：先选玩家，再选牌
        if (effect.targetPlayer !== undefined) {
          // 已选玩家，需要选牌
          const targetHand = gameState.players[effect.targetPlayer]?.hand ?? [];
          if (targetHand.length > 0) {
            const card = targetHand[Math.floor(Math.random() * targetHand.length)];
            addLog('info', `投币洗衣机: 选择牌 ${card.instanceId}`);
            laundromatSelectCard(card.instanceId);
          }
        } else {
          // 先选玩家
          const targetIdx = Math.floor(Math.random() * gameState.players.length);
          addLog('info', `投币洗衣机: 选择玩家 ${gameState.players[targetIdx]?.name}`);
          laundromatSelectPlayer(targetIdx);
        }
        break;
      }
      case 'convenience_store': {
        const { step = 1 } = effect;
        const cards: typeof effect.tempCards = effect.tempCards ?? [];
        
        if (step === 1) {
          // 第1步：从3张牌中选一张加入手牌
          if (cards.length > 0) {
            const cardIndex = Math.floor(Math.random() * cards.length);
            const selectedCard = cards[cardIndex];
            if (!selectedCard) break;
            const cardName = getCardDef(selectedCard.cardId)?.name ?? '未知';
            addLog('info', `便利店: 选择牌 ${cardName}`);
            convenienceStoreSelect(selectedCard.instanceId);
          }
        } else if (step === 2) {
          // 第2步：安排剩余2张牌的顺序（随机顺序）
          if (cards.length === 2) {
            const shuffle = Math.random() > 0.5;
            const ordered = shuffle ? [cards[1], cards[0]] : cards;
            addLog('info', `便利店: 安排剩余2张牌顺序 (${shuffle ? '交换' : '原序'})`);
            convenienceStoreArrange(ordered);
          } else if (cards.length === 1) {
            // 只有1张牌，直接确认
            convenienceStoreArrange(cards);
          }
        }
        break;
      }
      case 'pick_player_draw1': {
        // 分岔路：选择一个玩家抽牌
        const targetIdx = Math.floor(Math.random() * gameState.players.length);
        addLog('info', `分岔路: 选择玩家 ${gameState.players[targetIdx]?.name} 抽牌`);
        forkRoadSelect(targetIdx);
        break;
      }
      case 'shrine_pick_target': {
        // 神社：选择目标玩家（神社效果简化为只选择目标，迷子转移自动处理）
        const targetIdx = Math.floor(Math.random() * gameState.players.length);
        addLog('info', `神社: 选择目标玩家 ${gameState.players[targetIdx]?.name}`);
        shrineSelectTarget(targetIdx);
        break;
      }
      case 'transfer_all_maigo': {
        // 小黑崎：选择一个玩家
        const targetIdx = Math.floor(Math.random() * gameState.players.length);
        addLog('info', `小黑崎: 选择玩家 ${gameState.players[targetIdx]?.name}`);
        kurosakiSelect(targetIdx);
        break;
      }
      case 'tunnel_discard': {
        // 隧道：手牌中有亮牌的玩家依次弃一张亮牌
        const { step = 0, affectedPlayers = [] } = effect;
        const currentPlayerId = affectedPlayers[step];
        
        if (currentPlayerId === undefined) {
          addLog('info', '隧道: 所有玩家已处理');
          break;
        }
        
        const player = gameState.players[currentPlayerId];
        const brightCards = player?.hand.filter(c => isBright(c.cardId)) ?? [];
        
        if (brightCards.length > 0) {
          const card = brightCards[Math.floor(Math.random() * brightCards.length)];
          addLog('info', `隧道: ${player.name} 弃掉亮牌`);
          tunnelDiscardSelect(card.instanceId);
        } else {
          addLog('info', `隧道: ${player.name} 没有亮牌可弃，跳过`);
          tunnelDiscardSelect(null);
        }
        break;
      }
      case 'discard_to_hand': {
        // 回头：从弃牌堆选一张加入手牌
        const discard = gameState.discard;
        if (discard.length > 0) {
          // 随机选择一张弃牌，优先选择非迷子牌
          const nonMaigoCards = discard.filter(c => !isMaigo(c.cardId));
          const cardsToChoose = nonMaigoCards.length > 0 ? nonMaigoCards : discard;
          const card = cardsToChoose[Math.floor(Math.random() * cardsToChoose.length)];
          addLog('info', `回头: 选择弃牌 ${card.instanceId}`);
          selectFromDiscard(card.instanceId);
        } else {
          addLog('info', '回头: 弃牌堆为空，跳过');
          // 弃牌堆为空时调用 cancelEffect 来跳过效果
          store.cancelEffect?.();
        }
        break;
      }
      case 'crossroad_draw': {
        // 平交道：直接确认（抽到迷子的处理在 GameBoard 中通过动画展示）
        addLog('info', '平交道: 抽牌完成');
        crossroadDrawDone();
        break;
      }
      default:
        addLog('error', `未处理的效果类型: ${type}`);
    }
  }, [gameState, addLog, brightStreetReturn, policeStationSelect, amuletProtectSelect, lighthouseDesignateSelect, rumorPickSelect, aquariumSelect, riverSelect, phoneBoothSelect, laundromatSelectPlayer, laundromatSelectCard, convenienceStoreSelect, convenienceStoreArrange, forkRoadSelect, shrineSelectTarget, kurosakiSelect, selectFromDiscard, tunnelDiscardSelect, crossroadDrawDone, store]);

  // 执行一步操作
  const executeStep = useCallback(() => {
    if (!gameState) return;
    
    const actions = getAvailableActions();
    
    if (actions.length === 0) {
      addLog('error', '无可用操作');
      setIsRunning(false);
      return;
    }
    
    const cur = gameState.players[gameState.currentPlayerIndex];
    
    // 优先顺序：抽牌 -> 打牌 -> 跳过 -> 确认回合结束
    if (actions.includes('draw')) {
      // 决定从上家抽还是牌库抽
      const leftIdx = getLeftPlayerIndex(gameState);
      const leftPlayer = gameState.players[leftIdx];
      
      if (leftPlayer.hand.length > 0 && Math.random() > 0.3) {
        // 70% 概率从上家抽
        const randomCard = leftPlayer.hand[Math.floor(Math.random() * leftPlayer.hand.length)];
        addLog('action', `${cur.name} 从上家抽牌`, `选中 instanceId: ${randomCard.instanceId}`);
        drawFromLeftByInstanceId(randomCard.instanceId);
      } else {
        // 30% 概率从牌库抽
        addLog('action', `${cur.name} 从牌库抽牌`);
        drawFromDeck();
      }
    } else if (actions.includes('play')) {
      // 自动选择可出的牌
      const playableCards = cur.hand.filter(c => canPlayToField(c.cardId));
      
      if (playableCards.length === 0) {
        addLog('error', '没有可出的牌');
        return;
      }
      
      // 选择一张牌（优先选择非迷子牌）
      const cardToPlay = playableCards[0];
      const cardDef = getCardDef(cardToPlay.cardId);
      
      addLog('action', `${cur.name} 打出卡牌`, `【${cardDef?.name}】${cardDef?.description?.slice(0, 30)}...`);
      
      // 先清除之前的选中状态，再选中新牌
      store.selectedInstanceIds.forEach(id => toggleSelect(id));
      toggleSelect(cardToPlay.instanceId);
      
      // 执行打牌
      setTimeout(() => {
        playSelected();
      }, 100);
      
    } else if (actions.includes('skip')) {
      addLog('action', `${cur.name} 跳过回合（无牌可出）`);
      skipTurnNoPlayable();
    } else if (actions.includes('confirm')) {
      addLog('action', `${cur.name} 确认回合结束`);
      confirmTurnEnd();
    } else if (actions.includes('effect')) {
      // 处理待处理效果
      handlePendingEffect();
    } else if (actions.includes('next')) {
      // 当前玩家已死亡，直接推进
      addLog('info', '当前玩家已死亡，跳过');
    }
  }, [gameState, getAvailableActions, addLog, drawFromLeftByInstanceId, drawFromDeck, toggleSelect, playSelected, skipTurnNoPlayable, confirmTurnEnd, store.selectedInstanceIds, handlePendingEffect]);

  // 自动运行循环
  useEffect(() => {
    if (!isRunning || !gameState) return;
    
    if (gameState.phase === 'game_end') {
      addLog('end', '游戏结束', `原因: ${gameState.endReason}`);
      setIsRunning(false);
      return;
    }
    
    timeoutRef.current = setTimeout(() => {
      executeStep();
    }, speed);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isRunning, gameState, speed, executeStep, addLog]);

  const handleStart = () => {
    if (!gameState) {
      // 自动开始新游戏
      addLog('info', '开始新游戏（3人）');
      startGame(['测试A', '测试B', '测试C']);
    }
    setIsRunning(true);
    addLog('info', '测试模式启动');
  };

  const handleStop = () => {
    setIsRunning(false);
    addLog('info', '测试模式暂停');
  };

  const handleStep = () => {
    if (!gameState) {
      startGame(['测试A', '测试B', '测试C']);
    } else {
      executeStep();
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setLogs([]);
    store.resetGame();
    addLog('info', '重置游戏');
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="测试模式"
      >
        <Bug size={20} />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-96 z-50 bg-stone-900 border-l border-stone-700 shadow-2xl flex flex-col"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-stone-700 bg-stone-800">
        <div className="flex items-center gap-2">
          <Bug size={18} className="text-purple-400" />
          <span className="font-bold text-stone-200">测试模式</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-stone-700 rounded text-stone-400"
        >
          ✕
        </button>
      </div>

      {/* 控制面板 */}
      <div className="p-4 border-b border-stone-700 space-y-3">
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
            >
              <Play size={16} /> 开始
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg"
            >
              <Pause size={16} /> 暂停
            </button>
          )}
          <button
            onClick={handleStep}
            className="px-3 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg"
            title="单步执行"
          >
            <SkipForward size={16} />
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg"
            title="重置"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* 速度控制 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">速度:</span>
          <input
            type="range"
            min="100"
            max="3000"
            step="100"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-stone-400 w-12 text-right">{speed}ms</span>
        </div>

        {/* 当前状态 */}
        {gameState && (
          <div className="text-xs text-stone-500 space-y-1">
            <div>状态: {gameState.phase === 'playing' ? '进行中' : '已结束'}</div>
            <div>轮次: {gameState.round + 1}/3 | 回合: {gameState.turn ?? 1}</div>
            <div>当前玩家: {gameState.players[gameState.currentPlayerIndex]?.name ?? '-'}</div>
            <div>存活玩家: {gameState.players.filter(p => p.alive).length}/{gameState.players.length}</div>
          </div>
        )}
      </div>

      {/* 日志区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 && (
          <div className="text-center text-stone-500 text-sm py-8">
            点击开始运行测试
          </div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className={`p-2 rounded text-xs ${
              log.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-800' :
              log.type === 'action' ? 'bg-purple-900/30 text-purple-400 border border-purple-800' :
              log.type === 'end' ? 'bg-green-900/30 text-green-400 border border-green-800' :
              'bg-stone-800 text-stone-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="opacity-50">
                {new Date(log.timestamp).toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit',
                  fractionalSecondDigits: 3,
                })}
              </span>
              <span className="font-medium">{log.message}</span>
            </div>
            {log.detail && (
              <div className="mt-1 pl-16 text-stone-500">{log.detail}</div>
            )}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </motion.div>
  );
}
