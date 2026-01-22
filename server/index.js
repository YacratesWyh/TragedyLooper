/**
 * 统一服务器入口
 * 同时处理 Next.js 和 WebSocket，共享同一端口
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';

// 安全解析端口，处理无效值
function parsePort(envPort) {
  if (!envPort) return 3000;
  const parsed = parseInt(envPort, 10);
  return isNaN(parsed) ? 3000 : parsed;
}
const port = parsePort(process.env.PORT);

// 初始化 Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ============ WebSocket 逻辑 ============

// 服务器状态
let serverState = {
  gameState: null,
  mastermindDeck: null,
  protagonistDeck: null,
  currentMastermindCards: [],
  currentProtagonistCards: [],
};

// 玩家角色映射
const playerRoles = {
  mastermind: null, // WebSocket connection
  protagonist: null,
};

// 检查玩家是否已连接
function isPlayerConnected(role) {
  const ws = playerRoles[role];
  return ws && ws.readyState === 1; // WebSocket.OPEN = 1
}

// 广播状态给所有连接的客户端
function broadcastState(wss) {
  const stateMsg = JSON.stringify({
    type: 'STATE_SYNC',
    payload: {
      ...serverState,
      players: {
        mastermind: isPlayerConnected('mastermind'),
        protagonist: isPlayerConnected('protagonist'),
      },
    },
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(stateMsg);
    }
  });
}

// 广播玩家状态
function broadcastPlayerStatus(wss) {
  const statusMsg = JSON.stringify({
    type: 'PLAYERS_UPDATE',
    payload: {
      mastermind: isPlayerConnected('mastermind'),
      protagonist: isPlayerConnected('protagonist'),
    },
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(statusMsg);
    }
  });
}

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  console.log('🔌 WebSocket 服务已附加到 HTTP 服务器 (路径: /ws)');

  wss.on('connection', (ws) => {
    console.log('📱 新客户端连接');
    
    // 发送欢迎消息和当前状态
    ws.send(JSON.stringify({
      type: 'WELCOME',
      payload: {
        availableRoles: ['mastermind', 'protagonist'].filter(role => !isPlayerConnected(role)),
        players: {
          mastermind: isPlayerConnected('mastermind'),
          protagonist: isPlayerConnected('protagonist'),
        },
      },
    }));
    
    // 如果有游戏状态，同步给新连接
    if (serverState.gameState) {
      ws.send(JSON.stringify({
        type: 'STATE_SYNC',
        ...serverState,
      }));
    }

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 收到消息:', message.type);

        switch (message.type) {
          case 'SELECT_ROLE': {
            const role = message.role;
            if (isPlayerConnected(role)) {
              ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `角色 ${role} 已被占用` } }));
              return;
            }
            
            // 清除之前的角色绑定
            if (ws.playerRole && playerRoles[ws.playerRole] === ws) {
              playerRoles[ws.playerRole] = null;
            }
            
            playerRoles[role] = ws;
            ws.playerRole = role;
            
            ws.send(JSON.stringify({ type: 'ROLE_CONFIRMED', payload: { role } }));
            broadcastPlayerStatus(wss);
            break;
          }

          case 'INIT_GAME': {
            serverState = {
              gameState: message.gameState,
              mastermindDeck: message.mastermindDeck,
              protagonistDeck: message.protagonistDeck,
              currentMastermindCards: message.currentMastermindCards || [],
              currentProtagonistCards: message.currentProtagonistCards || [],
            };
            console.log('🎮 游戏初始化');
            broadcastState(wss);
            break;
          }

          case 'UPDATE_GAME_STATE': {
            if (message.gameState) serverState.gameState = message.gameState;
            if (message.mastermindDeck) serverState.mastermindDeck = message.mastermindDeck;
            if (message.protagonistDeck) serverState.protagonistDeck = message.protagonistDeck;
            if (message.currentMastermindCards !== undefined) {
              serverState.currentMastermindCards = message.currentMastermindCards;
            }
            if (message.currentProtagonistCards !== undefined) {
              serverState.currentProtagonistCards = message.currentProtagonistCards;
            }
            broadcastState(wss);
            break;
          }

          case 'RESET_GAME': {
            serverState = {
              gameState: null,
              mastermindDeck: null,
              protagonistDeck: null,
              currentMastermindCards: [],
              currentProtagonistCards: [],
            };
            // 清除角色绑定
            Object.keys(playerRoles).forEach(role => {
              playerRoles[role] = null;
            });
            wss.clients.forEach(client => {
              client.playerRole = null;
            });
            console.log('🔄 游戏重置');
            broadcastState(wss);
            broadcastPlayerStatus(wss);
            break;
          }

          default:
            console.log('❓ 未知消息类型:', message.type);
        }
      } catch (err) {
        console.error('消息处理错误:', err);
      }
    });

    ws.on('close', () => {
      console.log('📴 客户端断开');
      if (ws.playerRole && playerRoles[ws.playerRole] === ws) {
        playerRoles[ws.playerRole] = null;
        broadcastPlayerStatus(wss);
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket 错误:', err);
    });
  });

  return wss;
}

// ============ 启动服务器 ============

app.prepare().then(() => {
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
});
