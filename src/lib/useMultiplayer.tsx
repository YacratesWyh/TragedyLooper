/**
 * 多人联机上下文提供者
 * 支持多房间功能 + 断线重连
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { PlayerRole, CharacterId, LocationType } from '@/types/game';

// WebSocket 服务器地址：同端口 /ws 路径
const getWsUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:8080/ws';
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws`;
};

// 会话存储 key
const SESSION_KEY = 'tl_session';
const SESSION_TTL = 5 * 60 * 1000; // 5 分钟

// 保存/读取/清除会话
interface SessionData {
  roomId: string;
  roomName: string;
  role: PlayerRole;
  timestamp: number;
}

function saveSession(data: Omit<SessionData, 'timestamp'>) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
  } catch {}
}

function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionData;
    // 检查是否过期
    if (Date.now() - data.timestamp > SESSION_TTL) {
      clearSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

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
  isConnected: boolean;
  isReconnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  
  rooms: RoomInfo[];
  currentRoom: { id: string; name: string } | null;
  createRoom: (name: string, password?: string) => void;
  joinRoom: (roomId: string, password?: string) => void;
  leaveRoom: () => void;
  refreshRooms: () => void;
  
  myRole: PlayerRole | null;
  availableRoles: string[];
  players: { mastermind: boolean; protagonist: boolean };
  selectRole: (role: PlayerRole) => void;
  
  updateGameState: (updates: unknown) => void;
  adjustIndicator: (characterId: CharacterId, type: 'goodwill' | 'anxiety' | 'intrigue', delta: number) => void;
  toggleCharacterLife: (characterId: CharacterId) => void;
  moveCharacter: (characterId: CharacterId, location: LocationType) => void;
  resetGame: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<{ id: string; name: string } | null>(null);
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>(['mastermind', 'protagonist']);
  const [players, setPlayers] = useState({ mastermind: false, protagonist: false });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const intentionalDisconnectRef = useRef(false);
  
  const setPlayerRole = useGameStore((s) => s.setPlayerRole);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // 启动心跳（25秒间隔，比服务器30秒检测更短）
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return;
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 25000);
  }, []);

  // 兼容旧名称
  const clearReconnectTimeout = clearTimers;

  // 断开连接
  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    clearReconnectTimeout();
    clearSession();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsReconnecting(false);
    setCurrentRoom(null);
    setMyRole(null);
    setRooms([]);
    reconnectAttemptsRef.current = 0;
  }, [clearReconnectTimeout]);

  // 连接服务器
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    intentionalDisconnectRef.current = false;
    const wsUrl = getWsUrl();
    console.log('🔌 正在连接服务器:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ 已连接');
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
      
      // 启动心跳
      startHeartbeat();
      
      // 检查是否有会话需要恢复
      const session = loadSession();
      if (session) {
        console.log('🔄 尝试恢复会话:', session.roomId, session.role);
        ws.send(JSON.stringify({
          type: 'REJOIN_ROOM',
          payload: {
            roomId: session.roomId,
            role: session.role,
          },
        }));
      }
    };

    ws.onmessage = (event) => {
      // 忽略心跳响应
      if (event.data === 'pong') return;
      
      try {
        const data = JSON.parse(event.data);
        console.log('📨 收到:', data.type);

        switch (data.type) {
          case 'WELCOME':
            if (data.payload.rooms) {
              setRooms(data.payload.rooms);
            }
            break;

          case 'ROOM_LIST':
            setRooms(data.payload.rooms || []);
            break;

          case 'ROOM_JOINED':
            setCurrentRoom({ id: data.payload.roomId, name: data.payload.roomName });
            setAvailableRoles(data.payload.availableRoles || ['mastermind', 'protagonist']);
            setPlayers(data.payload.players || { mastermind: false, protagonist: false });
            console.log('🏠 已加入房间:', data.payload.roomId);
            break;

          case 'REJOIN_SUCCESS':
            // 重连成功，恢复状态
            setCurrentRoom({ id: data.payload.roomId, name: data.payload.roomName });
            setMyRole(data.payload.role);
            setPlayerRole(data.payload.role);
            setPlayers(data.payload.players || { mastermind: false, protagonist: false });
            console.log('🔄 重连成功:', data.payload.roomId, data.payload.role);
            // 更新会话时间戳
            saveSession({
              roomId: data.payload.roomId,
              roomName: data.payload.roomName,
              role: data.payload.role,
            });
            break;

          case 'REJOIN_FAILED':
            // 重连失败，清除会话
            console.log('❌ 重连失败:', data.payload?.message);
            clearSession();
            break;

          case 'ROOM_LEFT':
            setCurrentRoom(null);
            setMyRole(null);
            setPlayerRole(null);
            clearSession();
            if (data.payload.rooms) {
              setRooms(data.payload.rooms);
            }
            console.log('🚶 已离开房间');
            break;

          case 'ROLE_CONFIRMED': {
            const role = data.payload.role;
            setMyRole(role);
            setPlayerRole(role);
            console.log('🎭 角色确认:', role);
            // 保存会话
            if (currentRoom) {
              saveSession({
                roomId: currentRoom.id,
                roomName: currentRoom.name,
                role,
              });
            }
            break;
          }

          case 'PLAYERS_UPDATE':
            setPlayers(data.payload);
            setAvailableRoles(
              Object.entries(data.payload)
                .filter(([, connected]) => !connected)
                .map(([r]) => r as PlayerRole)
            );
            break;

          case 'STATE_SYNC': {
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
              setAvailableRoles(
                Object.entries(payload.players)
                  .filter(([, connected]) => !connected)
                  .map(([r]) => r as PlayerRole)
              );
            }
            break;
          }

          case 'GAME_RESET':
            setMyRole(null);
            setPlayerRole(null);
            clearSession();
            useGameStore.getState().resetGame?.();
            break;

          case 'ERROR':
            console.error('❌ 服务器错误:', data.payload?.message);
            // 不要用 alert 打断用户
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
      
      // 停止心跳
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // 如果不是主动断开且有会话，尝试重连
      const session = loadSession();
      if (!intentionalDisconnectRef.current && session && reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        console.log(`⏳ ${delay/1000}秒后重连 (尝试 ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
        setIsReconnecting(true);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        setCurrentRoom(null);
        setMyRole(null);
        setIsReconnecting(false);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };
  }, [setPlayerRole, currentRoom, startHeartbeat]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [clearReconnectTimeout]);

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
    clearSession();
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
  const updateGameState = useCallback((updates: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const serializeDeck = (deck: Record<string, unknown> | null | undefined) => {
        if (!deck) return undefined;
        return {
          ...deck,
          usedToday: deck.usedToday instanceof Set ? Array.from(deck.usedToday) : (deck.usedToday || []),
          usedThisLoop: deck.usedThisLoop instanceof Set ? Array.from(deck.usedThisLoop) : (deck.usedThisLoop || []),
        };
      };

      const typedUpdates = updates as Record<string, unknown>;
      const serializedUpdates = {
        ...typedUpdates,
        mastermindDeck: serializeDeck(typedUpdates.mastermindDeck as Record<string, unknown>),
        protagonistDeck: serializeDeck(typedUpdates.protagonistDeck as Record<string, unknown>),
      };

      wsRef.current.send(JSON.stringify({
        type: 'UPDATE_GAME_STATE',
        payload: serializedUpdates,
      }));
    }
  }, []);

  const resetGame = useCallback(() => {
    clearSession();
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
      useGameStore.getState().adjustIndicator(characterId as CharacterId, type as 'goodwill' | 'anxiety' | 'intrigue', delta);
    }
  }, []);

  const toggleCharacterLife = useCallback((characterId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'TOGGLE_LIFE', 
        payload: { characterId } 
      }));
    } else {
      useGameStore.getState().toggleCharacterLife(characterId as CharacterId);
    }
  }, []);

  const moveCharacter = useCallback((characterId: string, location: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'MOVE_CHARACTER', 
        payload: { characterId, location } 
      }));
    } else {
      useGameStore.getState().moveCharacter(characterId as CharacterId, location as LocationType);
    }
  }, []);

  const value = {
    isConnected,
    isReconnecting,
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
