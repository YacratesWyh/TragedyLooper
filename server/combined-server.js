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
      
      // 创建者自动加入房间
      room.players.set(ws, { role: null });
      ws.roomId = roomId;
      
      ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        payload: {
          roomId,
          roomName,
          availableRoles: ['mastermind', 'protagonist'],
          gameState: null,
          players: { mastermind: false, protagonist: false },
        },
      }));
      console.log(`房间创建并加入: ${roomId} - ${roomName}`);
      
      // 广播房间列表更新
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
      
      // 广播房间列表更新
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

      // 检查角色是否已被占用
      const existingRoles = Array.from(room.players.values()).map(p => p.role).filter(Boolean);
      if (existingRoles.includes(role)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: '角色已被选择' } }));
        return;
      }

      // 设置角色
      room.players.set(ws, { role });
      
      // 计算当前玩家状态
      const updatedRoles = Array.from(room.players.values()).map(p => p.role).filter(Boolean);
      const playerStatus = {
        mastermind: updatedRoles.includes('mastermind'),
        protagonist: updatedRoles.includes('protagonist'),
      };
      
      // 广播玩家状态更新（这是客户端需要的）
      broadcastToRoom(ws.roomId, {
        type: 'PLAYERS_UPDATE',
        payload: playerStatus,
      });
      
      // 广播可用角色更新
      broadcastToRoom(ws.roomId, {
        type: 'ROLE_UPDATED',
        payload: {
          availableRoles: ['mastermind', 'protagonist'].filter(r => !updatedRoles.includes(r)),
        },
      });

      // 确认选择
      ws.send(JSON.stringify({ type: 'ROLE_CONFIRMED', payload: { role } }));
      console.log(`玩家选择角色: ${role} in ${ws.roomId}`);
      break;
    }

    case 'SYNC_GAME_STATE':
    case 'UPDATE_GAME_STATE': {
      const room = rooms.get(ws.roomId);
      if (!room) return;

      // 保存完整状态
      if (payload.gameState) room.gameState = payload.gameState;
      
      // 广播给其他玩家
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
      broadcastToRoom(ws.roomId, { type: 'GAME_RESET', payload: {} });
      console.log(`房间 ${ws.roomId} 游戏重置`);
      break;
    }

    case 'ADJUST_INDICATOR': {
      const room = rooms.get(ws.roomId);
      if (!room) return;

      broadcastToRoom(ws.roomId, {
        type: 'INDICATOR_ADJUSTED',
        payload: payload,
      });
      break;
    }

    case 'TOGGLE_LIFE': {
      const room = rooms.get(ws.roomId);
      if (!room) return;

      broadcastToRoom(ws.roomId, {
        type: 'LIFE_TOGGLED',
        payload: payload,
      });
      break;
    }

    case 'MOVE_CHARACTER': {
      const room = rooms.get(ws.roomId);
      if (!room) return;

      broadcastToRoom(ws.roomId, {
        type: 'CHARACTER_MOVED',
        payload: payload,
      });
      break;
    }

    case 'REJOIN_ROOM': {
      const { roomId, role } = payload;
      const room = rooms.get(roomId);
      
      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: '房间已不存在' } }));
        return;
      }

      room.players.set(ws, { role: role || null });
      ws.roomId = roomId;

      const roles = Array.from(room.players.values()).map(p => p.role).filter(Boolean);
      ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        payload: {
          roomId,
          roomName: room.name,
          availableRoles: ['mastermind', 'protagonist'].filter(r => !roles.includes(r)),
          gameState: room.gameState,
          players: {
            mastermind: roles.includes('mastermind'),
            protagonist: roles.includes('protagonist'),
          },
        },
      }));

      if (role) {
        ws.send(JSON.stringify({ type: 'ROLE_CONFIRMED', payload: { role } }));
      }

      console.log(`玩家重连房间: ${roomId}, 角色: ${role || '未选择'}`);
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
        // 广播房间列表更新
        if (global.broadcastRoomList) global.broadcastRoomList();
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

  // 广播房间列表给所有在大厅的客户端
  function broadcastRoomList() {
    const roomList = getRoomList();
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && !client.roomId) {
        client.send(JSON.stringify({ type: 'ROOM_LIST', payload: { rooms: roomList } }));
      }
    });
  }

  // 暴露给消息处理函数
  global.broadcastRoomList = broadcastRoomList;

  // 心跳检测：30秒间隔
  const HEARTBEAT_INTERVAL = 30000;
  
  function heartbeat() {
    this.isAlive = true;
  }

  wss.on('connection', (ws) => {
    console.log('WebSocket 客户端连接');
    ws.roomId = null;
    ws.isAlive = true;

    // 发送欢迎消息和房间列表
    ws.send(JSON.stringify({ type: 'WELCOME', payload: { message: '连接成功' } }));
    ws.send(JSON.stringify({ type: 'ROOM_LIST', payload: { rooms: getRoomList() } }));

    ws.on('pong', heartbeat);

    ws.on('message', (message) => {
      ws.isAlive = true; // 收到消息也算活跃
      const msgStr = message.toString();
      
      // 处理客户端心跳
      if (msgStr === 'ping') {
        ws.send('pong');
        return;
      }
      
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

  // 定期检查连接活跃性
  const heartbeatInterval = setInterval(() => {
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
    console.log(`🚀 Tragedy Looper 服务已启动`);
    console.log(`   地址: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`   环境: ${dev ? '开发' : '生产'}`);
  });
});
