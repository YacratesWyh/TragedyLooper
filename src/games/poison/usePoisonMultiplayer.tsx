'use client';

/**
 * Poison 专用联机 hook
 *
 * 独立 WebSocket 连接，不依赖 TL 的 useMultiplayer。
 * 身份层复用 src/shared/identity.ts（UUID + username）。
 * 玩家槽位用 SELECT_ROLE player_0…player_5 约定，服务端零改动。
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getOrCreateUserId, getUsername, setUsername } from '@/shared/identity';
import { usePoisonStore } from './store';
import type { PoisonGameState } from './types';

const POISON_SESSION_KEY = 'poison_session_v1';
const SESSION_TTL = 5 * 60 * 1000;

interface PoisonSession {
  roomId: string;
  roomName: string;
  role: string; // 'player_0' … 'player_5'
  timestamp: number;
}

function saveSession(data: Omit<PoisonSession, 'timestamp'>) {
  try {
    sessionStorage.setItem(
      POISON_SESSION_KEY,
      JSON.stringify({ ...data, timestamp: Date.now() }),
    );
  } catch {}
}

function loadSession(): PoisonSession | null {
  try {
    const raw = sessionStorage.getItem(POISON_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PoisonSession;
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
    sessionStorage.removeItem(POISON_SESSION_KEY);
  } catch {}
}

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8080/ws';
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export interface RoomInfo {
  id: string;
  name: string;
  hasPassword: boolean;
  playerCount: number;
}

export interface PendingSessionInfo {
  roomId: string;
  roomName: string;
  role: string;
}

export interface PoisonMultiplayer {
  isConnected: boolean;
  isReconnecting: boolean;

  username: string | null;
  setName: (name: string) => void;

  rooms: RoomInfo[];
  roomId: string | null;
  roomName: string | null;

  myPlayerIndex: number | null;
  isHost: boolean;
  isSpectator: boolean;
  connectedCount: number;
  playerNames: string[];

  pendingSession: PendingSessionInfo | null;
  rejoinPending: () => void;
  dismissPending: () => void;

  connect: () => void;
  disconnect: () => void;
  createRoom: (name: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  claimSlot: () => void;
  spectate: () => void;
  refreshRooms: () => void;
  syncGameState: (state: PoisonGameState) => void;
}

export function usePoisonMultiplayer(): PoisonMultiplayer {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [usernameState, setUsernameState] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<PendingSessionInfo | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalRef = useRef(false);
  const currentRoomIdRef = useRef<string | null>(null);
  const MAX_RECONNECT = 15;

  useEffect(() => {
    setUsernameState(getUsername());
  }, []);

  const setName = useCallback((name: string) => {
    setUsername(name);
    setUsernameState(name.trim());
  }, []);

  const myPlayerIndex = myRole?.startsWith('player_')
    ? parseInt(myRole.replace('player_', ''), 10)
    : null;
  const isHost = myPlayerIndex === 0;
  const isSpectator = myRole === 'spectator';

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    const name = getUsername();
    if (!name) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    intentionalRef.current = false;
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;

      heartbeatRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send('ping');
        }
      }, 25000);

      ws.send(JSON.stringify({
        type: 'IDENTIFY',
        payload: { userId: getOrCreateUserId(), username: name },
      }));

      const session = loadSession();
      if (session) {
        ws.send(JSON.stringify({
          type: 'REJOIN_ROOM',
          payload: { userId: getOrCreateUserId(), roomId: session.roomId, role: session.role },
        }));
      }
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') return;
      try {
        const data = JSON.parse(event.data as string) as { type: string; payload: Record<string, unknown> };

        switch (data.type) {
          case 'WELCOME':
            if (data.payload.rooms) setRooms(data.payload.rooms as RoomInfo[]);
            break;

          case 'ROOM_LIST':
            setRooms((data.payload.rooms as RoomInfo[]) || []);
            break;

          case 'ROOM_JOINED': {
            const rid = data.payload.roomId as string;
            const rname = data.payload.roomName as string;
            setRoomId(rid);
            setRoomName(rname);
            currentRoomIdRef.current = rid;
            updatePlayersFromInfo(data.payload.players);
            if (data.payload.gameState) {
              usePoisonStore.getState().setGameState(data.payload.gameState as PoisonGameState);
            }
            break;
          }

          case 'REJOIN_SUCCESS': {
            const rid = data.payload.roomId as string;
            setPendingSession(null);
            setRoomId(rid);
            setRoomName(data.payload.roomName as string);
            setMyRole(data.payload.role as string);
            currentRoomIdRef.current = rid;
            updatePlayersFromInfo(data.payload.players);
            saveSession({
              roomId: rid,
              roomName: data.payload.roomName as string,
              role: data.payload.role as string,
            });
            break;
          }

          case 'PENDING_SESSION':
            setPendingSession({
              roomId: data.payload.roomId as string,
              roomName: data.payload.roomName as string,
              role: data.payload.role as string,
            });
            break;

          case 'REJOIN_FAILED':
            clearSession();
            setPendingSession(null);
            break;

          case 'ROOM_LEFT':
            setRoomId(null);
            setRoomName(null);
            setMyRole(null);
            setConnectedCount(0);
            setPlayerNames([]);
            currentRoomIdRef.current = null;
            clearSession();
            if (data.payload?.rooms) setRooms(data.payload.rooms as RoomInfo[]);
            break;

          case 'ROLE_CONFIRMED': {
            const role = data.payload.role as string;
            setMyRole(role);
            if (currentRoomIdRef.current) {
              saveSession({
                roomId: currentRoomIdRef.current,
                roomName: roomName ?? '',
                role,
              });
            }
            break;
          }

          case 'PLAYERS_UPDATE':
          case 'PLAYER_JOINED':
            updatePlayersFromInfo(data.payload);
            break;

          case 'STATE_SYNC':
            if (data.payload.gameState) {
              usePoisonStore.getState().setGameState(data.payload.gameState as PoisonGameState);
            }
            break;

          case 'GAME_RESET':
            usePoisonStore.getState().resetGame();
            clearSession();
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
      setIsConnected(false);
      clearTimers();

      const session = loadSession();
      if (!intentionalRef.current && session && reconnectAttemptsRef.current < MAX_RECONNECT) {
        setIsReconnecting(true);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, 2000);
      } else {
        setIsReconnecting(false);
        setRoomId(null);
        setMyRole(null);
        currentRoomIdRef.current = null;
      }
    };

    ws.onerror = () => {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, clearTimers]);

  function updatePlayersFromInfo(info: unknown) {
    if (!info || typeof info !== 'object') return;
    const obj = info as Record<string, unknown>;

    // 新格式：{ player_0: { connected, name }, player_1: ... }
    const slots = Object.keys(obj)
      .filter((k) => k.startsWith('player_'))
      .sort();

    if (slots.length > 0) {
      const names = slots.map((k) => {
        const slot = obj[k] as { connected?: boolean; name?: string | null };
        return slot?.name ?? `Player ${k.replace('player_', '')}`;
      });
      const connected = slots.filter((k) => {
        const slot = obj[k] as { connected?: boolean };
        return slot?.connected;
      }).length;
      setPlayerNames(names);
      setConnectedCount(connected);
    } else if (typeof obj.playerCount === 'number') {
      setConnectedCount(obj.playerCount as number);
    }
  }

  const disconnect = useCallback(() => {
    intentionalRef.current = true;
    clearTimers();
    clearSession();
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setIsReconnecting(false);
    setRoomId(null);
    setMyRole(null);
    setPendingSession(null);
    currentRoomIdRef.current = null;
    reconnectAttemptsRef.current = 0;
  }, [clearTimers]);

  useEffect(() => () => { clearTimers(); wsRef.current?.close(); }, [clearTimers]);

  const send = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const createRoom = useCallback((name: string) => {
    send({ type: 'CREATE_ROOM', payload: { name, password: '' } });
  }, [send]);

  const joinRoom = useCallback((rid: string) => {
    send({ type: 'JOIN_ROOM', payload: { roomId: rid, password: '' } });
  }, [send]);

  const leaveRoom = useCallback(() => {
    clearSession();
    send({ type: 'LEAVE_ROOM' });
  }, [send]);

  const claimSlot = useCallback(() => {
    const nextIndex = connectedCount;
    send({ type: 'SELECT_ROLE', role: `player_${nextIndex}` });
  }, [send, connectedCount]);

  const spectate = useCallback(() => {
    send({ type: 'SELECT_ROLE', role: 'spectator' });
  }, [send]);

  const rejoinPending = useCallback(() => {
    if (!pendingSession) return;
    send({
      type: 'REJOIN_ROOM',
      payload: { roomId: pendingSession.roomId, role: pendingSession.role },
    });
    setPendingSession(null);
  }, [send, pendingSession]);

  const dismissPending = useCallback(() => {
    setPendingSession(null);
  }, []);

  const refreshRooms = useCallback(() => {
    send({ type: 'REFRESH_ROOMS' });
  }, [send]);

  const syncGameState = useCallback((state: PoisonGameState) => {
    send({ type: 'SYNC_GAME_STATE', payload: { gameState: state } });
  }, [send]);

  return {
    isConnected,
    isReconnecting,
    username: usernameState,
    setName,
    rooms,
    roomId,
    roomName,
    myPlayerIndex,
    isHost,
    isSpectator,
    connectedCount,
    playerNames,
    pendingSession,
    rejoinPending,
    dismissPending,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    claimSlot,
    spectate,
    refreshRooms,
    syncGameState,
  };
}
