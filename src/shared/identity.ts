/**
 * 平台级用户身份管理
 *
 * userId  = 随机 UUID，每个标签页独立生成，用于服务端唯一标识
 * username = 显示名，玩家自填，可修改
 *
 * 两者分离：username 可重名，userId 保证唯一。
 */

const PLATFORM_UID_KEY = 'platform_uid_v1';
const PLATFORM_USERNAME_KEY = 'platform_username_v1';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** 迁移旧 key（tl_username_v2 → platform_username_v1），只执行一次 */
function migrateOldKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    if (
      sessionStorage.getItem('tl_username_v2') &&
      !sessionStorage.getItem(PLATFORM_USERNAME_KEY)
    ) {
      sessionStorage.setItem(
        PLATFORM_USERNAME_KEY,
        sessionStorage.getItem('tl_username_v2')!,
      );
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  migrateOldKeys();
}

/**
 * 获取（或首次创建）当前标签页的 userId（UUID）。
 * 存在 sessionStorage，标签页关闭后消失，保证多标签页隔离。
 */
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'ssr-placeholder';
  try {
    const existing = sessionStorage.getItem(PLATFORM_UID_KEY);
    if (existing) return existing;
    const uid = generateUUID();
    sessionStorage.setItem(PLATFORM_UID_KEY, uid);
    return uid;
  } catch {
    return generateUUID();
  }
}

export function getUsername(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(PLATFORM_USERNAME_KEY);
  } catch {
    return null;
  }
}

export function setUsername(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PLATFORM_USERNAME_KEY, name.trim());
    // 保持向后兼容：旧 key 同步写入，避免 TL 代码读不到
    sessionStorage.setItem('tl_username_v2', name.trim());
  } catch {}
}

export function clearUsername(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PLATFORM_USERNAME_KEY);
    sessionStorage.removeItem('tl_username_v2');
  } catch {}
}
