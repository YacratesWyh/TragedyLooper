/**
 * 联机服务器 - 权威状态源
 * 所有游戏状态由服务器维护，客户端只负责显示和发送操作
 * 
 * 启动: node server/websocket-server.js
 * 端口: 3001
 */

const WebSocket = require('ws');

const PORT = process.env.PORT || 3001;
const wss = new WebSocket.Server({ port: PORT });

// ========== 服务器状态（权威源）==========
let serverState = {
  // 游戏是否已初始化
  initialized: false,
  
  // 完整的游戏状态
  gameState: null,
  
  // 牌组状态
  mastermindDeck: null,
  protagonistDeck: null,
  
  // 当前打出的牌
  currentMastermindCards: [],
  currentProtagonistCards: [],
  
  // 玩家连接
  players: {
    mastermind: null,  // WebSocket connection
    protagonist: null,
  },
};

console.log(`🎮 惨剧轮回 - 联机服务器`);
console.log(`📡 端口: ${PORT}`);
console.log(`🌐 局域网: ws://[你的IP]:${PORT}`);
console.log(`⏳ 等待玩家连接...\n`);

// ========== 工具函数 ==========

function isPlayerConnected(role) {
  const ws = serverState.players[role];
  if (!ws) return false;
  if (ws.readyState !== WebSocket.OPEN) {
    serverState.players[role] = null; // 清理失效连接
    return false;
  }
  return true;
}

function getPlayerCount() {
  let count = 0;
  if (isPlayerConnected('mastermind')) count++;
  if (isPlayerConnected('protagonist')) count++;
  return count;
}

function getAvailableRoles() {
  const roles = [];
  if (!isPlayerConnected('mastermind')) roles.push('mastermind');
  if (!isPlayerConnected('protagonist')) roles.push('protagonist');
  return roles;
}

function broadcast(data, excludeWs = null) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function sendTo(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastState() {
  // 检查连接有效性后再广播
  const mmConnected = isPlayerConnected('mastermind');
  const proConnected = isPlayerConnected('protagonist');

  broadcast({
    type: 'STATE_SYNC',
    payload: {
      gameState: serverState.gameState,
      mastermindDeck: serverState.mastermindDeck,
      protagonistDeck: serverState.protagonistDeck,
      currentMastermindCards: serverState.currentMastermindCards,
      currentProtagonistCards: serverState.currentProtagonistCards,
      players: {
        mastermind: mmConnected,
        protagonist: proConnected,
      },
    },
  });
}

function broadcastPlayerStatus() {
  const status = {
    mastermind: isPlayerConnected('mastermind'),
    protagonist: isPlayerConnected('protagonist'),
  };
  console.log('📢 广播玩家状态:', status);
  broadcast({
    type: 'PLAYERS_UPDATE',
    payload: status,
  });
}

// ========== 消息处理 ==========

wss.on('connection', (ws) => {
  console.log('✅ 新连接');
  
  // 发送可用角色列表和当前占用状态
  sendTo(ws, {
    type: 'WELCOME',
    payload: {
      availableRoles: getAvailableRoles(),
      players: {
        mastermind: !!serverState.players.mastermind,
        protagonist: !!serverState.players.protagonist,
      },
      initialized: serverState.initialized,
    },
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        // 玩家选择角色
        case 'SELECT_ROLE': {
          const { role } = data;
          
          if (serverState.players[role]) {
            sendTo(ws, { type: 'ERROR', message: '该角色已被占用' });
            return;
          }
          
          serverState.players[role] = ws;
          ws.playerRole = role;
          
          console.log(`🎭 玩家选择: ${role === 'mastermind' ? '剧作家' : '主人公'}`);
          
          // 确认角色选择
          sendTo(ws, {
            type: 'ROLE_CONFIRMED',
            payload: { role },
          });
          
          // 广播玩家状态
          broadcastPlayerStatus();
          
          // 如果游戏已初始化，发送当前状态
          if (serverState.initialized) {
            sendTo(ws, {
              type: 'STATE_SYNC',
              payload: {
                gameState: serverState.gameState,
                mastermindDeck: serverState.mastermindDeck,
                protagonistDeck: serverState.protagonistDeck,
                currentMastermindCards: serverState.currentMastermindCards,
                currentProtagonistCards: serverState.currentProtagonistCards,
                players: {
                  mastermind: !!serverState.players.mastermind,
                  protagonist: !!serverState.players.protagonist,
                },
              },
            });
          }
          break;
        }
        
        // 初始化游戏（由任一玩家触发）
        case 'INIT_GAME': {
          const { gameState, mastermindDeck, protagonistDeck } = data.payload;
          
          serverState.initialized = true;
          serverState.gameState = gameState;
          
          // 确保 usedToday 和 usedThisLoop 是数组（JSON序列化时Set会变成{}）
          serverState.mastermindDeck = mastermindDeck ? {
            ...mastermindDeck,
            usedToday: Array.isArray(mastermindDeck.usedToday) ? mastermindDeck.usedToday : [],
            usedThisLoop: Array.isArray(mastermindDeck.usedThisLoop) ? mastermindDeck.usedThisLoop : [],
          } : null;
          serverState.protagonistDeck = protagonistDeck ? {
            ...protagonistDeck,
            usedToday: Array.isArray(protagonistDeck.usedToday) ? protagonistDeck.usedToday : [],
            usedThisLoop: Array.isArray(protagonistDeck.usedThisLoop) ? protagonistDeck.usedThisLoop : [],
          } : null;
          
          serverState.currentMastermindCards = [];
          serverState.currentProtagonistCards = [];
          
          console.log('🎮 游戏已初始化');
          
          broadcastState();
          break;
        }
        
        // 打出牌
        case 'PLAY_CARD': {
          const { role, card, targetId, targetType } = data.payload;
          
          // 验证是否是该玩家
          if (ws.playerRole !== role) {
            sendTo(ws, { type: 'ERROR', message: '不是你的回合' });
            return;
          }
          
          const playedCard = {
            ...card,
            targetId,
            targetType,
            playedBy: role,
          };
          
          if (role === 'mastermind') {
            serverState.currentMastermindCards.push(playedCard);
            // 更新牌组使用状态
            if (serverState.mastermindDeck) {
              serverState.mastermindDeck.usedToday.push(card.id);
              if (card.oncePerLoop) {
                serverState.mastermindDeck.usedThisLoop.push(card.id);
              }
            }
          } else {
            serverState.currentProtagonistCards.push(playedCard);
            if (serverState.protagonistDeck) {
              serverState.protagonistDeck.usedToday.push(card.id);
              if (card.oncePerLoop) {
                serverState.protagonistDeck.usedThisLoop.push(card.id);
              }
            }
          }
          
          console.log(`🃏 ${role} 打出牌 -> ${targetId}`);
          
          broadcastState();
          break;
        }
        
        // 撤回牌
        case 'RETREAT_CARD': {
          const { role, cardId } = data.payload;
          
          if (ws.playerRole !== role) {
            sendTo(ws, { type: 'ERROR', message: '无法撤回他人的牌' });
            return;
          }
          
          if (role === 'mastermind') {
            const card = serverState.currentMastermindCards.find(c => c.id === cardId);
            serverState.currentMastermindCards = serverState.currentMastermindCards.filter(c => c.id !== cardId);
            if (card && serverState.mastermindDeck) {
              serverState.mastermindDeck.usedToday = serverState.mastermindDeck.usedToday.filter(id => id !== cardId);
              serverState.mastermindDeck.usedThisLoop = serverState.mastermindDeck.usedThisLoop.filter(id => id !== cardId);
            }
          } else {
            const card = serverState.currentProtagonistCards.find(c => c.id === cardId);
            serverState.currentProtagonistCards = serverState.currentProtagonistCards.filter(c => c.id !== cardId);
            if (card && serverState.protagonistDeck) {
              serverState.protagonistDeck.usedToday = serverState.protagonistDeck.usedToday.filter(id => id !== cardId);
              serverState.protagonistDeck.usedThisLoop = serverState.protagonistDeck.usedThisLoop.filter(id => id !== cardId);
            }
          }
          
          console.log(`↩️ ${role} 撤回牌 ${cardId}`);
          
          broadcastState();
          break;
        }
        
        // 推进阶段
        case 'ADVANCE_PHASE': {
          const { newPhase, gameState: newGameState } = data.payload;
          
          serverState.gameState = newGameState;
          
          // 进入黎明阶段或夜晚阶段时（通常是新的一天开始），服务器强制清理已打出的牌
          if (newPhase === 'dawn') {
            if (serverState.mastermindDeck) {
              serverState.mastermindDeck.usedToday = [];
            }
            if (serverState.protagonistDeck) {
              serverState.protagonistDeck.usedToday = [];
            }
            serverState.currentMastermindCards = [];
            serverState.currentProtagonistCards = [];
            console.log('🧹 新的一天开始，服务器已重置每日卡牌使用状态');
          }
          
          console.log(`⏩ 阶段推进: ${newPhase}`);
          
          broadcastState();
          break;
        }
        
        // 更新游戏状态（通用）
        case 'UPDATE_GAME_STATE': {
          if (data.payload.gameState) {
            serverState.gameState = data.payload.gameState;
          }
          
          // 确保 usedToday 和 usedThisLoop 是数组
          if (data.payload.mastermindDeck) {
            const deck = data.payload.mastermindDeck;
            serverState.mastermindDeck = {
              ...deck,
              usedToday: Array.isArray(deck.usedToday) ? deck.usedToday : [],
              usedThisLoop: Array.isArray(deck.usedThisLoop) ? deck.usedThisLoop : [],
            };
          }
          if (data.payload.protagonistDeck) {
            const deck = data.payload.protagonistDeck;
            serverState.protagonistDeck = {
              ...deck,
              usedToday: Array.isArray(deck.usedToday) ? deck.usedToday : [],
              usedThisLoop: Array.isArray(deck.usedThisLoop) ? deck.usedThisLoop : [],
            };
          }
          if (data.payload.currentMastermindCards !== undefined) {
            serverState.currentMastermindCards = data.payload.currentMastermindCards;
          }
          if (data.payload.currentProtagonistCards !== undefined) {
            serverState.currentProtagonistCards = data.payload.currentProtagonistCards;
          }
          
          broadcastState();
          break;
        }
        
        // 调整指示物
        case 'ADJUST_INDICATOR': {
          const { characterId, type, delta } = data.payload;
          
          if (serverState.gameState) {
            serverState.gameState.characters = serverState.gameState.characters.map(char => {
              if (char.id === characterId) {
                const newValue = Math.max(0, char.indicators[type] + delta);
                return {
                  ...char,
                  indicators: { ...char.indicators, [type]: newValue },
                };
              }
              return char;
            });
          }
          
          console.log(`📊 调整指示物: ${characterId} ${type} ${delta > 0 ? '+' : ''}${delta}`);
          
          broadcastState();
          break;
        }

        // 切换存活状态
        case 'TOGGLE_LIFE': {
          const { characterId } = data.payload;
          
          if (serverState.gameState) {
            serverState.gameState.characters = serverState.gameState.characters.map(char => {
              if (char.id === characterId) {
                return { ...char, alive: !char.alive };
              }
              return char;
            });
          }
          
          console.log(`💀 切换存活状态: ${characterId}`);
          
          broadcastState();
          break;
        }

        // 移动角色
        case 'MOVE_CHARACTER': {
          const { characterId, location } = data.payload;
          
          if (serverState.gameState) {
            serverState.gameState.characters = serverState.gameState.characters.map(char => {
              if (char.id === characterId) {
                return { ...char, location };
              }
              return char;
            });
          }
          
          console.log(`🏃 移动角色: ${characterId} -> ${location}`);
          
          broadcastState();
          break;
        }
        
        // 重置游戏
        case 'RESET_GAME': {
          serverState.initialized = false;
          serverState.gameState = null;
          serverState.mastermindDeck = null;
          serverState.protagonistDeck = null;
          serverState.currentMastermindCards = [];
          serverState.currentProtagonistCards = [];
          
          // 同时清理玩家角色，让大家重新选择
          serverState.players.mastermind = null;
          serverState.players.protagonist = null;
          
          // 清理所有连接上的角色标记
          wss.clients.forEach(client => {
            delete client.playerRole;
          });
          
          console.log('🔄 游戏和玩家位置已重置');
          
          broadcast({ type: 'GAME_RESET' });
          broadcastPlayerStatus(); // 同步告知所有人位置已空
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
    const role = ws.playerRole;
    if (role && serverState.players[role] === ws) {
      serverState.players[role] = null;
      console.log(`👋 ${role === 'mastermind' ? '剧作家' : '主人公'} 离开`);
      broadcastPlayerStatus();
    }
  });
});

// 定期显示状态
setInterval(() => {
  const mm = serverState.players.mastermind ? '✅' : '❌';
  const pro = serverState.players.protagonist ? '✅' : '❌';
  console.log(`[状态] 剧作家${mm} 主人公${pro} | 阶段: ${serverState.gameState?.phase || '未开始'}`);
}, 30000);
