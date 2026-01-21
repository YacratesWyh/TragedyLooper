<!--
 * @Author: cyanocitta
 * @Date: 2026-01-21 16:09:52
 * @LastEditTime: 2026-01-21 17:22:33
 * @FilePath: \tragedylooper\doc\CHANGELOG.md
 * @Description: 
-->
# 更新日志

所有重要的项目变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [0.2.0-alpha] - 2026-01-21

### 新增 ✨

- **角色卡片交互优化**
  - 点击角色卡片切换显示能力/头像
  - 放牌模式下不触发切换（isPlacingCard 机制）
  - 能力显示区域显示友好需求、使用次数、效果描述

- **规则速查面板优化**
  - 当前剧本事件直接显示（不折叠）
  - 其他事件整体折叠为一个区块
  - 灰色显示"不存在"标签
  - 事件阻止方法明确区分（所有事件 vs 特定地点事件）

- **文档系统**
  - 新增 `doc/STATUS.md` - 开发状态报告
  - 新增 `doc/CHANGELOG.md` - 更新日志
  - 更新 `README.md` - 项目介绍与快速开始
  - 更新 `doc/architecture.md` - 反映真实实现状态

### 优化 🎨

- PlacedCards 组件视觉效果提升
- DeckReference 面板布局优化
- RulesReference 面板内容组织优化
- 事件触发条件说明更清晰

### 修复 🐛

- 修正事件阻止方法的描述歧义
- 完善禁止牌结算逻辑

---

## [0.1.0-alpha] - 2026-01-21 (早期版本)

### 新增 ✨

- **核心卡牌系统**
  - 唯一卡牌追踪（每张牌只有一张）
  - 使用状态管理（usedToday / usedThisLoop）
  - 每轮限用机制（oncePerLoop）
  - 禁止牌机制（isForbidden + 结算抵消）
  - 牌的放置与撤回
  - 目标占用检查

- **牌组定义**
  - 剧作家牌组（10张）
    - 移动：斜向*, 禁止移动*, 横向, 纵向
    - 友好：禁止友好
    - 不安：不安+1 (×2), 禁止不安
    - 密谋：密谋+1, 密谋+2*
  - 主人公牌组（8张）
    - 移动：禁止移动*, 横向, 纵向
    - 友好：友好+1, 友好+2*
    - 不安：不安+1, 不安-1*
    - 密谋：禁止密谋

- **UI 组件**
  - GameBoard - 游戏版图
  - LocationZone - 区域组件
  - CharacterCard - 角色卡片
  - ActionCard - 行动牌
  - ActionHand - 手牌区
  - PlacedCards - 已放置牌显示（正面/背面）
  - DeckReference - 牌组参考面板（右侧）
  - RulesReference - 规则速查面板（左侧）
  - GameInfo - 游戏信息面板
  - IndicatorDisplay - 指示物显示
  - RoleSelector - 角色选择

- **游戏逻辑**
  - 游戏初始化（initializeGameState）
  - 角色状态初始化（initializeCharacterState）
  - 移动牌处理（applyMovement）
  - 指示物变更（applyIndicatorChange）
  - 事件触发检查（canIncidentTrigger）
  - 事件处理（murder, suicide）
  - 轮回重置（resetLoop）
  - 天数推进（advanceDay）
  - 胜负判定（isGameOver - 基础版）

- **结算系统**
  - 移动牌优先结算
  - 禁止牌抵消逻辑（同目标同类型）
  - 指示物牌应用
  - 地点密谋处理

- **文档**
  - `doc/architecture.md` - 系统架构
  - `doc/rules.md` - 游戏规则
  - `doc/action-cards.md` - 行动牌系统
  - `AGENTS.md` - 开发指南

### 技术栈

- Next.js 14+ (App Router)
- TypeScript 5.0+
- Zustand 4.x (状态管理)
- Tailwind CSS 3.x (样式)
- Framer Motion 11.x (动画)

---

## [未发布] - 计划中

### 待实现 🚧

- [ ] **游戏流程补全**
  - [ ] 黎明阶段（亲友+1友好）
  - [ ] 夜晚阶段（杀手/杀人狂能力）
  - [ ] 角色能力执行
  - [ ] 最终决战（身份推理）

- [ ] **多人支持**
  - [ ] 多主人公玩家支持（1-3人）
  - [ ] 多人联机（WebSocket）

- [ ] **内容扩展**
  - [ ] 更多剧本（FS-02, MS-01）
  - [ ] 更多角色
  - [ ] 更多事件

- [ ] **体验优化**
  - [ ] 移动端适配
  - [ ] 回放系统
  - [ ] AI对手
  - [ ] 教学模式

---

## 版本说明

- **alpha**: 核心功能开发中，不稳定
- **beta**: 核心功能完成，测试中
- **rc**: 发布候选，等待正式发布
- **stable**: 稳定版本

当前处于 **alpha** 阶段，主要功能尚在开发中。

---

## 贡献者

- [@Linus-style-dev](https://github.com/) - 核心开发

---

**更新频率**: 每次重要功能完成后更新
