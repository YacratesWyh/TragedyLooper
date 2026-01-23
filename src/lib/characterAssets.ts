/**
 * 角色资产配置
 * 对应 public/assets/characters-grid.png
 * 
 * 图片尺寸：4960 x 3464 (8列 x 4行)
 * 每个角色：620 x 866 像素
 */

export interface CharacterAssetConfig {
  id: string;
  name: string;
  gridPosition: [number, number]; // [col, row]
}

/** 网格配置 */
export const SPRITE_CONFIG = {
  cols: 8,
  rows: 4,
  cellWidth: 620,
  cellHeight: 866,
  totalWidth: 4960,
  totalHeight: 3464,
} as const;

/** 
 * 角色资产映射
 * 布局：第1-4行y坐标依次为0、866、1732、2598
 *       第1-8列x坐标依次为0、620、1240、1860、2480、3100、3720、4340
 */
export const CHARACTER_ASSETS: Record<string, CharacterAssetConfig> = {
  // === 第1行 (y=0) ===
  boy_student: {
    id: 'boy_student',
    name: '男学生',
    gridPosition: [0, 0],  // x0, y0
  },
  girl_student: {
    id: 'girl_student',
    name: '女学生',
    gridPosition: [1, 0],  // x620, y0
  },
  rich_man: {
    id: 'rich_man',
    name: '大小姐',
    gridPosition: [2, 0],  // x1240, y0
  },
  // 兼容旧ID
  rich_man_daughter: {
    id: 'rich_man_daughter',
    name: '大小姐',
    gridPosition: [2, 0],  // x1240, y0
  },
  shrine_maiden: {
    id: 'shrine_maiden',
    name: '巫女',
    gridPosition: [3, 0],  // x1860, y0
  },
  detective: {
    id: 'detective',
    name: '刑警',
    gridPosition: [4, 0],  // x2480, y0
  },
  office_worker: {
    id: 'office_worker',
    name: '上班族',
    gridPosition: [5, 0],  // x3100, y0
  },
  informer: {
    id: 'informer',
    name: '情报贩子',
    gridPosition: [6, 0],  // x3720, y0
  },
  // 兼容旧ID
  informant: {
    id: 'informant',
    name: '情报贩子',
    gridPosition: [6, 0],  // x3720, y0
  },
  doctor: {
    id: 'doctor',
    name: '医生',
    gridPosition: [7, 0],  // x4340, y0
  },

  // === 第2行 (y=866) ===
  patient: {
    id: 'patient',
    name: '入院患者',
    gridPosition: [0, 1],  // x0, y866
  },
  class_rep: {
    id: 'class_rep',
    name: '班长',
    gridPosition: [1, 1],  // x620, y866
  },
  factor: {
    id: 'factor',
    name: '意外因素',
    gridPosition: [2, 1],  // x1240, y866
  },
  // 兼容旧ID
  accident_factor: {
    id: 'accident_factor',
    name: '意外因素',
    gridPosition: [2, 1],  // x1240, y866
  },
  alien: {
    id: 'alien',
    name: '异世界人',
    gridPosition: [3, 1],  // x1860, y866
  },
  godly_being: {
    id: 'godly_being',
    name: '神格',
    gridPosition: [4, 1],  // x2480, y866
  },
  // 兼容旧ID
  divinity: {
    id: 'divinity',
    name: '神格',
    gridPosition: [4, 1],  // x2480, y866
  },
  idol: {
    id: 'idol',
    name: '偶像',
    gridPosition: [5, 1],  // x3100, y866
  },
  journalist: {
    id: 'journalist',
    name: '媒体记者',
    gridPosition: [6, 1],  // x3720, y866
  },
  boss: {
    id: 'boss',
    name: '大人物',
    gridPosition: [7, 1],  // x4340, y866
  },
  // 兼容旧ID
  vip: {
    id: 'vip',
    name: '大人物',
    gridPosition: [7, 1],  // x4340, y866
  },

  // === 第3行 (y=1732) ===
  nurse: {
    id: 'nurse',
    name: '护士',
    gridPosition: [0, 2],  // x0, y1732
  },
  henchman: {
    id: 'henchman',
    name: '手下',
    gridPosition: [1, 2],  // x620, y1732
  },
  scientist: {
    id: 'scientist',
    name: '学者',
    gridPosition: [2, 2],  // x1240, y1732
  },
  // 兼容旧ID
  scholar: {
    id: 'scholar',
    name: '学者',
    gridPosition: [2, 2],  // x1240, y1732
  },
  illusion: {
    id: 'illusion',
    name: '幻觉',
    gridPosition: [3, 2],  // x1860, y1732
  },
  forensic: {
    id: 'forensic',
    name: '刑侦警察',
    gridPosition: [4, 2],  // x2480, y1732
  },
  // 兼容旧ID
  police: {
    id: 'police',
    name: '刑侦警察',
    gridPosition: [4, 2],  // x2480, y1732
  },
  female_doctor: {
    id: 'female_doctor',
    name: '女医生',
    gridPosition: [5, 2],  // x3100, y1732
  },
  mystery_boy: {
    id: 'mystery_boy',
    name: '神秘少年',
    gridPosition: [6, 2],  // x3720, y1732
  },
  transfer_student: {
    id: 'transfer_student',
    name: '转学生',
    gridPosition: [7, 2],  // x4340, y1732
  },

  // === 第4行 (y=2598) ===
  soldier: {
    id: 'soldier',
    name: '军人',
    gridPosition: [0, 3],  // x0, y2598
  },
  black_cat: {
    id: 'black_cat',
    name: '黑猫',
    gridPosition: [1, 3],  // x620, y2598
  },
  // 兼容旧ID
  cat: {
    id: 'cat',
    name: '黑猫',
    gridPosition: [1, 3],  // x620, y2598
  },
  little_girl: {
    id: 'little_girl',
    name: '小女孩',
    gridPosition: [2, 3],  // x1240, y2598
  },
  cult_leader: {
    id: 'cult_leader',
    name: '教祖',
    gridPosition: [3, 3],  // x1860, y2598
  },
  copy: {
    id: 'copy',
    name: '模仿者',
    gridPosition: [4, 3],  // x2480, y2598
  },
  goshinboku: {
    id: 'goshinboku',
    name: '御神木',
    gridPosition: [5, 3],  // x3100, y2598
  },
  sister: {
    id: 'sister',
    name: '妹妹',
    gridPosition: [6, 3],  // x3720, y2598
  },

  // === 兼容旧ID ===
  student: {
    id: 'student',
    name: '男学生',
    gridPosition: [0, 0],
  },
};

/**
 * 获取角色立绘的CSS样式 (响应式百分比版本)
 * @param characterId 角色ID
 */
export function getCharacterSpriteStyle(
  characterId: string
): React.CSSProperties {
  const asset = CHARACTER_ASSETS[characterId];
  
  if (!asset) {
    console.warn(`角色资产未找到: ${characterId}`);
    return {};
  }

  const [col, row] = asset.gridPosition;
  const { cols, rows } = SPRITE_CONFIG;
  
  // 使用百分比定位，遵循 CSS background-position 标准公式：(offset / (imageSize - containerSize))
  // 对于 N 列的精灵图，第 i 列的百分比位置应该是 (i / (N - 1)) * 100
  const posXPercent = (col / (cols - 1)) * 100;
  const posYPercent = (row / (rows - 1)) * 100;

  return {
    backgroundImage: 'url(/assets/characters-grid.png)',
    backgroundPosition: `${posXPercent}% ${posYPercent}%`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundRepeat: 'no-repeat',
    width: '100%',
    height: '100%',
  };
}

/**
 * 检查角色资产是否存在
 */
export function hasCharacterAsset(characterId: string): boolean {
  return characterId in CHARACTER_ASSETS;
}
