/**
 * 组合服务器 - HTTP + WebSocket 共用同一端口
 * 用于 Zeabur 等只支持单端口的 PaaS 平台
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');
const crypto = require('crypto');

// 环境配置
const dev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT, 10) || 8080;

// 初始化 Next.js
const app = next({ dev });
const handle = app.getRequestHandler();

// ============== WebSocket 房间逻辑 ==============

const VERSION = '1.0.6';
const rooms = new Map();

// 断线重连等待，key = `${roomId}:${role}`
// value = { username, roomId, roomName, role, timeout }
const pendingDisconnects = new Map();
const RECONNECT_GRACE_PERIOD = 120000; // 2分钟

function generateRoomId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function pdKey(roomId, role) {
  return `${roomId}:${role}`;
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(message);
  room.players.forEach((player, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function getRoomPlayersInfo(room) {
  const players = Array.from(room.players.values());
  const mastermindPlayer = players.find(p => p.role === 'mastermind');
  const protagonistPlayer = players.find(p => p.role === 'protagonist');
  const spectatorCount = players.filter(p => p.role === 'spectator').length;

  return {
    mastermind: mastermindPlayer
      ? { connected: true, name: mastermindPlayer.username || '未知' }
      : { connected: false, name: null },
    protagonist: protagonistPlayer
      ? { connected: true, name: protagonistPlayer.username || '未知' }
      : { connected: false, name: null },
    spectatorCount,
  };
}

function getRoomList() {
  const list = [];
  rooms.forEach((room, id) => {
    const allPlayers = Array.from(room.players.values());
    list.push({
      id,
      name: room.name,
      hasPassword: !!room.password,
      playerCount: allPlayers.filter(p => p.role && p.role !== 'spectator').length,
      spectatorCount: allPlayers.filter(p => p.role === 'spectator').length,
      players: {
        mastermind: allPlayers.some(p => p.role === 'mastermind'),
        protagonist: allPlayers.some(p => p.role === 'protagonist'),
      },
      initialized: room.gameState !== null,
    });
  });
  return list;
}

// 检查某角色在房间中是否被活跃的 WebSocket 占用
function isRoleActivelyHeld(room, role) {
  for (const [ws, player] of room.players.entries()) {
    if (player.role === role && ws.readyState === WebSocket.OPEN) {
      return true;
    }
  }
  return false;
}

// 按 username 查找 pendingDisconnects
function findPendingByUsername(username) {
  if (!username) return [];
  const results = [];
  for (const [key, pd] of pendingDisconnects.entries()) {
    if (pd.username === username) {
      results.push({ key, ...pd });
    }
  }
  return results;
}

function handleWebSocketMessage(ws, message) {
  let data;
  try {
    data = JSON.parse(message);
  } catch {
    if (message && !message.toLowerCase().includes('ping')) {
      console.error('Invalid JSON:', message.substring(0, 100));
    }
    return;
  }

  const { type, payload } = data;

  switch (type) {
    case 'IDENTIFY': {
      const { userId, username } = payload;
      if (!userId) break;

      ws.userId = userId;
      ws.username = username || null;

      // 按 username 查找未完成的断线会话，推送给客户端选择
      const pendings = findPendingByUsername(username);
      if (pendings.length > 0) {
        const pd = pendings[0];
        ws.send(JSON.stringify({
          type: 'PENDING_SESSION',
          payload: {
            roomId: pd.roomId,
            roomName: pd.roomName,
            role: pd.role,
          },
        }));
      }
      console.log(`用户身份确认: ${username || userId}`);
      break;
    }

    case 'LIST_ROOMS':
    case 'REFRESH_ROOMS': {
      ws.send(JSON.stringify({ type: 'ROOM_LIST', payload: { rooms: getRoomList() } }));
      break;
    }

    case 'CREATE_ROOM': {
      const { name, password } = payload;
      const roomId = generateRoomId();
      const roomName = name || `房间 ${roomId}`;
      const room = {
        name: roomName,
        password: password || null,
        players: new Map(),
        gameState: null,
      };
      rooms.set(roomId, room);

      room.players.set(ws, { role: null, userId: ws.userId, username: ws.username });
      ws.roomId = roomId;

      ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        payload: {
          roomId,
          roomName,
          availableRoles: ['mastermind', 'protagonist'],
          gameState: null,
          players: getRoomPlayersInfo(room),
        },
      }));
      console.log(`房间创建并加入: ${roomId} - ${roomName}`);

      if (global.broadcastRoomList) global.broadcastRoomList();
      break;
    }

    case 'JOIN_ROOM': {
      const { roomId, password } = payload;
      const room = rooms.get(roomId);

      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: '房间不存在' } }));
        return;
      }

      if (room.password && room.password !== password) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: '密码错误' } }));
        return;
      }

      if (ws.roomId) {
        const oldRoom = rooms.get(ws.roomId);
        if (oldRoom) {
          oldRoom.players.delete(ws);
        }
      }

      room.players.set(ws, { role: null, userId: ws.userId, username: ws.username });
      ws.roomId = roomId;

      const roles = Array.from(room.players.values())
        .map(p => p.role).filter(r => r && r !== 'spectator');
      ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        payload: {
          roomId,
          roomName: room.name,
          availableRoles: ['mastermind', 'protagonist'].filter(r => !roles.includes(r)),
          gameState: room.gameState,
          players: getRoomPlayersInfo(room),
        },
      }));

      broadcastToRoom(roomId, {
        type: 'PLAYER_JOINED',
        payload: { playerCount: room.players.size },
      }, ws);

      console.log(`玩家加入房间: ${roomId}, 当前人数: ${room.players.size}`);

      if (global.broadcastRoomList) global.broadcastRoomList();
      break;
    }

    case 'LEAVE_ROOM': {
      if (ws.roomId) {
        const room = rooms.get(ws.roomId);
        if (room) {
          const playerInfo = room.players.get(ws);
          room.players.delete(ws);

          broadcastToRoom(ws.roomId, {
            type: 'PLAYER_LEFT',
            payload: {
              playerCount: room.players.size,
              role: playerInfo?.role,
            },
          });

          broadcastToRoom(ws.roomId, {
            type: 'PLAYERS_UPDATE',
            payload: getRoomPlayersInfo(room),
          });

          if (room.players.size === 0) {
            rooms.delete(ws.roomId);
            console.log(`房间已删除: ${ws.roomId}`);
          }
        }
        ws.roomId = null;
      }

      ws.send(JSON.stringify({ type: 'ROOM_LEFT' }));
      break;
    }

    case 'SELECT_ROLE': {
      const role = payload?.role || data.role;
      const room = rooms.get(ws.roomId);

      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: '未加入房间' } }));
        return;
      }

      if (role !== 'spectator') {
        if (isRoleActivelyHeld(room, role)) {
          ws.send(JSON.stringify({ type: 'ERROR', payload: { message: '角色已被选择' } }));
          return;
        }
      }

      room.players.set(ws, { role, userId: ws.userId, username: ws.username });

      const updatedRoles = Array.from(room.players.values())
        .map(p => p.role)
        .filter(r => r && r !== 'spectator');

      broadcastToRoom(ws.roomId, {
        type: 'PLAYERS_UPDATE',
        payload: getRoomPlayersInfo(room),
      });

      broadcastToRoom(ws.roomId, {
        type: 'ROLE_UPDATED',
        payload: {
          availableRoles: ['mastermind', 'protagonist'].filter(r => !updatedRoles.includes(r)),
        },
      });

      ws.send(JSON.stringify({ type: 'ROLE_CONFIRMED', payload: { role } }));
      console.log(`玩家选择角色: ${role} in ${ws.roomId}`);
      break;
    }

    case 'SYNC_GAME_STATE':
    case 'UPDATE_GAME_STATE': {
      const room = rooms.get(ws.roomId);
      if (!room) return;

      if (payload.gameState) room.gameState = payload.gameState;
      if (payload.mastermindDeck) room.mastermindDeck = payload.mastermindDeck;
      if (payload.protagonistDeck) room.protagonistDeck = payload.protagonistDeck;
      if (payload.currentMastermindCards !== undefined) room.currentMastermindCards = payload.currentMastermindCards;
      if (payload.currentProtagonistCards !== undefined) room.currentProtagonistCards = payload.currentProtagonistCards;

      broadcastToRoom(ws.roomId, {
        type: 'STATE_SYNC',
        payload: payload,
      }, ws);
      break;
    }

    case 'RESET_GAME': {
      const room = rooms.get(ws.roomId);
      if (!room) return;

      room.gameState = null;

      room.players.forEach((player) => {
        player.role = null;
      });

      broadcastToRoom(ws.roomId, { type: 'GAME_RESET', payload: {} });

      broadcastToRoom(ws.roomId, {
        type: 'PLAYERS_UPDATE',
        payload: getRoomPlayersInfo(room),
      });

      console.log(`房间 ${ws.roomId} 游戏重置`);
      break;
    }

    case 'ADJUST_INDICATOR': {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      broadcastToRoom(ws.roomId, { type: 'INDICATOR_ADJUSTED', payload }, ws);
      break;
    }

    case 'TOGGLE_LIFE': {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      broadcastToRoom(ws.roomId, { type: 'LIFE_TOGGLED', payload }, ws);
      break;
    }

    case 'MOVE_CHARACTER': {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      broadcastToRoom(ws.roomId, { type: 'CHARACTER_MOVED', payload }, ws);
      break;
    }

    case 'REJOIN_ROOM': {
      const { roomId, role } = payload;
      const room = rooms.get(roomId);

      if (!room) {
        ws.send(JSON.stringify({
          type: 'REJOIN_FAILED',
          payload: { message: '房间已不存在' },
        }));
        return;
      }

      if (role && role !== 'spectator') {
        const key = pdKey(roomId, role);
        const pd = pendingDisconnects.get(key);

        if (pd) {
          // 角色在 pendingDisconnect 中 → 接管
          clearTimeout(pd.timeout);
          pendingDisconnects.delete(key);
          console.log(`重连接管 pending: ${key}`);
        } else if (isRoleActivelyHeld(room, role)) {
          // 角色被活跃连接占用 → 拒绝
          ws.send(JSON.stringify({
            type: 'REJOIN_FAILED',
            payload: { message: '角色已被占用' },
          }));
          return;
        }
        // else: 角色空闲，允许加入
      }

      // 如果该 ws 已在其它房间，先移除
      if (ws.roomId && ws.roomId !== roomId) {
        const oldRoom = rooms.get(ws.roomId);
        if (oldRoom) oldRoom.players.delete(ws);
      }

      room.players.set(ws, {
        role: role || null,
        userId: ws.userId,
        username: ws.username,
      });
      ws.roomId = roomId;

      const roles = Array.from(room.players.values())
        .map(p => p.role).filter(r => r && r !== 'spectator');

      ws.send(JSON.stringify({
        type: 'REJOIN_SUCCESS',
        payload: {
          roomId,
          roomName: room.name,
          role: role || null,
          availableRoles: ['mastermind', 'protagonist'].filter(r => !roles.includes(r)),
          gameState: room.gameState,
          players: getRoomPlayersInfo(room),
        },
      }));

      if (role) {
        ws.send(JSON.stringify({ type: 'ROLE_CONFIRMED', payload: { role } }));
      }

      // 同步完整游戏状态
      if (room.gameState) {
        ws.send(JSON.stringify({
          type: 'STATE_SYNC',
          payload: {
            gameState: room.gameState,
            mastermindDeck: room.mastermindDeck,
            protagonistDeck: room.protagonistDeck,
            currentMastermindCards: room.currentMastermindCards || [],
            currentProtagonistCards: room.currentProtagonistCards || [],
          },
        }));
      }

      // 通知其他人玩家状态变化
      broadcastToRoom(roomId, {
        type: 'PLAYERS_UPDATE',
        payload: getRoomPlayersInfo(room),
      }, ws);

      console.log(`玩家重连房间: ${roomId}, 角色: ${role || '未选择'}`);
      break;
    }

    case 'PLAY_CARDS': {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      broadcastToRoom(ws.roomId, {
        type: 'CARDS_PLAYED',
        payload: { cards: payload.cards, role: payload.role },
      }, ws);
      break;
    }

    case 'SEND_MESSAGE': {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      broadcastToRoom(ws.roomId, {
        type: 'MESSAGE_RECEIVED',
        payload: { content: payload.content, role: payload.role, timestamp: Date.now() },
      });
      break;
    }

    default:
      console.log('Unknown message type:', type);
  }
}

function handleWebSocketClose(ws) {
  if (!ws.roomId) return;

  const room = rooms.get(ws.roomId);
  if (!room) return;

  const playerInfo = room.players.get(ws);
  const role = playerInfo?.role;

  // 有角色且非旁观者 → 进入 pendingDisconnect 等待重连
  if (role && role !== 'spectator') {
    room.players.delete(ws);

    const key = pdKey(ws.roomId, role);
    const existing = pendingDisconnects.get(key);
    if (existing) clearTimeout(existing.timeout);

    const roomId = ws.roomId;
    const roomName = room.name;
    const username = ws.username || playerInfo.username;

    pendingDisconnects.set(key, {
      roomId,
      roomName,
      role,
      username,
      timeout: setTimeout(() => {
        pendingDisconnects.delete(key);
        console.log(`重连超时: ${username || '?'} @ ${roomId}:${role}`);

        const currentRoom = rooms.get(roomId);
        if (currentRoom) {
          broadcastToRoom(roomId, {
            type: 'PLAYERS_UPDATE',
            payload: getRoomPlayersInfo(currentRoom),
          });
          if (currentRoom.players.size === 0) {
            rooms.delete(roomId);
            console.log(`房间已删除: ${roomId}`);
            if (global.broadcastRoomList) global.broadcastRoomList();
          }
        }
      }, RECONNECT_GRACE_PERIOD),
    });

    console.log(`${username || ws.userId} 断开，保留 ${role} @ ${roomId} 等待重连`);
    return;
  }

  // 旁观者或无角色 → 直接移除
  room.players.delete(ws);

  broadcastToRoom(ws.roomId, {
    type: 'PLAYER_LEFT',
    payload: { playerCount: room.players.size, role },
  });

  if (room.players.size === 0) {
    rooms.delete(ws.roomId);
    console.log(`房间已删除: ${ws.roomId}`);
    if (global.broadcastRoomList) global.broadcastRoomList();
  }
}

// ============== 启动服务器 ==============

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url, true);

    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      if (typeof app.getUpgradeHandler === 'function') {
        app.getUpgradeHandler()(req, socket, head);
      }
    }
  });

  function broadcastRoomList() {
    const roomList = getRoomList();
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && !client.roomId) {
        client.send(JSON.stringify({ type: 'ROOM_LIST', payload: { rooms: roomList } }));
      }
    });
  }

  global.broadcastRoomList = broadcastRoomList;

  const HEARTBEAT_INTERVAL = 30000;

  function heartbeat() {
    this.isAlive = true;
  }

  wss.on('connection', (ws) => {
    console.log('WebSocket 客户端连接');
    ws.roomId = null;
    ws.isAlive = true;

    ws.send(JSON.stringify({ type: 'WELCOME', payload: { message: '连接成功', version: VERSION } }));
    ws.send(JSON.stringify({ type: 'ROOM_LIST', payload: { rooms: getRoomList() } }));

    ws.on('pong', heartbeat);

    ws.on('message', (message) => {
      ws.isAlive = true;
      const msgStr = message.toString().trim();

      if (msgStr.toLowerCase() === 'ping') {
        ws.send('pong');
        return;
      }

      if (!msgStr) return;
      handleWebSocketMessage(ws, msgStr);
    });

    ws.on('close', () => {
      console.log('WebSocket 客户端断开');
      handleWebSocketClose(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error);
    });
  });

  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log('心跳超时，断开连接');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  server.listen(PORT, () => {
    console.log(`🚀 Board Game Hub 服务已启动 v${VERSION}`);
    console.log(`   地址: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`   环境: ${dev ? '开发' : '生产'}`);
  });
});
