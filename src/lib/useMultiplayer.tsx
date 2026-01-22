/**
 * 多人联机上下文提供者
 * 确保每个浏览器标签页有独立的状态，同时在同一标签页内的组件共享连接
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { GameState, PlayerDeck, PlayerRole } from '@/types/game';

// WebSocket 服务器地址
const WS_URL = typeof window !== 'undefined' 
  ? `ws://${window.location.hostname}:3001`
  : 'ws://localhost:3001';

interface MultiplayerContextType {
  isConnected: boolean;
  myRole: PlayerRole | null;
  availableRoles: string[];
  players: { mastermind: boolean; protagonist: boolean };
  connect: () => void;
  disconnect: () => void;
  selectRole: (role: PlayerRole) => void;
  updateGameState: (updates: any) => void;
  resetGame: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>(['mastermind', 'protagonist']);
  const [players, setPlayers] = useState({ mastermind: false, protagonist: false });
  
  const wsRef = useRef<WebSocket | null>(null);
  
  // 引用 store 的方法
  const setPlayerRole = useGameStore((s) => s.setPlayerRole);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      setMyRole(null);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('🔌 正在连接服务器:', WS_URL);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ 已连接');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 收到:', data.type);

        switch (data.type) {
          case 'WELCOME':
            setAvailableRoles(data.payload.availableRoles || ['mastermind', 'protagonist']);
            if (data.payload.players) {
              setPlayers(data.payload.players);
            }
            break;

          case 'ROLE_CONFIRMED':
            const role = data.payload.role;
            setMyRole(role);
            setPlayerRole(role);
            console.log('🎭 角色确认:', role);
            break;

          case 'PLAYERS_UPDATE':
            setPlayers(data.payload);
            // 更新可用角色列表
            const updatedAvailable = Object.entries(data.payload)
              .filter(([, connected]) => !connected)
              .map(([r]) => r as PlayerRole);
            setAvailableRoles(updatedAvailable);
            break;

          case 'STATE_SYNC':
            const payload = data.payload;
            useGameStore.setState({
              gameState: payload.gameState,
              mastermindDeck: payload.mastermindDeck || useGameStore.getState().mastermindDeck,
              protagonistDeck: payload.protagonistDeck || useGameStore.getState().protagonistDeck,
              currentMastermindCards: payload.currentMastermindCards || [],
              currentProtagonistCards: payload.currentProtagonistCards || [],
            });
            if (payload.players) {
              setPlayers(payload.players);
              // 同步更新可用角色列表
              const syncAvailable = Object.entries(payload.players)
                .filter(([, connected]) => !connected)
                .map(([r]) => r as PlayerRole);
              setAvailableRoles(syncAvailable);
            }
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
      wsRef.current = null;
      setIsConnected(false);
      setMyRole(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      setIsConnected(false);
    };
  }, [setPlayerRole]);

  const selectRole = useCallback((role: PlayerRole) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SELECT_ROLE', role }));
    }
  }, []);

  const updateGameState = useCallback((updates: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // 序列化 deck 数据（将 Set 转为数组）
      const serializeDeck = (deck: any) => {
        if (!deck) return undefined;
        return {
          ...deck,
          usedToday: deck.usedToday instanceof Set ? Array.from(deck.usedToday) : (deck.usedToday || []),
          usedThisLoop: deck.usedThisLoop instanceof Set ? Array.from(deck.usedThisLoop) : (deck.usedThisLoop || []),
        };
      };

      const serializedUpdates = {
        ...updates,
        mastermindDeck: serializeDeck(updates.mastermindDeck),
        protagonistDeck: serializeDeck(updates.protagonistDeck),
      };

      wsRef.current.send(JSON.stringify({
        type: 'UPDATE_GAME_STATE',
        payload: serializedUpdates,
      }));
    }
  }, []);

  const resetGame = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'RESET_GAME' }));
    }
  }, []);

  const value = {
    isConnected,
    myRole,
    availableRoles,
    players,
    connect,
    disconnect,
    selectRole,
    updateGameState,
    resetGame,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
}
