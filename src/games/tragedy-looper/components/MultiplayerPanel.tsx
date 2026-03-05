'use client';

/**
 * 多人联机控制面板 - 顶栏内联版
 */

import React, { useState, useRef, useEffect } from 'react';
import { useMultiplayer } from '@/shared/useMultiplayer';
import { useGameStore } from '@/games/tragedy-looper/store';
import { 
  Wifi, 
  WifiOff, 
  ChevronDown, 
  Check, 
  Download, 
  Upload, 
  LogOut,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MultiplayerPanel() {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { 
    username,
    clearUsername,
    isConnected, 
    isReconnecting,
    connect, 
    disconnect, 
    currentRoom,
    myRole,
    isSpectator,
    availableRoles,
    players,
    selectRole,
    spectate,
    pendingSession,
    rejoinPending,
    dismissPending,
    updateGameState
  } = useMultiplayer();

  const { exportState, importState, getSyncPayload } = useGameStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importState(file);
      // 如果已连接，同步到服务器
      if (isConnected) {
        setTimeout(() => {
          updateGameState(getSyncPayload());
        }, 100);
      }
      // Reset input
      e.target.value = '';
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // 紧凑的状态显示
  const getStatusText = () => {
    if (isReconnecting) return '重连中...';
    if (!isConnected) return '离线';
    if (isSpectator) return '旁观中';
    if (!myRole) return '选择角色';
    const otherRole = myRole === 'mastermind' ? 'protagonist' : 'mastermind';
    if (!players[otherRole].connected) return '等待对方';
    return '已就绪';
  };

  const handleConnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    connect();
  };

  const handleSelectRole = (e: React.MouseEvent, role: 'mastermind' | 'protagonist') => {
    e.stopPropagation();
    selectRole(role);
    // 不要立即关闭，等服务器确认后 myRole 会更新
  };

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnect();
    setShowMenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* 主按钮 */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all",
          isReconnecting
            ? "bg-amber-900/30 border-amber-600/50 text-amber-300 hover:bg-amber-900/50"
            : isConnected 
              ? "bg-green-900/30 border-green-600/50 text-green-300 hover:bg-green-900/50" 
              : "bg-slate-800/50 border-slate-600 text-slate-400 hover:bg-slate-700"
        )}
      >
        {isReconnecting ? <Wifi className="w-4 h-4 animate-pulse" /> : isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        <span className="font-medium">{getStatusText()}</span>
        {isSpectator && (
          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-slate-600/50 text-slate-300">
            旁观
          </span>
        )}
        {myRole && !isSpectator && (
          <span className={cn(
            "px-1.5 py-0.5 rounded text-xs font-bold",
            myRole === 'mastermind' ? 'bg-red-600/50 text-red-200' : 'bg-blue-600/50 text-blue-200'
          )}>
            {myRole === 'mastermind' ? '剧作家' : '主人公'}
          </span>
        )}
        <ChevronDown className={cn("w-4 h-4 transition-transform", showMenu && "rotate-180")} />
      </button>

      {/* 下拉菜单 */}
      {showMenu && (
        <div 
          className="absolute top-full right-0 mt-2 w-64 p-3 rounded-lg border border-slate-600 bg-slate-900 backdrop-blur-md shadow-2xl z-[100]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 存档管理 (系统功能) */}
          <div className="mb-3 pb-3 border-b border-slate-700 space-y-2">
            <div className="text-xs text-slate-400 mb-2 px-1">游戏存档</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportState}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-all border border-slate-700"
              >
                <Download size={14} />
                <span>导出存档</span>
              </button>
              <button
                onClick={handleImportClick}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-all border border-slate-700"
              >
                <Upload size={14} />
                <span>读取存档</span>
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              className="hidden" 
            />
          </div>

          {/* 未连接 */}
          {!isConnected && (
            <button
              onClick={handleConnect}
              className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
            >
              🔌 连接联机服务器
            </button>
          )}

          {/* 重连提示 */}
          {isConnected && pendingSession && !currentRoom && (
            <div className="mb-3 p-3 rounded-lg bg-amber-900/30 border border-amber-600/40 space-y-2">
              <p className="text-xs text-amber-300">
                你在房间 <span className="font-bold text-amber-200">{pendingSession.roomName}</span> 有未完成的游戏
              </p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); rejoinPending(); }}
                  className="flex-1 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all"
                >
                  重连
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); dismissPending(); }}
                  className="flex-1 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-all"
                >
                  不了
                </button>
              </div>
            </div>
          )}

          {/* 已连接但未选择角色（且非旁观） */}
          {isConnected && !myRole && !isSpectator && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 mb-2">选择你的角色：</div>
              
              <button
                onClick={(e) => handleSelectRole(e, 'mastermind')}
                disabled={!availableRoles.includes('mastermind')}
                className={cn(
                  "w-full px-3 py-2 rounded text-sm font-bold transition-all flex items-center justify-between",
                  availableRoles.includes('mastermind')
                    ? "bg-red-600/80 hover:bg-red-500 text-white"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                )}
              >
                <span>🎭 剧作家</span>
                {players.mastermind.connected && <Check className="w-4 h-4 text-green-400" />}
              </button>
              
              <button
                onClick={(e) => handleSelectRole(e, 'protagonist')}
                disabled={!availableRoles.includes('protagonist')}
                className={cn(
                  "w-full px-3 py-2 rounded text-sm font-bold transition-all flex items-center justify-between",
                  availableRoles.includes('protagonist')
                    ? "bg-blue-600/80 hover:bg-blue-500 text-white"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                )}
              >
                <span>🦸 主人公</span>
                {players.protagonist.connected && <Check className="w-4 h-4 text-green-400" />}
              </button>

              {availableRoles.length === 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); spectate(); }}
                  className="w-full px-3 py-2 rounded text-sm font-bold transition-all bg-slate-600/80 hover:bg-slate-500 text-slate-200"
                >
                  👁 旁观
                </button>
              )}
            </div>
          )}

          {/* 已选择角色 or 旁观中 */}
          {isConnected && (myRole || isSpectator) && (
            <div className="space-y-2">
              {/* 房间内玩家 */}
              <div className="text-xs text-slate-400">房间内玩家</div>
              
              <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50 text-sm">
                <span>🎭 剧作家</span>
                <span className={players.mastermind.connected ? 'text-green-400' : 'text-slate-500'}>
                  {players.mastermind.connected 
                    ? (players.mastermind.name || '未知') + (!isSpectator && myRole === 'mastermind' ? ' (我)' : '')
                    : '—'}
                </span>
              </div>
              
              <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50 text-sm">
                <span>🦸 主人公</span>
                <span className={players.protagonist.connected ? 'text-green-400' : 'text-slate-500'}>
                  {players.protagonist.connected 
                    ? (players.protagonist.name || '未知') + (!isSpectator && myRole === 'protagonist' ? ' (我)' : '')
                    : '—'}
                </span>
              </div>

              {isSpectator && (
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50 text-sm">
                  <span>👁 旁观者</span>
                  <span className="text-slate-400">{username} (我)</span>
                </div>
              )}

              <button
                onClick={handleDisconnect}
                className="w-full mt-2 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-all"
              >
                断开连接
              </button>

              <button
                onClick={() => {
                  if (confirm('确定要更换名字并断开连接吗？')) {
                    disconnect();
                    clearUsername();
                    setShowMenu(false);
                  }
                }}
                className="w-full mt-1 px-3 py-1.5 rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 text-[10px] transition-all border border-red-700/30"
              >
                更换名字 (注销)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
