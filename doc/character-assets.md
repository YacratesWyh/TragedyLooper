# 角色资产配置

> 资产图片：`public/assets/characters-grid.png`  
> 尺寸：3840 x 2160 (8列 x 4行)  
> 每个角色：480 x 540 像素

---

## 角色卡片总览

![角色卡片总览](../asset/httpcloud3steamusercontentcomugc16454663454472387705734B202185899B8F517BCC2AFC4439CB4643028.jpg)

> **卡片信息说明**：
> - 左上角：不安限度（星星数量）
> - 右上角：初始位置 / 禁行区域图标
> - 中间：角色立绘
> - 下方：角色名、特质标记、友好能力描述

---

## 角色立绘坐标映射

### 第一行（Row 0, y: 0-540）

| 位置 | 角色ID | 角色名 | 坐标 (x, y, w, h) |
|------|--------|--------|-------------------|
| 0,0 | boy_student | 男学生 | 0, 0, 480, 540 |
| 1,0 | girl_student | 女学生 | 480, 0, 480, 540 |
| 2,0 | shrine_maiden | 巫女 | 960, 0, 480, 540 |
| 3,0 | girl_student_2 | 女学生2 | 1440, 0, 480, 540 |
| 4,0 | doctor | 医生 | 1920, 0, 480, 540 |
| 5,0 | office_worker | 上班族 | 2400, 0, 480, 540 |
| 6,0 | informant | 情报员 | 2880, 0, 480, 540 |
| 7,0 | patient | 病患 | 3360, 0, 480, 540 |

### 第二行（Row 1, y: 540-1080）

| 位置 | 角色ID | 角色名 | 坐标 (x, y, w, h) |
|------|--------|--------|-------------------|
| 0,1 | alien | 异界人 | 0, 540, 480, 540 |
| 1,1 | class_rep | 班长 | 480, 540, 480, 540 |
| 2,1 | rich_man_daughter | 富家女 | 960, 540, 480, 540 |
| 3,1 | killer | 暗杀者 | 1440, 540, 480, 540 |
| 4,1 | idol | 偶像 | 1920, 540, 480, 540 |
| 5,1 | forensic | 鉴识人员 | 2400, 540, 480, 540 |
| 6,1 | police_officer | 保安员 | 2880, 540, 480, 540 |
| 7,1 | journalist | 记者 | 3360, 540, 480, 540 |



---

## CSS 裁剪实现

```typescript
// 角色立绘配置
interface CharacterAsset {
  id: string;
  name: string;
  gridPosition: [number, number]; // [col, row]
  spritePosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// CSS background-position 计算
const SPRITE_COLS = 8;
const SPRITE_ROWS = 4;
const CELL_WIDTH = 480;
const CELL_HEIGHT = 540;

function getSpritePosition(col: number, row: number) {
  return {
    backgroundImage: 'url(/assets/characters-grid.png)',
    backgroundPosition: `-${col * CELL_WIDTH}px -${row * CELL_HEIGHT}px`,
    backgroundSize: `${SPRITE_COLS * CELL_WIDTH}px ${SPRITE_ROWS * CELL_HEIGHT}px`,
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
  };
}
```


---

## 死亡效果实现

### 视觉效果
1. 角色立绘添加灰度滤镜 (`grayscale(100%)`)
2. 降低不透明度 (`opacity: 0.5`)
3. 添加大红色 X 叠加层
4. 边框变为红色

### 交互限制
1. 禁止点击放牌 (`pointer-events: none`)
2. 禁止使用能力
3. 移动牌自动跳过该角色
4. 事件检查时排除该角色

---

## 使用示例

```tsx
<div 
  className="character-sprite"
  style={{
    backgroundImage: 'url(/assets/characters-grid.png)',
    backgroundPosition: `-${0 * 480}px -${0 * 540}px`,
    backgroundSize: '3840px 2160px',
    width: '480px',
    height: '540px',
  }}
/>
```

缩小版本（宽度200px）：

```tsx
const scale = 200 / 480; // 0.4167

<div 
  className="character-sprite"
  style={{
    backgroundImage: 'url(/assets/characters-grid.png)',
    backgroundPosition: `-${0 * 480 * scale}px -${0 * 540 * scale}px`,
    backgroundSize: `${3840 * scale}px ${2160 * scale}px`,
    width: '200px',
    height: '225px',
  }}
/>
```
