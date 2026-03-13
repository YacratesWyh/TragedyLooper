'use client';

/** 全局音频解锁状态 - 用户点击"开始游戏"后设为 true */
let audioUnlocked = false;
let unlockPromise: Promise<boolean> | null = null;

/** 解锁浏览器音频自动播放限制 */
export async function unlockAudio(): Promise<boolean> {
  if (audioUnlocked) return true;
  if (unlockPromise) return unlockPromise;

  unlockPromise = (async () => {
    let ctxUnlocked = false;
    let audioPrimed = false;

    try {
      const AC: typeof window.AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        ctxUnlocked = ctx.state === 'running';
      }
    } catch {
      // ignore
    }

    try {
      const silentAudio = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
      );
      silentAudio.muted = true;
      await silentAudio.play();
      silentAudio.pause();
      silentAudio.currentTime = 0;
      audioPrimed = true;
    } catch {
      // ignore
    }

    audioUnlocked = ctxUnlocked || audioPrimed;
    unlockPromise = null;
    return audioUnlocked;
  })();

  return unlockPromise;
}

/** 检查音频是否已解锁 */
export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}
