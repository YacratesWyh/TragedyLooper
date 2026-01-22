/**
 * 统一服务器入口
 * 同时处理 Next.js 和 WebSocket（多房间版），共享同一端口
 * 用于 Render.com 等云平台部署
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');
const crypto = require('crypto');

// 环境配置
const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';

// 安全解析端口，处理无效值
function parsePort(envPort) {
  if (!envPort) return 3000;
  const parsed = parseInt(envPort, 10);
  return isNaN(parsed) ? 3000 : parsed;
}
const port = parsePort(process.env.PORT);

console.log('🔧 环境配置:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || '(未设置)'}`);
console.log(`   PORT: ${port}`);
console.log(`   开发模式: ${dev}`);
console.log(`   工作目录: ${process.cwd()}`);

// 初始化 Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ============ 多房间 WebSocket 逻辑 ============

// 房间数据结构
function createRoom(id, name, password = '') {
  return {
    id,
    name,
    password,
    createdAt: Date.now(),
    initialized: false,
    gameState: null,
    mastermindDeck: null,
    protagonistDeck: null,
    currentMastermindCards: [],
    currentProtagonistCards: [],
    players: {
      mastermind: null,
      protagonist: null,
    },
  };
}

// 所有房间
const rooms = new Map();

// 生成房间ID
function generateRoomId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// 工具函数
function isPlayerConnected(room, role) {
  if (!room) return false;
  const ws = room.players[role];
  if (!ws) return false;
  if (ws.readyState !== WebSocket.OPEN) {
    room.players[role] = null;
    return false;
  }
  return true;
}

function getAvailableRoles(room) {
  if (!room) return [];
  const roles = [];
  if (!isPlayerConnected(room, 'mastermind')) roles.push('mastermind');
  if (!isPlayerConnected(room, 'protagonist')) roles.push('protagonist');
  return roles;
}

function sendTo(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastToRoom(room, data, excludeWs = null) {
  if (!room) return;
  const message = JSON.stringify(data);
  
  [room.players.mastermind, room.players.protagonist].forEach(ws => {
    if (ws && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function getRoomList() {
  const list = [];
  rooms.forEach((room, id) => {
    const mmConnected = isPlayerConnected(room, 'mastermind');
    const proConnected = isPlayerConnected(room, 'protagonist');
    list.push({
      id,
      name: room.name,
      hasPassword: !!room.password,
      playerCount: (mmConnected ? 1 : 0) + (proConnected ? 1 : 0),
      players: {
        mastermind: mmConnected,
        protagonist: proConnected,
      },
      initialized: room.initialized,
    });
  });
  return list;
}

function broadcastRoomList(wss) {
  const roomList = getRoomList();
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && !client.roomId) {
      sendTo(client, {
        type: 'ROOM_LIST',
        payload: { rooms: roomList },
      });
    }
  });
}

function broadcastRoomState(room) {
  if (!room) return;
  
  const mmConnected = isPlayerConnected(room, 'mastermind');
  const proConnected = isPlayerConnected(room, 'protagonist');

  broadcastToRoom(room, {
    type: 'STATE_SYNC',
    payload: {
      gameState: room.gameState,
      mastermindDeck: room.mastermindDeck,
      protagonistDeck: room.protagonistDeck,
      currentMastermindCards: room.currentMastermindCards,
      currentProtagonistCards: room.currentProtagonistCards,
      players: {
        mastermind: mmConnected,
        protagonist: proConnected,
      },
    },
  });
}

function broadcastPlayerStatus(room) {
  if (!room) return;
  
  const status = {
    mastermind: isPlayerConnected(room, 'mastermind'),
    protagonist: isPlayerConnected(room, 'protagonist'),
  };
  
  console.log(`📢 [${room.id}] 广播玩家状态:`, status);
  broadcastToRoom(room, {
    type: 'PLAYERS_UPDATE',
    payload: status,
  });
}

function cleanupEmptyRooms() {
  rooms.forEach((room, id) => {
    const mmConnected = isPlayerConnected(room, 'mastermind');
    const proConnected = isPlayerConnected(room, 'protagonist');
    if (!mmConnected && !proConnected) {
      if (Date.now() - room.createdAt > 5 * 60 * 1000) {
        rooms.delete(id);
        console.log(`🗑️ 删除空房间: ${id}`);
      }
    }
  });
}

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  console.log('🔌 WebSocket 服务已附加到 HTTP 服务器 (路径: /ws)');

  wss.on('connection', (ws) => {
    console.log('✅ 新连接');
    
    // 发送房间列表
    sendTo(ws, {
      type: 'WELCOME',
      payload: {
        rooms: getRoomList(),
      },
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          // ========== 房间操作 ==========
          
          case 'CREATE_ROOM': {
            const { name, password } = data.payload || {};
            const roomName = (name || '').trim() || '未命名房间';
            const roomId = generateRoomId();
            
            const room = createRoom(roomId, roomName, password || '');
            rooms.set(roomId, room);
            
            console.log(`🏠 创建房间: ${roomId} "${roomName}" ${password ? '(有密码)' : ''}`);
            
            ws.roomId = roomId;
            
            sendTo(ws, {
              type: 'ROOM_JOINED',
              payload: {
                roomId,
                roomName,
                availableRoles: getAvailableRoles(room),
                players: { mastermind: false, protagonist: false },
              },
            });
            
            broadcastRoomList(wss);
            break;
          }
          
          case 'JOIN_ROOM': {
            const { roomId, password } = data.payload || {};
            const room = rooms.get(roomId);
            
            if (!room) {
              sendTo(ws, { type: 'ERROR', payload: { message: '房间不存在' } });
              return;
            }
            
            if (room.password && room.password !== password) {
              sendTo(ws, { type: 'ERROR', payload: { message: '密码错误' } });
              return;
            }
            
            const mmConnected = isPlayerConnected(room, 'mastermind');
            const proConnected = isPlayerConnected(room, 'protagonist');
            if (mmConnected && proConnected) {
              sendTo(ws, { type: 'ERROR', payload: { message: '房间已满' } });
              return;
            }
            
            ws.roomId = roomId;
            
            console.log(`🚪 玩家加入房间: ${roomId}`);
            
            sendTo(ws, {
              type: 'ROOM_JOINED',
              payload: {
                roomId,
                roomName: room.name,
                availableRoles: getAvailableRoles(room),
                players: { mastermind: mmConnected, protagonist: proConnected },
                initialized: room.initialized,
              },
            });
            
            if (room.initialized) {
              sendTo(ws, {
                type: 'STATE_SYNC',
                payload: {
                  gameState: room.gameState,
                  mastermindDeck: room.mastermindDeck,
                  protagonistDeck: room.protagonistDeck,
                  currentMastermindCards: room.currentMastermindCards,
                  currentProtagonistCards: room.currentProtagonistCards,
                  players: { mastermind: mmConnected, protagonist: proConnected },
                },
              });
            }
            
            broadcastRoomList(wss);
            break;
          }
          
          case 'LEAVE_ROOM': {
            const roomId = ws.roomId;
            const room = rooms.get(roomId);
            
            if (room && ws.playerRole) {
              if (room.players[ws.playerRole] === ws) {
                room.players[ws.playerRole] = null;
              }
              broadcastPlayerStatus(room);
            }
            
            delete ws.roomId;
            delete ws.playerRole;
            
            console.log(`🚶 玩家离开房间: ${roomId}`);
            
            sendTo(ws, {
              type: 'ROOM_LEFT',
              payload: { rooms: getRoomList() },
            });
            
            broadcastRoomList(wss);
            break;
          }
          
          case 'REFRESH_ROOMS': {
            sendTo(ws, {
              type: 'ROOM_LIST',
              payload: { rooms: getRoomList() },
            });
            break;
          }
          
          // ========== 游戏操作 ==========
          
          case 'SELECT_ROLE': {
            const { role } = data;
            const room = rooms.get(ws.roomId);
            
            if (!room) {
              sendTo(ws, { type: 'ERROR', payload: { message: '请先加入房间' } });
              return;
            }
            
            if (isPlayerConnected(room, role)) {
              sendTo(ws, { type: 'ERROR', payload: { message: '该角色已被占用' } });
              return;
            }
            
            room.players[role] = ws;
            ws.playerRole = role;
            
            console.log(`🎭 [${ws.roomId}] 玩家选择: ${role === 'mastermind' ? '剧作家' : '主人公'}`);
            
            sendTo(ws, {
              type: 'ROLE_CONFIRMED',
              payload: { role },
            });
            
            broadcastPlayerStatus(room);
            broadcastRoomList(wss);
            
            if (room.initialized) {
              sendTo(ws, {
                type: 'STATE_SYNC',
                payload: {
                  gameState: room.gameState,
                  mastermindDeck: room.mastermindDeck,
                  protagonistDeck: room.protagonistDeck,
                  currentMastermindCards: room.currentMastermindCards,
                  currentProtagonistCards: room.currentProtagonistCards,
                  players: {
                    mastermind: isPlayerConnected(room, 'mastermind'),
                    protagonist: isPlayerConnected(room, 'protagonist'),
                  },
                },
              });
            }
            break;
          }
          
          case 'INIT_GAME': {
            const room = rooms.get(ws.roomId);
            if (!room) return;
            
            const { gameState, mastermindDeck, protagonistDeck } = data.payload;
            
            room.initialized = true;
            room.gameState = gameState;
            room.mastermindDeck = mastermindDeck ? {
              ...mastermindDeck,
              usedToday: Array.isArray(mastermindDeck.usedToday) ? mastermindDeck.usedToday : [],
              usedThisLoop: Array.isArray(mastermindDeck.usedThisLoop) ? mastermindDeck.usedThisLoop : [],
            } : null;
            room.protagonistDeck = protagonistDeck ? {
              ...protagonistDeck,
              usedToday: Array.isArray(protagonistDeck.usedToday) ? protagonistDeck.usedToday : [],
              usedThisLoop: Array.isArray(protagonistDeck.usedThisLoop) ? protagonistDeck.usedThisLoop : [],
            } : null;
            room.currentMastermindCards = [];
            room.currentProtagonistCards = [];
            
            console.log(`🎮 [${ws.roomId}] 游戏已初始化`);
            
            broadcastRoomState(room);
            broadcastRoomList(wss);
            break;
          }
          
          case 'PLAY_CARD': {
            const room = rooms.get(ws.roomId);
            if (!room) return;
            
            const { role, card, targetId, targetType } = data.payload;
            
            if (ws.playerRole !== role) {
              sendTo(ws, { type: 'ERROR', payload: { message: '不是你的回合' } });
              return;
            }
            
            const playedCard = { ...card, targetId, targetType, playedBy: role };
            
            if (role === 'mastermind') {
              room.currentMastermindCards.push(playedCard);
              if (room.mastermindDeck) {
                room.mastermindDeck.usedToday.push(card.id);
                if (card.oncePerLoop) {
                  room.mastermindDeck.usedThisLoop.push(card.id);
                }
              }
            } else {
              room.currentProtagonistCards.push(playedCard);
              if (room.protagonistDeck) {
                room.protagonistDeck.usedToday.push(card.id);
                if (card.oncePerLoop) {
                  room.protagonistDeck.usedThisLoop.push(card.id);
                }
              }
            }
            
            console.log(`🃏 [${ws.roomId}] ${role} 打出牌 -> ${targetId}`);
            
            broadcastRoomState(room);
            break;
          }
          
          case 'RETREAT_CARD': {
            const room = rooms.get(ws.roomId);
            if (!room) return;
            
            const { role, cardId } = data.payload;
            
            if (ws.playerRole !== role) {
              sendTo(ws, { type: 'ERROR', payload: { message: '无法撤回他人的牌' } });
              return;
            }
            
            if (role === 'mastermind') {
              const card = room.currentMastermindCards.find(c => c.id === cardId);
              room.currentMastermindCards = room.currentMastermindCards.filter(c => c.id !== cardId);
              if (card && room.mastermindDeck) {
                room.mastermindDeck.usedToday = room.mastermindDeck.usedToday.filter(id => id !== cardId);
                room.mastermindDeck.usedThisLoop = room.mastermindDeck.usedThisLoop.filter(id => id !== cardId);
              }
            } else {
              const card = room.currentProtagonistCards.find(c => c.id === cardId);
              room.currentProtagonistCards = room.currentProtagonistCards.filter(c => c.id !== cardId);
              if (card && room.protagonistDeck) {
                room.protagonistDeck.usedToday = room.protagonistDeck.usedToday.filter(id => id !== cardId);
                room.protagonistDeck.usedThisLoop = room.protagonistDeck.usedThisLoop.filter(id => id !== cardId);
              }
            }
            
            console.log(`↩️ [${ws.roomId}] ${role} 撤回牌 ${cardId}`);
            
            broadcastRoomState(room);
            break;
          }
          
          case 'ADVANCE_PHASE': {
            const room = rooms.get(ws.roomId);
            if (!room) return;
            
            const { newPhase, gameState: newGameState } = data.payload;
            
            room.gameState = newGameState;
            
            if (newPhase === 'dawn') {
              if (room.mastermindDeck) room.mastermindDeck.usedToday = [];
              if (room.protagonistDeck) room.protagonistDeck.usedToday = [];
              room.currentMastermindCards = [];
              room.currentProtagonistCards = [];
              console.log(`🧹 [${ws.roomId}] 新的一天开始，已重置每日卡牌`);
            }
            
            console.log(`⏩ [${ws.roomId}] 阶段推进: ${newPhase}`);
            
            broadcastRoomState(room);
            break;
          }
          
          case 'UPDATE_GAME_STATE': {
            const room = rooms.get(ws.roomId);
            if (!room) return;
            
            if (data.payload.gameState) {
              room.gameState = data.payload.gameState;
            }
            if (data.payload.mastermindDeck) {
              const deck = data.payload.mastermindDeck;
              room.mastermindDeck = {
                ...deck,
                usedToday: Array.isArray(deck.usedToday) ? deck.usedToday : [],
                usedThisLoop: Array.isArray(deck.usedThisLoop) ? deck.usedThisLoop : [],
              };
            }
            if (data.payload.protagonistDeck) {
              const deck = data.payload.protagonistDeck;
              room.protagonistDeck = {
                ...deck,
                usedToday: Array.isArray(deck.usedToday) ? deck.usedToday : [],
                usedThisLoop: Array.isArray(deck.usedThisLoop) ? deck.usedThisLoop : [],
              };
            }
            if (data.payload.currentMastermindCards !== undefined) {
              room.currentMastermindCards = data.payload.currentMastermindCards;
            }
            if (data.payload.currentProtagonistCards !== undefined) {
              room.currentProtagonistCards = data.payload.currentProtagonistCards;
            }
            
            broadcastRoomState(room);
            break;
          }
          
          case 'ADJUST_INDICATOR': {
            const room = rooms.get(ws.roomId);
            if (!room || !room.gameState) return;
            
            const { characterId, type, delta } = data.payload;
            
            room.gameState.characters = room.gameState.characters.map(char => {
              if (char.id === characterId) {
                const newValue = Math.max(0, char.indicators[type] + delta);
                return { ...char, indicators: { ...char.indicators, [type]: newValue } };
              }
              return char;
            });
            
            console.log(`📊 [${ws.roomId}] 调整指示物: ${characterId} ${type} ${delta > 0 ? '+' : ''}${delta}`);
            
            broadcastRoomState(room);
            break;
          }
          
          case 'TOGGLE_LIFE': {
            const room = rooms.get(ws.roomId);
            if (!room || !room.gameState) return;
            
            const { characterId } = data.payload;
            
            room.gameState.characters = room.gameState.characters.map(char => {
              if (char.id === characterId) {
                return { ...char, alive: !char.alive };
              }
              return char;
            });
            
            console.log(`💀 [${ws.roomId}] 切换存活状态: ${characterId}`);
            
            broadcastRoomState(room);
            break;
          }
          
          case 'MOVE_CHARACTER': {
            const room = rooms.get(ws.roomId);
            if (!room || !room.gameState) return;
            
            const { characterId, location } = data.payload;
            
            room.gameState.characters = room.gameState.characters.map(char => {
              if (char.id === characterId) {
                return { ...char, location };
              }
              return char;
            });
            
            console.log(`🏃 [${ws.roomId}] 移动角色: ${characterId} -> ${location}`);
            
            broadcastRoomState(room);
            break;
          }
          
          case 'RESET_GAME': {
            const room = rooms.get(ws.roomId);
            if (!room) return;
            
            room.initialized = false;
            room.gameState = null;
            room.mastermindDeck = null;
            room.protagonistDeck = null;
            room.currentMastermindCards = [];
            room.currentProtagonistCards = [];
            room.players.mastermind = null;
            room.players.protagonist = null;
            
            wss.clients.forEach(client => {
              if (client.roomId === ws.roomId) {
                delete client.playerRole;
              }
            });
            
            console.log(`🔄 [${ws.roomId}] 游戏已重置`);
            
            broadcastToRoom(room, { type: 'GAME_RESET' });
            broadcastPlayerStatus(room);
            broadcastRoomList(wss);
            break;
          }
          
          default:
            console.log('⚠️ 未知消息类型:', data.type);
        }
      } catch (e) {
        console.error('❌ 消息处理错误:', e);
      }
    });

    ws.on('close', () => {
      const roomId = ws.roomId;
      const room = rooms.get(roomId);
      const role = ws.playerRole;
      
      if (room && role && room.players[role] === ws) {
        room.players[role] = null;
        console.log(`👋 [${roomId}] ${role === 'mastermind' ? '剧作家' : '主人公'} 离开`);
        broadcastPlayerStatus(room);
        broadcastRoomList(wss);
      }
    });
  });

  // 定期清理空房间
  setInterval(cleanupEmptyRooms, 60000);

  // 定期显示状态
  setInterval(() => {
    console.log(`[状态] 房间数: ${rooms.size} | 连接数: ${wss.clients.size}`);
    rooms.forEach((room, id) => {
      const mm = isPlayerConnected(room, 'mastermind') ? '✅' : '❌';
      const pro = isPlayerConnected(room, 'protagonist') ? '✅' : '❌';
      console.log(`  [${id}] ${room.name} - 剧作家${mm} 主人公${pro}`);
    });
  }, 30000);

  return wss;
}

// ============ 启动服务器 ============

app.prepare()
  .then(() => {
    console.log('✅ Next.js 准备完成');
    
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    // 附加 WebSocket
    setupWebSocket(server);

    server.listen(port, hostname, () => {
      console.log(`
🚀 惨剧轮回服务器已启动
━━━━━━━━━━━━━━━━━━━━━━━
📍 地址: http://${hostname}:${port}
🔌 WebSocket: ws://${hostname}:${port}/ws
🌍 环境: ${dev ? '开发' : '生产'}
━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });

    server.on('error', (err) => {
      console.error('❌ 服务器错误:', err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('❌ Next.js 启动失败:', err);
    process.exit(1);
  });
