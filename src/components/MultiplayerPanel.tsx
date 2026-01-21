/**
 * 多人联机控制面板 - 顶栏内联版
 */

import React, { useState, useRef, useEffect } from 'react';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { Wifi, WifiOff, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MultiplayerPanel() {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { 
    isConnected, 
    connect, 
    disconnect, 
    myRole,
    availableRoles,
    players,
    selectRole,
  } = useMultiplayer();

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
    if (!isConnected) return '离线';
    if (!myRole) return '选择角色';
    const otherReady = myRole === 'mastermind' ? players.protagonist : players.mastermind;
    if (!otherReady) return '等待对方';
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
          isConnected 
            ? "bg-green-900/30 border-green-600/50 text-green-300 hover:bg-green-900/50" 
            : "bg-slate-800/50 border-slate-600 text-slate-400 hover:bg-slate-700"
        )}
      >
        {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        <span className="font-medium">{getStatusText()}</span>
        {myRole && (
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
          className="absolute top-full right-0 mt-2 w-56 p-3 rounded-lg border border-slate-600 bg-slate-900 backdrop-blur-md shadow-2xl z-[100]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 未连接 */}
          {!isConnected && (
            <button
              onClick={handleConnect}
              className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
            >
              🔌 连接联机服务器
            </button>
          )}

          {/* 已连接但未选择角色 */}
          {isConnected && !myRole && (
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
                {players.mastermind && <Check className="w-4 h-4 text-green-400" />}
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
                {players.protagonist && <Check className="w-4 h-4 text-green-400" />}
              </button>
            </div>
          )}

          {/* 已选择角色 */}
          {isConnected && myRole && (
            <div className="space-y-2">
              {/* 玩家状态 */}
              <div className="text-xs text-slate-400">联机状态</div>
              
              <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50 text-sm">
                <span>🎭 剧作家</span>
                <span className={players.mastermind ? 'text-green-400' : 'text-slate-500'}>
                  {players.mastermind ? (myRole === 'mastermind' ? '(我)' : '✓') : '—'}
                </span>
              </div>
              
              <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50 text-sm">
                <span>🦸 主人公</span>
                <span className={players.protagonist ? 'text-green-400' : 'text-slate-500'}>
                  {players.protagonist ? (myRole === 'protagonist' ? '(我)' : '✓') : '—'}
                </span>
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full mt-2 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-all"
              >
                断开连接
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
