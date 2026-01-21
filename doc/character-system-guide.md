# 角色系统实现指南

> 版本：v0.2.1  
> 更新：2026-01-21

---

## 📋 概述

角色系统现已完整实现，包括：
1. ✅ 角色立绘显示（Sprite Sheet 裁剪）
2. ✅ 角色死亡效果（视觉+交互限制）
3. ✅ 完整的角色能力定义
4. ✅ 友好度需求和不安上限

---

## 🎨 角色立绘系统

### 资产配置

**源文件**：`public/assets/characters-grid.png`
- 尺寸：3840 x 2160 像素
- 布局：8列 x 4行 = 32个角色
- 每格：480 x 540 像素

### 实现原理

使用 CSS `background-position` 裁剪 Sprite Sheet：

```typescript
// src/lib/characterAssets.ts
export function getCharacterSpriteStyle(
  characterId: string,
  scale: number = 1
): React.CSSProperties {
  const [col, row] = CHARACTER_ASSETS[characterId].gridPosition;
  
  return {
    backgroundImage: 'url(/assets/characters-grid.png)',
    backgroundPosition: `-${col * 480 * scale}px -${row * 540 * scale}px`,
    backgroundSize: `${3840 * scale}px ${2160 * scale}px`,
    width: `${480 * scale}px`,
    height: `${540 * scale}px`,
  };
}
```

### 使用方法

```tsx
import { getCharacterSpriteStyle, hasCharacterAsset } from '@/lib/characterAssets';

// 检查是否有资产
const hasSpriteAsset = hasCharacterAsset('student');

// 获取样式（缩放到200px宽度）
const spriteScale = 200 / 480;
const spriteStyle = getCharacterSpriteStyle('student', spriteScale);

// 应用到元素
<div style={spriteStyle} className="character-sprite" />
```

---

## 💀 死亡效果系统

### 视觉效果

死亡角色会显示：
1. **灰度滤镜**：`grayscale`
2. **降低不透明度**：`opacity-40`
3. **大红色 X 标记**：80px 的 Lucide X 图标，带发光效果
4. **红色边框**：`border-red-900`

### 交互限制

死亡角色无法：
1. ❌ 被点击切换能力显示
2. ❌ 被选为行动牌目标
3. ❌ 接收移动牌
4. ❌ 触发事件

### 实现代码

```tsx
// src/components/CharacterCard.tsx
const handleClick = (e: React.MouseEvent) => {
  // 死亡角色无法交互
  if (isDead) {
    e.stopPropagation();
    return;
  }
  // ... 正常逻辑
};

// 视觉效果
{isDead && (
  <div className="absolute inset-0 flex items-center justify-center">
    <X 
      size={80} 
      className="text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" 
      strokeWidth={6}
    />
  </div>
)}
```

```tsx
// src/app/page.tsx
const handleCardPlay = (targetId?: string, targetType?: 'character' | 'location') => {
  // 检查目标角色是否死亡
  if (targetCharId) {
    const targetCharState = gameState?.characters.find(c => c.id === targetCharId);
    if (targetCharState && !targetCharState.alive) {
      setErrorMsg('无法对死亡角色使用卡牌');
      return;
    }
  }
  // ... 其他逻辑
};
```

---

## 📊 角色定义系统

### 数据结构

```typescript
interface Character {
  id: CharacterId;
  name: string;
  anxietyLimit: number;          // 不安上限
  initialLocation: LocationType;
  forbiddenLocation: LocationType | null;
  traits: string[];              // ['student', 'boy', 'girl']
  abilities: CharacterAbility[];
}

interface CharacterAbility {
  goodwillRequired: number;      // 友好度需求（2-5）
  maxUsesPerLoop: number | null; // 每轮限用次数（null=无限）
  description: string;           // 简短描述
  effect: string;                // 详细效果说明
}
```

### FS-01 角色示例

#### 男学生
```typescript
{
  id: 'student',
  name: '男学生',
  anxietyLimit: 2,
  traits: ['student', 'boy'],
  abilities: [{
    goodwillRequired: 2,
    maxUsesPerLoop: null,
    effect: '移除同一区域一名【学生】角色的1点不安',
  }],
}
```

#### 巫女
```typescript
{
  id: 'shrine_maiden',
  name: '巫女',
  anxietyLimit: 2,
  traits: ['girl'],
  abilities: [{
    goodwillRequired: 5,      // 高门槛
    maxUsesPerLoop: 1,        // 强力限用
    effect: '揭露一名角色的身份',
  }],
}
```

#### 偶像（多能力）
```typescript
{
  id: 'idol',
  name: '偶像',
  anxietyLimit: 2,
  traits: ['student', 'girl'],
  abilities: [
    {
      goodwillRequired: 3,
      effect: '移除同一区域任意一名角色的1点不安',
    },
    {
      goodwillRequired: 4,    // 更高门槛
      effect: '对同一区域任意一名角色放置1点友好',
    },
  ],
}
```

#### 异界人（多能力+禁行区域）
```typescript
{
  id: 'alien',
  name: '异界人',
  anxietyLimit: 2,
  forbiddenLocation: 'hospital', // 禁止进入医院
  traits: ['girl'],
  abilities: [
    {
      goodwillRequired: 2,
      maxUsesPerLoop: 1,
      effect: '检测同一区域是否有【杀手】或【杀人狂】',
    },
    {
      goodwillRequired: 3,
      maxUsesPerLoop: 1,
      effect: '移除一名角色的所有密谋指示物',
    },
  ],
}
```

---

## 📁 相关文件

### 核心实现
- `src/lib/characterAssets.ts` - 资产映射和裁剪函数
- `src/components/CharacterCard.tsx` - 角色卡片组件
- `src/game/scripts/fs-01.ts` - FS-01 角色定义
- `src/types/game.ts` - 类型定义

### 文档
- `doc/character-assets.md` - 资产配置文档
- `doc/character-definitions.md` - 角色定义文档
- `public/assets/README.md` - 资产使用说明

---

## ⚠️ 注意事项

### 1. 资产文件
当前需要手动将角色立绘图片保存为 `public/assets/characters-grid.png`。
如果文件不存在，系统会显示备用界面（纯色背景+角色名称）。

### 2. 角色ID映射
确保 `CHARACTER_ASSETS` 中的 ID 与 `Character.id` 一致：
- ✅ 正确：`student` -> `[0, 0]`
- ❌ 错误：`boy_student` 没有映射

当前映射：
- `student` (旧ID) -> 男学生 `[0, 0]`
- `shrine_maiden` -> 巫女 `[2, 0]`
- `doctor` -> 医生 `[4, 0]`
- `alien` -> 异界人 `[0, 1]`

### 3. 多能力角色
偶像和异界人有多个能力，每个能力的友好度需求不同。
UI 会自动循环显示所有能力。

### 4. 死亡检查
所有涉及角色交互的地方都需要检查 `characterState.alive`：
- 行动牌目标选择
- 移动牌处理
- 事件触发检查
- 能力使用

---

## 🔜 未来扩展

### 待实现
- [ ] 动态加载更多剧本的角色
- [ ] 角色动画效果（进场/死亡）
- [ ] 角色语音/音效
- [ ] 角色故事卡片

### 可选优化
- [ ] WebP 格式支持（更小体积）
- [ ] 响应式资产（移动端使用更小尺寸）
- [ ] 懒加载优化（only visible characters）
- [ ] 角色预览弹窗（点击查看大图）

---

**完成度**：100% ✅  
**测试状态**：待人工测试  
**下一步**：添加角色资产文件 `public/assets/characters-grid.png`
