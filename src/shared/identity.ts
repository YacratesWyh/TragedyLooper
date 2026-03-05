/**
 * 平台级用户身份管理
 *
 * userId   = 纯内存 UUID，每次页面加载生成，标签页间天然隔离
 * username = 显示名，存 localStorage，跨标签页和浏览器重启持久化
 *
 * 重连机制：
 *   - 同标签页刷新：sessionStorage 里的 {roomId, role} 触发 REJOIN_ROOM
 *   - 关标签页后重开：服务端按 username 匹配 pendingDisconnect，推送 PENDING_SESSION
 */

const USERNAME_KEY = 'platform_username_v2';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function migrateToLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(USERNAME_KEY)) return;
    const fromSession =
      sessionStorage.getItem('platform_username_v1') ||
      sessionStorage.getItem('tl_username_v2');
    if (fromSession) {
      localStorage.setItem(USERNAME_KEY, fromSession);
    }
    // 清理旧 key
    sessionStorage.removeItem('platform_username_v1');
    sessionStorage.removeItem('platform_uid_v1');
    sessionStorage.removeItem('tl_username_v2');
  } catch {}
}

if (typeof window !== 'undefined') {
  migrateToLocalStorage();
}

let cachedUserId: string | null = null;

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'ssr-placeholder';
  if (cachedUserId) return cachedUserId;
  cachedUserId = generateUUID();
  return cachedUserId;
}

export function getUsername(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(USERNAME_KEY);
  } catch {
    return null;
  }
}

export function setUsername(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERNAME_KEY, name.trim());
  } catch {}
}

export function clearUsername(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(USERNAME_KEY);
  } catch {}
}
