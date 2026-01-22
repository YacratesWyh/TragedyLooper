/**
 * 联机服务器 - 多房间支持
 * 
 * 启动: node server/websocket-server.js
 * 端口: WS_PORT 环境变量，默认 3001
 */

const WebSocket = require('ws');
const crypto = require('crypto');

// WebSocket 使用独立端口，不与 Next.js 冲突
// 优先使用 WS_PORT，其次 PORT+1，最后默认 3001
const WS_PORT = process.env.WS_PORT || (process.env.PORT ? parseInt(process.env.PORT) + 1 : 3001);
const wss = new WebSocket.Server({ port: WS_PORT });

// ========== 房间管理 ==========

// 房间数据结构
function createRoom(id, name, password = '') {
  return {
    id,
    name,
    password, // 空字符串表示无密码
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

console.log(`🎮 惨剧轮回 - 联机服务器 (多房间版)`);
console.log(`📡 端口: ${WS_PORT}`);
console.log(`🌐 局域网: ws://[你的IP]:${WS_PORT}`);
console.log(`⏳ 等待玩家连接...\n`);

// ========== 工具函数 ==========

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

// 广播给房间内所有人
function broadcastToRoom(room, data, excludeWs = null) {
  if (!room) return;
  const message = JSON.stringify(data);
  
  [room.players.mastermind, room.players.protagonist].forEach(ws => {
    if (ws && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// 广播房间列表给所有未进入房间的客户端
function broadcastRoomList() {
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

// 获取房间列表（不含密码）
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

// 清理空房间
function cleanupEmptyRooms() {
  rooms.forEach((room, id) => {
    const mmConnected = isPlayerConnected(room, 'mastermind');
    const proConnected = isPlayerConnected(room, 'protagonist');
    if (!mmConnected && !proConnected) {
      // 空房间超过5分钟删除
      if (Date.now() - room.createdAt > 5 * 60 * 1000) {
        rooms.delete(id);
        console.log(`🗑️ 删除空房间: ${id}`);
      }
    }
  });
}

// ========== 消息处理 ==========

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
        
        // 创建房间
        case 'CREATE_ROOM': {
          const { name, password } = data.payload || {};
          const roomName = (name || '').trim() || '未命名房间';
          const roomId = generateRoomId();
          
          const room = createRoom(roomId, roomName, password || '');
          rooms.set(roomId, room);
          
          console.log(`🏠 创建房间: ${roomId} "${roomName}" ${password ? '(有密码)' : ''}`);
          
          // 自动加入该房间
          ws.roomId = roomId;
          
          sendTo(ws, {
            type: 'ROOM_JOINED',
            payload: {
              roomId,
              roomName,
              availableRoles: getAvailableRoles(room),
              players: {
                mastermind: false,
                protagonist: false,
              },
            },
          });
          
          broadcastRoomList();
          break;
        }
        
        // 加入房间
        case 'JOIN_ROOM': {
          const { roomId, password } = data.payload || {};
          const room = rooms.get(roomId);
          
          if (!room) {
            sendTo(ws, { type: 'ERROR', payload: { message: '房间不存在' } });
            return;
          }
          
          // 验证密码
          if (room.password && room.password !== password) {
            sendTo(ws, { type: 'ERROR', payload: { message: '密码错误' } });
            return;
          }
          
          // 检查是否已满
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
              players: {
                mastermind: mmConnected,
                protagonist: proConnected,
              },
              initialized: room.initialized,
            },
          });
          
          // 如果游戏已初始化，同步状态
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
                  mastermind: mmConnected,
                  protagonist: proConnected,
                },
              },
            });
          }
          
          broadcastRoomList();
          break;
        }
        
        // 离开房间
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
          
          broadcastRoomList();
          break;
        }
        
        // 刷新房间列表
        case 'REFRESH_ROOMS': {
          sendTo(ws, {
            type: 'ROOM_LIST',
            payload: { rooms: getRoomList() },
          });
          break;
        }
        
        // ========== 游戏操作（需要在房间内）==========
        
        // 选择角色
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
          broadcastRoomList();
          
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
        
        // 初始化游戏
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
          broadcastRoomList();
          break;
        }
        
        // 打出牌
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
        
        // 撤回牌
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
        
        // 推进阶段
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
        
        // 更新游戏状态
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
        
        // 调整指示物
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
        
        // 切换存活状态
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
        
        // 移动角色
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
        
        // 重置游戏（仅重置游戏，不清除角色）
        case 'RESET_GAME': {
          const room = rooms.get(ws.roomId);
          if (!room) return;
          
          room.initialized = false;
          room.gameState = null;
          room.mastermindDeck = null;
          room.protagonistDeck = null;
          room.currentMastermindCards = [];
          room.currentProtagonistCards = [];
          
          // 清理角色
          room.players.mastermind = null;
          room.players.protagonist = null;
          
          // 清理房间内玩家的角色标记
          wss.clients.forEach(client => {
            if (client.roomId === ws.roomId) {
              delete client.playerRole;
            }
          });
          
          console.log(`🔄 [${ws.roomId}] 游戏已重置`);
          
          broadcastToRoom(room, { type: 'GAME_RESET' });
          broadcastPlayerStatus(room);
          broadcastRoomList();
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
      broadcastRoomList();
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
