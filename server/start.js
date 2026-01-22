/**
 * 生产环境启动脚本
 * 处理 Zeabur 等平台的环境变量问题
 */

const { spawn } = require('child_process');
const path = require('path');

// 安全解析端口
function parsePort(envValue, defaultPort) {
  if (!envValue) return defaultPort;
  const num = parseInt(envValue, 10);
  return isNaN(num) ? defaultPort : num;
}

// 确定端口 (Zeabur 默认 8080)
const WEB_PORT = parsePort(process.env.WEB_PORT, null) || parsePort(process.env.PORT, 8080);
const WS_PORT = parsePort(process.env.WS_PORT, WEB_PORT + 1);

console.log('🚀 启动 Tragedy Looper 服务');
console.log(`   前端端口: ${WEB_PORT}`);
console.log(`   WebSocket 端口: ${WS_PORT}`);

// 设置正确的环境变量
const env = {
  ...process.env,
  PORT: String(WEB_PORT),
  WS_PORT: String(WS_PORT),
};

// 启动 Next.js
const nextProcess = spawn('npx', ['next', 'start', '-p', String(WEB_PORT)], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit',
  shell: true,
});

// 启动 WebSocket 服务器
const wsProcess = spawn('node', ['server/websocket-server.js'], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit',
  shell: true,
});

// 错误处理
nextProcess.on('error', (err) => {
  console.error('Next.js 启动失败:', err);
  process.exit(1);
});

wsProcess.on('error', (err) => {
  console.error('WebSocket 服务器启动失败:', err);
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', () => {
  nextProcess.kill();
  wsProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  nextProcess.kill();
  wsProcess.kill();
  process.exit(0);
});
