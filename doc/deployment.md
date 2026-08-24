# 部署手册

> 最后更新：2026-08-24

## 运行模型

`server/combined-server.js` 在同一个端口提供 Next.js 页面和 `/ws` WebSocket：

```text
浏览器 ── HTTPS/WSS ── 反向代理 ── board-game-hub:8080
```

服务端房间保存在内存中。容器重启会清空房间和进行中的对局，但不会影响静态站点。

## Docker

```bash
docker build -t board-game-hub:1.0.6 .
docker run --rm -p 8080:8080 -e PORT=8080 board-game-hub:1.0.6
```

验收：

```bash
curl -fsS http://127.0.0.1:8080/
docker inspect --format '{{json .State.Health}}' board-game-hub
```

## 生产 Compose

生产栈使用以下服务约定；Caddy/portal 由导航项目维护：

```yaml
services:
  board-game-hub:
    build: ./board-game-hub
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 8080
```

- Compose 服务名：`board-game-hub`
- 容器端口：`8080`
- 环境变量：`BOARD_GAME_PUBLIC_HOST`
- 生产入口：<https://games.206-237-12-86.sslip.io:8443/>

反向代理必须原样转发 WebSocket Upgrade；Caddy 的 `reverse_proxy` 默认支持该行为。

## 发布步骤

1. 本地执行 `npm ci && npm run check`。
2. 推送经过验证的提交。
3. 在生产构建目录拉取该提交。
4. 在生产栈运行 `docker compose up -d --build board-game-hub`。
5. 检查容器健康、首页、三个游戏路由和 `/ws` 握手。
6. 从导航页打开生产入口，再完成一次创建房间/加入房间的双浏览器测试。

## 回退

切回上一个已验证提交后重新构建服务：

```bash
git checkout <previous-commit>
docker compose up -d --build board-game-hub
```

回退或重建会中断现有房间，应在无进行中对局时操作。
