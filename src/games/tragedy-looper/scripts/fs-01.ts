/*
 * @Author: cyanocitta
 * @Date: 2026-03-04 19:24:39
 * @LastEditTime: 2026-03-09 16:44:39
 * @FilePath: \tragedylooper\src\games\tragedy-looper\scripts\fs-01.ts
 * @Description: 
 */
// FS-01 教学关卡 · 初学者剧本数据
import type { ScriptConfig, PrivateInfo, PublicInfo } from '@/games/tragedy-looper/types';

export const FS01_BEGINNER_PRIVATE: PrivateInfo = {
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  roles: [
    { characterId: 'boy_student', role: 'civilian' },
    { characterId: 'girl_student', role: 'key_person' },
    { characterId: 'shrine_maiden', role: 'serial_killer' },
    { characterId: 'office_worker', role: 'killer' },
    { characterId: 'idol', role: 'conspiracy_theorist' },
    { characterId: 'doctor', role: 'brain' },
  ],
  incidents: [
    {
      id: 'day3_suicide',
      day: 3,
      actorId: 'girl_student',
      type: 'suicide',
      description: '自杀',
    },
  ],
};

export const FS01_BEGINNER_PUBLIC: PublicInfo = {
  scriptName: '初学者剧本 (First Steps)',
  loops: 4,
  days: 3,
  characters: ['boy_student', 'girl_student', 'shrine_maiden', 'office_worker', 'idol', 'doctor'],
  incidentSchedule: [
    {
      day: 3,
      type: 'suicide',
      description: '自杀',
    },
  ],
  specialRules: [],
};

export const FS01_BEGINNER_SCRIPT: ScriptConfig = {
  id: 'fs-01-beginner',
  name: '初学者剧本 (First Steps)',
  loops: 4,
  days: 3,
  ruleY: 'murder_plan',
  ruleX: 'circle_of_friends',
  characters: ['boy_student', 'girl_student', 'shrine_maiden', 'office_worker', 'idol', 'doctor'],
  incidents: FS01_BEGINNER_PRIVATE.incidents,
};

// ===== 向后兼容别名 =====
export const FS01_SCRIPT1_PRIVATE = FS01_BEGINNER_PRIVATE;
export const FS01_SCRIPT1_PUBLIC = FS01_BEGINNER_PUBLIC;
