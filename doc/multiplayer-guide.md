# 多人联机指南

## 🎮 架构说明

**服务器权威模式**：所有游戏状态由服务器维护，客户端只负责显示和发送操作。

```
玩家A浏览器                      玩家B浏览器
    ↓                               ↓
    └──────→ WebSocket服务器 ←──────┘
               (权威状态源)
```

## 🚀 快速开始

### 方式一：同时启动（推荐）

```bash
npm run multiplayer
```

这会同时启动：
- Next.js 开发服务器 (端口 3000)
- WebSocket 联机服务器 (端口 3001)

### 方式二：分别启动

**终端1 - 启动游戏：**
```bash
npm run dev
```

**终端2 - 启动联机服务器：**
```bash
npm run server
```

---

## 🌐 联机步骤

### 1. 启动服务器

```bash
npm run multiplayer
```

服务器会显示：
```
🎮 惨剧轮回 - 联机服务器
📡 端口: 3001
🌐 局域网: ws://[你的IP]:3001
⏳ 等待玩家连接...
```

### 2. 查看本机 IP

```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

找到局域网 IP（通常是 192.168.x.x 或 10.x.x.x）

### 3. 玩家连接

**玩家1：**
1. 打开 http://localhost:3000 或 http://你的IP:3000
2. 点击右上角 "🔌 连接联机服务器"
3. 选择角色（剧作家/主人公）

**玩家2：**
1. 打开 http://你的IP:3000（局域网地址）
2. 点击右上角 "🔌 连接联机服务器"
3. 选择剩余角色

### 4. 开始游戏

- 双方选择角色后，任一方初始化游戏
- 所有操作自动同步到双方
- 角色确定后不可更改（需断开重连）

---

## 📱 远程联机（外网）

### 使用 ngrok（推荐）

1. 安装 ngrok: https://ngrok.com/download

2. 暴露两个端口：
```bash
# 终端1 - 暴露游戏页面
ngrok http 3000

# 终端2 - 暴露 WebSocket
ngrok http 3001
```

3. 分享 ngrok 地址给对方

### 使用 Tailscale（VPN 方式）

1. 双方都安装 Tailscale
2. 使用 Tailscale 分配的 IP 连接

---

## 🔧 配置

### 更改 WebSocket 端口

编辑 `server/websocket-server.js`：
```javascript
const PORT = 3001; // 改成你想要的端口
```

同时更新 `src/lib/useMultiplayer.ts`：
```typescript
const WS_URL = `ws://${window.location.hostname}:3001`; // 改成对应端口
```

---

## 🐛 常见问题

### 连接失败

1. **检查服务器是否启动**
   ```bash
   npm run server
   ```

2. **检查防火墙**
   - 确保 3000 和 3001 端口未被阻止

3. **检查 IP 地址**
   - 确保使用正确的局域网 IP
   - 不要使用 127.0.0.1 或 localhost（仅限本机）

### 状态不同步

1. 刷新页面
2. 重新连接联机服务器
3. 检查控制台是否有错误

### 对方看不到我的操作

- 确保双方都已连接（右上角显示"已联机"）
- 检查 WebSocket 服务器控制台是否有收到消息

---

## 📝 技术说明

### 架构

```
[玩家1浏览器]                    [玩家2浏览器]
     ↓                               ↓
[Next.js:3000] ←→ [WebSocket:3001] ←→ [Next.js:3000]
```

### 同步的数据

- 游戏状态 (gameState)
- 剧作家打出的牌 (mastermindCards)
- 主人公打出的牌 (protagonistCards)
- 玩家加入/离开事件

### 不同步的数据（本地）

- 当前选择的卡牌 (selectedCardId)
- UI 状态（面板展开等）

---

## 🚀 未来计划

- [ ] 房间系统（多个游戏同时进行）
- [ ] 断线重连
- [ ] 聊天功能
- [ ] 游戏回放
- [ ] 云服务器部署
