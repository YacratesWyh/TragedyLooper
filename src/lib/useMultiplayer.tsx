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

// 存储 key
const SESSION_KEY = 'tl_session';
const USERNAME_KEY = 'tl_username';
const SESSION_TTL = 5 * 60 * 1000; // 5 分钟

// 获取/设置用户名（使用 localStorage 持久化）
function getStoredUsername(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(USERNAME_KEY);
  } catch {
    return null;
  }
}

function setStoredUsername(username: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERNAME_KEY, username);
  } catch {}
}

function clearStoredUsername(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(USERNAME_KEY);
  } catch {}
}

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

// 玩家信息类型
interface PlayerInfo {
  connected: boolean;
  name: string | null;
}

interface PlayersInfo {
  mastermind: PlayerInfo;
  protagonist: PlayerInfo;
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
  // 用户身份
  username: string | null;
  setUsername: (name: string) => void;
  clearUsername: () => void;
  
  isConnected: boolean;
  isReconnecting: boolean;
  serverVersion: string | null;
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
  players: PlayersInfo;
  selectRole: (role: PlayerRole) => void;
  
  updateGameState: (updates: unknown) => void;
  adjustIndicator: (characterId: CharacterId, type: 'goodwill' | 'anxiety' | 'intrigue', delta: number) => void;
  toggleCharacterLife: (characterId: CharacterId) => void;
  moveCharacter: (characterId: CharacterId, location: LocationType) => void;
  resetGame: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

// 标准化玩家信息（兼容旧格式和新格式）
function normalizePlayersInfo(players: unknown): PlayersInfo {
  if (!players) {
    return {
      mastermind: { connected: false, name: null },
      protagonist: { connected: false, name: null },
    };
  }
  
  const p = players as Record<string, unknown>;
  
  // 新格式: { mastermind: { connected: true, name: 'xxx' }, ... }
  if (typeof p.mastermind === 'object' && p.mastermind !== null) {
    return players as PlayersInfo;
  }
  
  // 旧格式: { mastermind: true/false, protagonist: true/false }
  return {
    mastermind: { connected: !!p.mastermind, name: null },
    protagonist: { connected: !!p.protagonist, name: null },
  };
}

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  // 用户名状态（从 localStorage 初始化）
  const [username, setUsernameState] = useState<string | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<{ id: string; name: string } | null>(null);
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>(['mastermind', 'protagonist']);
  const [players, setPlayers] = useState<PlayersInfo>({
    mastermind: { connected: false, name: null },
    protagonist: { connected: false, name: null },
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const intentionalDisconnectRef = useRef(false);
  
  // 初始化时从 localStorage 加载用户名
  useEffect(() => {
    const stored = getStoredUsername();
    if (stored) {
      setUsernameState(stored);
    }
  }, []);
  
  // 设置用户名
  const setUsername = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      setStoredUsername(trimmed);
      setUsernameState(trimmed);
    }
  }, []);
  
  // 清除用户名
  const clearUsername = useCallback(() => {
    clearStoredUsername();
    setUsernameState(null);
  }, []);
  
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
    if (!username) {
      console.log('⚠️ 需要先设置用户名');
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    intentionalDisconnectRef.current = false;
    const wsUrl = getWsUrl();
    console.log('🔌 正在连接服务器:', wsUrl, '用户:', username);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ 已连接');
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
      
      // 启动心跳
      startHeartbeat();
      
      // 发送用户身份标识（使用用户名作为 userId）
      ws.send(JSON.stringify({
        type: 'IDENTIFY',
        payload: { userId: username },
      }));
      
      // 检查是否有会话需要恢复
      const session = loadSession();
      if (session) {
        console.log('🔄 尝试恢复会话:', session.roomId, session.role);
        ws.send(JSON.stringify({
          type: 'REJOIN_ROOM',
          payload: {
            userId: username,
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
            if (data.payload.version) {
              setServerVersion(data.payload.version);
            }
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
            setPlayers(normalizePlayersInfo(data.payload.players));
            // 如果有游戏状态，同步到本地
            if (data.payload.gameState) {
              useGameStore.setState({
                gameState: data.payload.gameState,
              });
              console.log('🏠 已加入房间:', data.payload.roomId, '(含游戏状态)');
            } else {
              console.log('🏠 已加入房间:', data.payload.roomId);
            }
            break;

          case 'REJOIN_SUCCESS':
            // 重连成功，恢复状态
            setCurrentRoom({ id: data.payload.roomId, name: data.payload.roomName });
            setMyRole(data.payload.role);
            setPlayerRole(data.payload.role);
            setPlayers(normalizePlayersInfo(data.payload.players));
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

          case 'PLAYERS_UPDATE': {
            const normalizedPlayers = normalizePlayersInfo(data.payload);
            setPlayers(normalizedPlayers);
            setAvailableRoles(
              (['mastermind', 'protagonist'] as const)
                .filter(role => !normalizedPlayers[role].connected)
            );
            break;
          }

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
              const normalizedPlayers = normalizePlayersInfo(payload.players);
              setPlayers(normalizedPlayers);
              setAvailableRoles(
                (['mastermind', 'protagonist'] as const)
                  .filter(role => !normalizedPlayers[role].connected)
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
  }, [setPlayerRole, currentRoom, startHeartbeat, username]);

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
    username,
    setUsername,
    clearUsername,
    isConnected,
    isReconnecting,
    serverVersion,
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
