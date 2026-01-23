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

// ============== WebSocket 房间逻辑（从 websocket-server.js 复制）==============

const rooms = new Map();

function generateRoomId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
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

function getRoomList() {
  const list = [];
  rooms.forEach((room, id) => {
    list.push({
      id,
      name: room.name,
      hasPassword: !!room.password,
      playerCount: room.players.size,
      players: {
        mastermind: Array.from(room.players.values()).some(p => p.role === 'mastermind'),
        protagonist: Array.from(room.players.values()).some(p => p.role === 'protagonist'),
      },
      initialized: room.gameState !== null,
    });
  });
  return list;
}

function handleWebSocketMessage(ws, message) {
  let data;
  try {
    data = JSON.parse(message);
  } catch (e) {
    console.error('Invalid JSON:', message);
    return;
  }

  const { type, payload } = data;

  switch (type) {
    case 'LIST_ROOMS': {
      ws.send(JSON.stringify({ type: 'ROOM_LIST', payload: getRoomList() }));
      break;
    }

    case 'CREATE_ROOM': {
      const { name, password } = payload;
      const roomId = generateRoomId();
      rooms.set(roomId, {
        name: name || `房间 ${roomId}`,
        password: password || null,
        players: new Map(),
        gameState: null,
      });
      ws.send(JSON.stringify({ type: 'ROOM_CREATED', payload: { roomId, name: rooms.get(roomId).name } }));
      console.log(`房间创建: ${roomId} - ${rooms.get(roomId).name}`);
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

      room.players.set(ws, { role: null });
      ws.roomId = roomId;

      const roles = Array.from(room.players.values()).map(p => p.role).filter(Boolean);
      ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        payload: {
          roomId,
          name: room.name,
          availableRoles: ['mastermind', 'protagonist'].filter(r => !roles.includes(r)),
          gameState: room.gameState,
        },
      }));

      broadcastToRoom(roomId, {
        type: 'PLAYER_JOINED',
        payload: { playerCount: room.players.size },
      }, ws);

      console.log(`玩家加入房间: ${roomId}, 当前人数: ${room.players.size}`);
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
      const { role } = payload;
      const room = rooms.get(ws.roomId);
      
      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: '未加入房间' } }));
        return;
      }

      const existingRoles = Array.from(room.players.values()).map(p => p.role);
      if (existingRoles.includes(role)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: '角色已被选择' } }));
        return;
      }

      room.players.set(ws, { role });
      
      const updatedRoles = Array.from(room.players.values()).map(p => p.role).filter(Boolean);
      broadcastToRoom(ws.roomId, {
        type: 'ROLE_UPDATED',
        payload: {
          availableRoles: ['mastermind', 'protagonist'].filter(r => !updatedRoles.includes(r)),
        },
      });

      ws.send(JSON.stringify({ type: 'ROLE_SELECTED', payload: { role } }));
      console.log(`玩家选择角色: ${role} in ${ws.roomId}`);
      break;
    }

    case 'SYNC_GAME_STATE': {
      const { gameState } = payload;
      const room = rooms.get(ws.roomId);
      
      if (!room) return;

      room.gameState = gameState;
      broadcastToRoom(ws.roomId, {
        type: 'GAME_STATE_UPDATED',
        payload: { gameState },
      }, ws);
      break;
    }

    case 'PLAY_CARDS': {
      const { cards, role } = payload;
      const room = rooms.get(ws.roomId);
      
      if (!room) return;

      broadcastToRoom(ws.roomId, {
        type: 'CARDS_PLAYED',
        payload: { cards, role },
      }, ws);
      break;
    }

    case 'SEND_MESSAGE': {
      const { content, role } = payload;
      const room = rooms.get(ws.roomId);
      
      if (!room) return;

      broadcastToRoom(ws.roomId, {
        type: 'MESSAGE_RECEIVED',
        payload: { content, role, timestamp: Date.now() },
      });
      break;
    }

    default:
      console.log('Unknown message type:', type);
  }
}

function handleWebSocketClose(ws) {
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

      if (room.players.size === 0) {
        rooms.delete(ws.roomId);
        console.log(`房间已删除: ${ws.roomId}`);
      }
    }
  }
}

// ============== 启动服务器 ==============

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // WebSocket 服务器挂载到同一个 HTTP 服务器
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket 客户端连接');
    ws.roomId = null;

    ws.on('message', (message) => {
      handleWebSocketMessage(ws, message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket 客户端断开');
      handleWebSocketClose(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error);
    });
  });

  server.listen(PORT, () => {
    console.log(`🚀 Tragedy Looper 服务已启动`);
    console.log(`   地址: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`   环境: ${dev ? '开发' : '生产'}`);
  });
});
