/**
 * 多人联机 Hook - 服务器权威模式
 * 使用单例 WebSocket 连接，所有组件共享同一个连接
 */

import { useEffect, useCallback, useState, useSyncExternalStore } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { GameState, PlayerDeck } from '@/types/game';

// WebSocket 服务器地址
const WS_URL = typeof window !== 'undefined' 
  ? `ws://${window.location.hostname}:3001`
  : 'ws://localhost:3001';

// ========== 单例 WebSocket 管理 ==========
interface MultiplayerState {
  ws: WebSocket | null;
  isConnected: boolean;
  myRole: 'mastermind' | 'protagonist' | null;
  availableRoles: string[];
  players: { mastermind: boolean; protagonist: boolean };
}

let globalState: MultiplayerState = {
  ws: null,
  isConnected: false,
  myRole: null,
  availableRoles: ['mastermind', 'protagonist'],
  players: { mastermind: false, protagonist: false },
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function getSnapshot() {
  return globalState;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 连接 WebSocket
function connect() {
  if (globalState.ws?.readyState === WebSocket.OPEN) {
    console.log('⚠️ 已经连接');
    return;
  }

  console.log('🔌 连接服务器:', WS_URL);
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('✅ 已连接');
    globalState = { ...globalState, ws, isConnected: true };
    notifyListeners();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 收到:', data.type);

      switch (data.type) {
        case 'WELCOME':
          globalState = {
            ...globalState,
            availableRoles: data.payload.availableRoles || ['mastermind', 'protagonist'],
          };
          notifyListeners();
          break;

        case 'ROLE_CONFIRMED':
          globalState = { ...globalState, myRole: data.payload.role };
          useGameStore.getState().setPlayerRole(data.payload.role);
          console.log('🎭 角色确认:', data.payload.role);
          notifyListeners();
          break;

        case 'PLAYERS_UPDATE':
          globalState = {
            ...globalState,
            players: data.payload,
            availableRoles: Object.entries(data.payload)
              .filter(([, connected]) => !connected)
              .map(([role]) => role),
          };
          notifyListeners();
          break;

        case 'STATE_SYNC':
          const payload = data.payload;
          console.log('🔄 同步状态, 阶段:', payload.gameState?.phase);
          useGameStore.setState({
            gameState: payload.gameState,
            mastermindDeck: payload.mastermindDeck || useGameStore.getState().mastermindDeck,
            protagonistDeck: payload.protagonistDeck || useGameStore.getState().protagonistDeck,
            currentMastermindCards: payload.currentMastermindCards || [],
            currentProtagonistCards: payload.currentProtagonistCards || [],
          });
          globalState = {
            ...globalState,
            players: payload.players || globalState.players,
          };
          notifyListeners();
          break;

        case 'GAME_RESET':
          useGameStore.getState().resetGame?.();
          break;

        case 'ERROR':
          console.error('❌ 服务器错误:', data.message);
          alert(data.message);
          break;
      }
    } catch (e) {
      console.error('消息解析错误:', e);
    }
  };

  ws.onclose = () => {
    console.log('❌ 连接断开');
    globalState = { ...globalState, ws: null, isConnected: false, myRole: null };
    notifyListeners();
  };

  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error);
    globalState = { ...globalState, isConnected: false };
    notifyListeners();
  };

  globalState = { ...globalState, ws };
}

// 断开连接
function disconnect() {
  if (globalState.ws) {
    globalState.ws.close();
    globalState = { ...globalState, ws: null, isConnected: false, myRole: null };
    notifyListeners();
  }
}

// 选择角色
function selectRole(role: 'mastermind' | 'protagonist') {
  console.log('🎭 选择角色:', role);
  if (globalState.ws?.readyState !== WebSocket.OPEN) {
    console.error('❌ WebSocket 未连接');
    return;
  }
  
  globalState.ws.send(JSON.stringify({
    type: 'SELECT_ROLE',
    role,
  }));
}

// 将 PlayerDeck 中的 Set 转为数组（用于 JSON 序列化）
function serializeDeck(deck: PlayerDeck | undefined): PlayerDeck | undefined {
  if (!deck) return undefined;
  return {
    ...deck,
    usedToday: deck.usedToday instanceof Set ? Array.from(deck.usedToday) : (deck.usedToday || []),
    usedThisLoop: deck.usedThisLoop instanceof Set ? Array.from(deck.usedThisLoop) : (deck.usedThisLoop || []),
  } as PlayerDeck;
}

// 发送状态更新
function sendUpdateGameState(updates: {
  gameState?: GameState;
  mastermindDeck?: PlayerDeck;
  protagonistDeck?: PlayerDeck;
  currentMastermindCards?: unknown[];
  currentProtagonistCards?: unknown[];
}) {
  console.log('📤 sendUpdateGameState, 连接状态:', globalState.ws?.readyState);
  if (globalState.ws?.readyState !== WebSocket.OPEN) {
    console.error('❌ WebSocket 未连接，无法发送');
    return;
  }
  
  // 序列化 deck 数据（将 Set 转为数组）
  const serializedUpdates = {
    ...updates,
    mastermindDeck: serializeDeck(updates.mastermindDeck),
    protagonistDeck: serializeDeck(updates.protagonistDeck),
  };
  
  console.log('📨 发送 UPDATE_GAME_STATE');
  globalState.ws.send(JSON.stringify({
    type: 'UPDATE_GAME_STATE',
    payload: serializedUpdates,
  }));
}

// ========== React Hook ==========
export function useMultiplayer() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // 更新游戏状态（包装为稳定的回调）
  const updateGameState = useCallback((updates: {
    gameState?: GameState;
    mastermindDeck?: PlayerDeck;
    protagonistDeck?: PlayerDeck;
    currentMastermindCards?: unknown[];
    currentProtagonistCards?: unknown[];
  }) => {
    sendUpdateGameState(updates);
  }, []);

  return {
    // 连接状态
    isConnected: state.isConnected,
    wsUrl: WS_URL,
    connect,
    disconnect,
    
    // 角色管理
    myRole: state.myRole,
    availableRoles: state.availableRoles,
    players: state.players,
    selectRole,
    
    // 游戏操作
    updateGameState,
  };
}
