# Board Game Hub

一个基于 Next.js 的在线桌游合集，当前包含：

- **惨剧轮回（Tragedy Looper）**：本地同屏与 WebSocket 联机；
- **Poison**：3–6 人药水锅卡牌游戏；
- **迷子（Missing Child）**：2–4 人抽牌与卡牌效果游戏。

## 本地运行

需要 Node.js 22（最低 Node.js 20.9）和 npm。

```bash
npm ci
npm run dev
```

默认访问 <http://localhost:8080>。HTTP 页面与 `/ws` WebSocket 共用 `PORT` 指定的端口。

## 质量检查

```bash
npm run check
```

`check` 会依次执行 ESLint、TypeScript 类型检查和生产构建。

## 目录

```text
src/app/                页面路由
src/games/              各游戏的引擎、状态和组件
src/shared/             身份与通用联机逻辑
server/                 Next.js + WebSocket 组合服务器
public/assets/          运行时静态资源
doc/                    规则、架构、开发和部署文档
```

## 部署

项目提供多阶段 Docker 镜像，容器内监听 `8080`。生产部署和验收见 [doc/deployment.md](doc/deployment.md)。

## 文档索引

- [架构说明](doc/architecture.md)
- [当前状态](doc/STATUS.md)
- [联机说明](doc/multiplayer-guide.md)
- [部署手册](doc/deployment.md)
- [惨剧轮回规则](doc/rules.md)
- [迷子规则](doc/missing-child-rules.md)
- [更新日志](doc/CHANGELOG.md)

游戏图片、音频和字体的权利归各自权利人所有；部署前请确认使用场景与素材授权。
