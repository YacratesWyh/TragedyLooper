# 系统架构

> 版本：1.0.6 · 最后更新：2026-08-24

## 技术栈

| 层级 | 技术 |
|---|---|
| Web | Next.js 16 App Router、React 19、TypeScript 5 |
| 样式与动效 | Tailwind CSS 4、Framer Motion 12 |
| 状态 | Zustand 5 |
| 联机 | Node.js HTTP + `ws` WebSocket |
| 交付 | Docker、Compose、Caddy |

## 目录

```text
src/
├─ app/                         路由和全局样式
│  ├─ page.tsx                 游戏选择首页
│  ├─ tragedy-looper/page.tsx
│  ├─ poison/page.tsx
│  └─ missing-child/page.tsx
├─ games/
│  ├─ tragedy-looper/          引擎、状态、剧本和 UI
│  ├─ poison/                  引擎、状态、联机和 UI
│  └─ missing-child/           引擎、状态、音频和 UI
├─ shared/                     身份与通用 WebSocket Hook
└─ components/RoutePreference.tsx
server/combined-server.js      HTTP + WebSocket 单端口入口
public/assets/                 运行时静态素材
doc/                           规则与运维文档
```

## 请求链路

```text
Browser
  ├─ GET /... ──────────────┐
  └─ Upgrade /ws ───────────┼─ reverse proxy ─ combined-server.js:8080
                             ├─ Next.js request handler
                             └─ WebSocket rooms
```

`src/shared/useMultiplayer.tsx` 根据当前页面的协议和 host 生成 `/ws` 地址，因此本地与反向代理部署不需要两套客户端配置。

## 游戏隔离

每个游戏在 `src/games/<game>/` 下维护自己的类型、引擎、状态和组件。页面路由只负责组装；跨游戏能力放在 `src/shared/`。

惨剧轮回额外使用 `scripts/registry.ts` 注册剧本，`scripts/fs-01.ts` 保存剧本数据，`public/assets/tl/*/config.json` 声明速查图片。

## 联机状态

服务端负责：

- 房间创建、列表、密码检查和清理；
- 剧作家/主人公席位占用与旁观者；
- 广播游戏状态、行动和消息；
- 2 分钟断线重连宽限；
- WebSocket ping/pong 心跳。

服务端不持久化房间。对局状态以内存对象保存，进程重启后清空。当前同步模型信任客户端提交的状态，适合熟人桌游，不适合作为对抗作弊的公共竞技服务器。

## 新增游戏

1. 在 `src/games/<id>/` 创建类型、引擎、状态和组件；
2. 在 `src/app/<id>/page.tsx` 添加路由；
3. 在 `src/app/page.tsx` 与 `RoutePreference.tsx` 注册入口；
4. 将运行时素材放入 `public/assets/<id>/`；
5. 更新 README、状态和规则文档；
6. 执行 `npm run check` 并做双客户端联机验收。

## 部署边界

本仓库维护应用镜像和容器内端口。生产 portal、域名和 Caddy 路由由导航项目维护，接口约定见 [deployment.md](deployment.md)。
