/**
 * 多人联机上下文提供者
 * 支持多房间功能
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { GameState, PlayerDeck, PlayerRole, CharacterId, LocationType } from '@/types/game';

// WebSocket 服务器地址
// 生产环境：与 HTTP 同端口，路径 /ws (由 server/index.js 处理)
// 开发环境：独立端口 3001
const getWsUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
  
  // 允许环境变量覆盖（用于特殊部署场景）
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // 包含端口号
  
  // 统一使用 /ws 路径，与 server/index.js 一致
  return `${protocol}//${host}/ws`;
};

// 房间信息类型
interface RoomInfo {
  id: string;
  name: string;
  hasPassword: boolean;
  playerCount: number;
  players: { mastermind: boolean; protagonist: boolean };
  initialized: boolean;
}

interface MultiplayerContextType {
  // 连接状态
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  
  // 房间相关
  rooms: RoomInfo[];
  currentRoom: { id: string; name: string } | null;
  createRoom: (name: string, password?: string) => void;
  joinRoom: (roomId: string, password?: string) => void;
  leaveRoom: () => void;
  refreshRooms: () => void;
  
  // 角色相关
  myRole: PlayerRole | null;
  availableRoles: string[];
  players: { mastermind: boolean; protagonist: boolean };
  selectRole: (role: PlayerRole) => void;
  
  // 游戏操作
  updateGameState: (updates: any) => void;
  adjustIndicator: (characterId: CharacterId, type: 'goodwill' | 'anxiety' | 'intrigue', delta: number) => void;
  toggleCharacterLife: (characterId: CharacterId) => void;
  moveCharacter: (characterId: CharacterId, location: LocationType) => void;
  resetGame: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<{ id: string; name: string } | null>(null);
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>(['mastermind', 'protagonist']);
  const [players, setPlayers] = useState({ mastermind: false, protagonist: false });
  
  const wsRef = useRef<WebSocket | null>(null);
  const setPlayerRole = useGameStore((s) => s.setPlayerRole);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      setCurrentRoom(null);
      setMyRole(null);
      setRooms([]);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = getWsUrl();
    console.log('🔌 正在连接服务器:', wsUrl);
    const ws = new WebSocket(wsUrl);
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
          // 欢迎消息，包含房间列表
          case 'WELCOME':
            if (data.payload.rooms) {
              setRooms(data.payload.rooms);
            }
            break;

          // 房间列表更新
          case 'ROOM_LIST':
            setRooms(data.payload.rooms || []);
            break;

          // 成功加入房间
          case 'ROOM_JOINED':
            setCurrentRoom({ id: data.payload.roomId, name: data.payload.roomName });
            setAvailableRoles(data.payload.availableRoles || ['mastermind', 'protagonist']);
            setPlayers(data.payload.players || { mastermind: false, protagonist: false });
            console.log('🏠 已加入房间:', data.payload.roomId);
            break;

          // 离开房间
          case 'ROOM_LEFT':
            setCurrentRoom(null);
            setMyRole(null);
            setPlayerRole(null);
            if (data.payload.rooms) {
              setRooms(data.payload.rooms);
            }
            console.log('🚶 已离开房间');
            break;

          // 角色确认
          case 'ROLE_CONFIRMED':
            const role = data.payload.role;
            setMyRole(role);
            setPlayerRole(role);
            console.log('🎭 角色确认:', role);
            break;

          // 玩家状态更新
          case 'PLAYERS_UPDATE':
            setPlayers(data.payload);
            const updatedAvailable = Object.entries(data.payload)
              .filter(([, connected]) => !connected)
              .map(([r]) => r as PlayerRole);
            setAvailableRoles(updatedAvailable);
            break;

          // 状态同步
          case 'STATE_SYNC':
            const payload = data.payload;
            useGameStore.setState({
              gameState: payload.gameState || useGameStore.getState().gameState,
              mastermindDeck: payload.mastermindDeck || useGameStore.getState().mastermindDeck,
              protagonistDeck: payload.protagonistDeck || useGameStore.getState().protagonistDeck,
              currentMastermindCards: payload.currentMastermindCards !== undefined 
                ? payload.currentMastermindCards 
                : useGameStore.getState().currentMastermindCards,
              currentProtagonistCards: payload.currentProtagonistCards !== undefined 
                ? payload.currentProtagonistCards 
                : useGameStore.getState().currentProtagonistCards,
            });
            if (payload.players) {
              setPlayers(payload.players);
              const syncAvailable = Object.entries(payload.players)
                .filter(([, connected]) => !connected)
                .map(([r]) => r as PlayerRole);
              setAvailableRoles(syncAvailable);
            }
            break;

          // 游戏重置
          case 'GAME_RESET':
            setMyRole(null);
            setPlayerRole(null);
            useGameStore.getState().resetGame?.();
            break;

          // 错误
          case 'ERROR':
            console.error('❌ 服务器错误:', data.payload?.message);
            alert(data.payload?.message || '发生错误');
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
      setCurrentRoom(null);
      setMyRole(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      setIsConnected(false);
    };
  }, [setPlayerRole]);

  // 房间操作
  const createRoom = useCallback((name: string, password?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CREATE_ROOM',
        payload: { name, password: password || '' },
      }));
    }
  }, []);

  const joinRoom = useCallback((roomId: string, password?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'JOIN_ROOM',
        payload: { roomId, password: password || '' },
      }));
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
    }
  }, []);

  const refreshRooms = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REFRESH_ROOMS' }));
    }
  }, []);

  // 角色选择
  const selectRole = useCallback((role: PlayerRole) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SELECT_ROLE', role }));
    }
  }, []);

  // 游戏状态更新
  const updateGameState = useCallback((updates: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
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

  const adjustIndicator = useCallback((characterId: string, type: string, delta: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'ADJUST_INDICATOR', 
        payload: { characterId, type, delta } 
      }));
    } else {
      useGameStore.getState().adjustIndicator(characterId as any, type as any, delta);
    }
  }, []);

  const toggleCharacterLife = useCallback((characterId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'TOGGLE_LIFE', 
        payload: { characterId } 
      }));
    } else {
      useGameStore.getState().toggleCharacterLife(characterId as any);
    }
  }, []);

  const moveCharacter = useCallback((characterId: string, location: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'MOVE_CHARACTER', 
        payload: { characterId, location } 
      }));
    } else {
      useGameStore.getState().moveCharacter(characterId as any, location as any);
    }
  }, []);

  const value = {
    isConnected,
    connect,
    disconnect,
    rooms,
    currentRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    refreshRooms,
    myRole,
    availableRoles,
    players,
    selectRole,
    updateGameState,
    adjustIndicator,
    toggleCharacterLife,
    moveCharacter,
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
