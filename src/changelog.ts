export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '0.3.0',
    date: '2026-03-05',
    changes: [
      '新增 Poison (ポイズン) 游戏模块',
      '新增版本更新说明展示',
      '项目升级为多桌游平台架构',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-01-26',
    changes: [
      '修复导入路径错误',
      '新增手牌参考面板',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-01-24',
    changes: [
      '用户注册与身份系统',
      'WebSocket 多人联机（房间/重连）',
      '拖拽纠错、UI 全面重整',
    ],
  },
  {
    version: '0.0.1',
    date: '2026-01-21',
    changes: [
      '核心卡牌系统与结算引擎',
      'FS-01 剧本实现',
      '基础 UI 组件：版图、角色卡、行动牌',
    ],
  },
];

export default changelog;
