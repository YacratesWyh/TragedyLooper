/**
 * 入场大厅 - 房间选择 + 角色选择 + 剧本选择
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Users, Eye, Wifi, Loader2, Check, X, Plus, LogIn, RefreshCw, Lock, ArrowLeft, Home, Monitor } from 'lucide-react';
import { useMultiplayer } from '@/shared/useMultiplayer';
import { useGameStore } from '@/games/tragedy-looper/store';
import type { GameMode } from '@/games/tragedy-looper/store';
import { cn } from '@/lib/utils';
import { ScriptSetup } from './ScriptSetup';
import type { ScriptTemplate } from '@/games/tragedy-looper/scripts/registry';

export function LobbyScreen() {
    const { 
    username,
    setUsername,
    clearUsername,
    isConnected, 
    isReconnecting,
    hasAttemptedInitialConnect,
    connect, 
    serverVersion,
    rooms,
    currentRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    refreshRooms,
    myRole,
    isSpectator,
    players,
    selectRole,
    spectate,
    resetGame,
  } = useMultiplayer();
  
  const initializeWithScript = useGameStore((state) => state.initializeWithScript);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const { updateGameState } = useMultiplayer();
  
  // 模式选择
  const [mode, setMode] = useState<GameMode>(null);
  
  // 用户名输入
  const [usernameInput, setUsernameInput] = useState('');
  
  // 创建房间表单
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  
  // 加入房间密码
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  
  // 正在选择角色
  const [selectingRole, setSelectingRole] = useState<'mastermind' | 'protagonist' | null>(null);
  
  // 剧本选择阶段（剧作家专用）
  const [showScriptSetup, setShowScriptSetup] = useState(false);

  // 设置用户名后自动连接服务器
  useEffect(() => {
    if (username && !isConnected && !isReconnecting) {
      connect();
    }
  }, [username, isConnected, isReconnecting, connect]);
  
  // 提交用户名
  const handleSetUsername = () => {
    const trimmed = usernameInput.trim();
    if (trimmed.length >= 2 && trimmed.length <= 12) {
      setUsername(trimmed);
    }
  };
  
  const handleBackToModeSelect = () => {
    setMode(null);
    setGameMode(null);
    setShowCreateForm(false);
    setJoiningRoomId(null);
    setJoinPassword('');
  };

  const gameState = useGameStore((state) => state.gameState);

  // 角色选择确认后 - 剧作家进入剧本选择，主人公等待
  useEffect(() => {
    if (myRole && selectingRole) {
      setSelectingRole(null);
      
      // 剧作家选择角色后，显示剧本选择界面
      if (myRole === 'mastermind' && !gameState) {
        setShowScriptSetup(true);
      }
      // 主人公等待剧作家选择剧本
    }
  }, [myRole, selectingRole, gameState]);

  // 剧作家重连后，如果没有 gameState，自动显示脚本选择
  useEffect(() => {
    if (myRole === 'mastermind' && !gameState && currentRoom && !showScriptSetup) {
      setShowScriptSetup(true);
    }
  }, [myRole, gameState, currentRoom, showScriptSetup]);

  // 剧本选择后初始化游戏（热座/联机通用）
  const handleScriptSelect = (script: ScriptTemplate) => {
    console.log('🎭 选择剧本:', script.name);
    setShowScriptSetup(false);
    
    initializeWithScript('mastermind', script);
    
    // 联机模式：同步给对方
    if (mode === 'online') {
      setTimeout(() => {
        const state = useGameStore.getState();
        if (state.gameState) {
          updateGameState(state.getSyncPayload());
        }
      }, 150);
    }
  };

  // 创建房间
  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      alert('请输入房间名称');
      return;
    }
    createRoom(newRoomName.trim(), newRoomPassword);
    setShowCreateForm(false);
    setNewRoomName('');
    setNewRoomPassword('');
  };

  // 加入房间
  const handleJoinRoom = (roomId: string, hasPassword: boolean) => {
    if (hasPassword) {
      setJoiningRoomId(roomId);
      setJoinPassword('');
    } else {
      joinRoom(roomId);
    }
  };

  // 确认加入需要密码的房间
  const handleConfirmJoin = () => {
    if (joiningRoomId) {
      joinRoom(joiningRoomId, joinPassword);
      setJoiningRoomId(null);
      setJoinPassword('');
    }
  };

  // 选择角色
  const handleSelectRole = (role: 'mastermind' | 'protagonist') => {
    if (selectingRole) return;
    const isTaken = players[role].connected;
    if (isTaken && myRole !== role) return;
    setSelectingRole(role);
    selectRole(role);
  };

  // 角色状态
  const getRoleStatus = (role: 'mastermind' | 'protagonist') => {
    if (selectingRole === role) return 'selecting';
    if (myRole === role) return 'self';
    const isTaken = players[role].connected;
    if (isTaken) return 'taken';
    return 'available';
  };

  // ========== 渲染 ==========

  // 模式选择
  if (mode === null) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-8 bg-[url('/assets/tl/20220605022917_d75a4.jpg')] bg-cover bg-center bg-fixed">
        <div className="absolute inset-0 bg-shell-bg/55 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center mb-12"
        >
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">惨剧轮回</h1>
          <p className="text-slate-400 text-lg">Tragedy Looper</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative z-10 grid w-full max-w-2xl grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
        >
          <button
            onClick={() => {
              setMode('hotseat');
              setGameMode('hotseat');
              setShowScriptSetup(true);
            }}
            className="flex w-full flex-col items-center gap-3 sm:gap-4 px-6 sm:px-12 py-7 sm:py-10 rounded-2xl bg-slate-800 border-2 border-slate-700
              hover:bg-slate-700 hover:border-doloris/60 transition-all active:scale-95 group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-doloris/40 bg-doloris/10">
              <Monitor size={34} className="block text-doloris group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xl font-bold text-white">热座模式</span>
            <span className="text-sm text-slate-400 text-center">面对面传递设备<br/>剧作家 vs 主人公</span>
          </button>

          <button
            onClick={() => {
              setMode('online');
              setGameMode('online');
            }}
            className="flex w-full flex-col items-center gap-3 sm:gap-4 px-6 sm:px-12 py-7 sm:py-10 rounded-2xl bg-slate-800 border-2 border-slate-700
              hover:bg-slate-700 hover:border-oblivionis/60 transition-all active:scale-95 group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-oblivionis/40 bg-oblivionis/10">
              <Wifi size={34} className="block text-oblivionis group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xl font-bold text-white">联机模式</span>
            <span className="text-sm text-slate-400 text-center">通过网络连接<br/>多设备联机</span>
          </button>
        </motion.div>
      </div>
    );
  }

  // 热座模式：剧本选择（不需要用户名）
  if (mode === 'hotseat' && showScriptSetup) {
    return (
      <ScriptSetup
        onSelect={handleScriptSelect}
        onCancel={() => {
          setShowScriptSetup(false);
          setMode(null);
        }}
      />
    );
  }

  // 热座模式已启动（剧本已选），直接返回（page.tsx 会接管）
  if (mode === 'hotseat') {
    return null;
  }

  // === 以下为联机模式流程 ===

  // 未设置用户名 - 显示用户名输入界面
  if (!username) {
    return (
      <div className="min-h-screen rendered-dark-bg relative flex flex-col items-center justify-center p-4 sm:p-8">
        <button
          onClick={handleBackToModeSelect}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          返回上一步
        </button>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">惨剧轮回</h1>
          <p className="text-slate-400 text-lg">Tragedy Looper</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">设置你的名字</h2>
            <p className="text-slate-400 text-sm mb-6">其他玩家将通过这个名字识别你</p>
            
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
              placeholder="输入名字 (2-12字符)..."
              maxLength={12}
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:border-timoris focus:outline-none text-lg"
              autoFocus
            />
            
            <button
              onClick={handleSetUsername}
              disabled={usernameInput.trim().length < 2}
              className={cn(
                "w-full mt-4 py-3 rounded-xl font-bold text-lg transition-all",
                usernameInput.trim().length >= 2
                  ? "bg-gradient-to-r from-timoris to-oblivionis hover:from-timoris/80 hover:to-oblivionis/80 text-white shadow-lg hover:shadow-timoris/25"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              )}
            >
              进入大厅
            </button>
          </div>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-slate-600 text-sm"
        >
          名字将保存在本地，用于断线重连
        </motion.p>
      </div>
    );
  }

  // 剧本选择界面（联机剧作家）
  if (showScriptSetup && myRole === 'mastermind') {
    return (
      <ScriptSetup 
        onSelect={handleScriptSelect}
        onCancel={() => setShowScriptSetup(false)}
      />
    );
  }

  // 主人公/旁观者等待剧作家选择剧本
  if ((myRole === 'protagonist' || isSpectator) && !gameState && currentRoom) {
    const roleLabel = isSpectator ? '旁观者' : '主人公';
    const roleColor = isSpectator ? 'text-slate-400' : 'text-oblivionis';
    return (
      <div className="min-h-screen rendered-dark-bg flex flex-col items-center justify-center p-4 sm:p-8 relative">
        {/* 非阻塞连接状态指示器 */}
        {!isConnected && (
          <div className="fixed top-16 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-doloris/20 border border-doloris text-doloris/80 shadow-lg">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs font-medium">{isReconnecting ? '正在重连' : '连接断开'}</span>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">等待剧作家</h1>
          <p className="text-slate-400 text-lg">Waiting for Mastermind</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-oblivionis/10 border border-oblivionis/40 text-oblivionis">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">剧作家正在选择剧本...</span>
          </div>
          
          <div className="text-center text-slate-500 text-sm max-w-md">
            <p>你是 <span className={cn("font-bold", roleColor)}>{roleLabel}</span></p>
            <p className="mt-2">请等待剧作家完成剧本配置后开始游戏</p>
          </div>
          
          <button
            onClick={leaveRoom}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回大厅
          </button>
        </motion.div>
      </div>
    );
  }

  // 未连接且从未尝试过连接 - 显示连接中界面
  // 如果已经尝试过初始连接，则进入大厅，连接状态由右上角图标显示
  if (!isConnected && !isReconnecting && !hasAttemptedInitialConnect) {
    return (
      <div className="min-h-screen rendered-dark-bg relative flex flex-col items-center justify-center p-4 sm:p-8">
        <button
          onClick={handleBackToModeSelect}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          返回上一步
        </button>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">惨剧轮回</h1>
          <p className="text-slate-400 text-lg">Tragedy Looper</p>
        </motion.div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-doloris/15 border border-doloris/40 text-doloris">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">正在连接服务器...</span>
        </div>
      </div>
    );
  }

  // 即使未连接，但已经尝试过初始连接，且不在房间内，显示房间列表/大厅
  // 连接状态指示器已经在 layout/page 中统一显示了，这里不需要阻塞

  // 已在房间内 - 显示角色选择
  if (currentRoom) {
    const mastermindStatus = getRoleStatus('mastermind');
    const protagonistStatus = getRoleStatus('protagonist');
    
    return (
      <div className="min-h-screen rendered-dark-bg flex flex-col items-center justify-center p-4 sm:p-8">
        {/* 顶部导航 */}
        <div className="absolute top-4 left-4">
          <button
            onClick={leaveRoom}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            返回大厅
          </button>
        </div>

        {/* 房间信息 */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-2">
            <Home className="w-4 h-4" />
            <span>房间</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1">
            {currentRoom.name}
          </h1>
          <p className="text-slate-500 text-sm font-mono">#{currentRoom.id}</p>
        </motion.div>

        {/* 连接状态 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {isReconnecting ? (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-doloris/15 border border-doloris/40 text-doloris">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">重连中...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-mortis/15 border border-mortis/40 text-mortis">
              <Wifi className="w-5 h-5" />
              <span className="font-medium">已连接</span>
            </div>
          )}
        </motion.div>

        {/* 角色选择 */}
        <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center w-full max-w-5xl">
          {/* 剧作家 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={mastermindStatus === 'available' ? { scale: 1.03, y: -5 } : {}}
            whileTap={mastermindStatus === 'available' ? { scale: 0.98 } : {}}
            onClick={() => mastermindStatus === 'available' && handleSelectRole('mastermind')}
            className={cn(
              "group relative w-full md:w-80 h-[320px] sm:h-[400px] overflow-hidden rounded-2xl border-2 shadow-2xl transition-all",
              mastermindStatus === 'available' 
                ? "cursor-pointer border-timoris/30 hover:border-timoris hover:shadow-timoris/20 bg-gradient-to-br from-slate-900 to-slate-800"
                : mastermindStatus === 'self' || mastermindStatus === 'selecting'
                  ? "border-timoris shadow-timoris/30 bg-gradient-to-br from-timoris/30 to-slate-900"
                  : "cursor-not-allowed border-slate-700 bg-slate-900/50 opacity-60"
            )}
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-timoris/20 blur-3xl rounded-full" />
            
            {/* 状态标签 */}
            <div className="absolute top-4 right-4 z-10">
              {mastermindStatus === 'selecting' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-oblivionis/30 border border-oblivionis text-oblivionis/60 text-sm font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在选择...
                </div>
              )}
              {mastermindStatus === 'taken' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-timoris/30 border border-timoris text-timoris/60 text-sm font-bold">
                  <X className="w-4 h-4" />
                  已被占用
                </div>
              )}
              {mastermindStatus === 'self' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-mortis/30 border border-mortis text-mortis/60 text-sm font-bold">
                  <Check className="w-4 h-4" />
                  已选择
                </div>
              )}
              {mastermindStatus === 'available' && (
                <div className="px-3 py-1 rounded-full bg-timoris/40 text-timoris/80 text-sm font-bold">
                  空位
                </div>
              )}
            </div>
            
            <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
              <div className={cn(
                "mb-6 p-5 rounded-full transition-all duration-300",
                mastermindStatus === 'available' 
                  ? "bg-timoris/10 text-timoris group-hover:text-timoris/80 group-hover:scale-110"
                  : "bg-timoris/10 text-timoris/50"
              )}>
                <Brain size={72} />
              </div>
              
              <h2 className={cn(
                "text-3xl font-black mb-2 tracking-tight",
                mastermindStatus !== 'taken' ? "text-white" : "text-slate-500"
              )}>
                剧作家
              </h2>
              <p className="text-timoris/60 text-sm font-medium mb-6">Mastermind</p>
              
              <div className={cn(
                "text-sm leading-relaxed",
                mastermindStatus !== 'taken' ? "text-slate-400" : "text-slate-600"
              )}>
                知晓一切真相，操控轮回，<br/>在暗处编织绝望的剧本。
              </div>

              {mastermindStatus === 'available' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-6 left-6 right-6"
                >
                  <div className="py-3 rounded-xl bg-timoris/80 text-white font-bold text-center group-hover:bg-timoris transition-colors">
                    选择剧作家
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* 主人公 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={protagonistStatus === 'available' ? { scale: 1.03, y: -5 } : {}}
            whileTap={protagonistStatus === 'available' ? { scale: 0.98 } : {}}
            onClick={() => protagonistStatus === 'available' && handleSelectRole('protagonist')}
            className={cn(
              "group relative w-full md:w-80 h-[320px] sm:h-[400px] overflow-hidden rounded-2xl border-2 shadow-2xl transition-all",
              protagonistStatus === 'available' 
                ? "cursor-pointer border-oblivionis/30 hover:border-oblivionis hover:shadow-oblivionis/20 bg-gradient-to-br from-slate-900 to-slate-800"
                : protagonistStatus === 'self' || protagonistStatus === 'selecting'
                  ? "border-oblivionis shadow-oblivionis/30 bg-gradient-to-br from-oblivionis/30 to-slate-900"
                  : "cursor-not-allowed border-slate-700 bg-slate-900/50 opacity-60"
            )}
          >
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-oblivionis/20 blur-3xl rounded-full" />
            
            <div className="absolute top-4 right-4 z-10">
              {protagonistStatus === 'selecting' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-oblivionis/30 border border-oblivionis text-oblivionis/60 text-sm font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在选择...
                </div>
              )}
              {protagonistStatus === 'taken' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-timoris/30 border border-timoris text-timoris/60 text-sm font-bold">
                  <X className="w-4 h-4" />
                  已被占用
                </div>
              )}
              {protagonistStatus === 'self' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-mortis/30 border border-mortis text-mortis/60 text-sm font-bold">
                  <Check className="w-4 h-4" />
                  已选择
                </div>
              )}
              {protagonistStatus === 'available' && (
                <div className="px-3 py-1 rounded-full bg-oblivionis/40 text-oblivionis/80 text-sm font-bold">
                  空位
                </div>
              )}
            </div>
            
            <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
              <div className={cn(
                "mb-6 p-5 rounded-full transition-all duration-300",
                protagonistStatus === 'available' 
                  ? "bg-oblivionis/10 text-oblivionis group-hover:text-oblivionis/80 group-hover:scale-110"
                  : "bg-oblivionis/10 text-oblivionis/50"
              )}>
                <Users size={72} />
              </div>
              
              <h2 className={cn(
                "text-3xl font-black mb-2 tracking-tight",
                protagonistStatus !== 'taken' ? "text-white" : "text-slate-500"
              )}>
                主人公
              </h2>
              <p className="text-oblivionis/60 text-sm font-medium mb-6">Protagonist</p>
              
              <div className={cn(
                "text-sm leading-relaxed",
                protagonistStatus !== 'taken' ? "text-slate-400" : "text-slate-600"
              )}>
                打破命运的枷锁，识破阴谋，<br/>在无限的轮回中寻找希望。
              </div>

              {protagonistStatus === 'available' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-6 left-6 right-6"
                >
                  <div className="py-3 rounded-xl bg-oblivionis/80 text-white font-bold text-center group-hover:bg-oblivionis transition-colors">
                    选择主人公
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* 旁观 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={!isSpectator ? { scale: 1.03, y: -5 } : {}}
            whileTap={!isSpectator ? { scale: 0.98 } : {}}
            onClick={() => { if (!isSpectator) spectate(); }}
            className={cn(
              "group relative w-full md:w-52 h-[320px] sm:h-[400px] overflow-hidden rounded-2xl border-2 shadow-2xl transition-all",
              isSpectator
                ? "border-slate-500 shadow-slate-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900"
                : "cursor-pointer border-slate-700/50 hover:border-slate-500 hover:shadow-slate-400/10 bg-gradient-to-br from-slate-900 to-slate-800"
            )}
          >
            {isSpectator && (
              <div className="absolute top-4 right-4 z-10">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-mortis/30 border border-mortis text-mortis/60 text-sm font-bold">
                  <Check className="w-4 h-4" />
                  旁观中
                </div>
              </div>
            )}

            <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
              <div className={cn(
                "mb-6 p-5 rounded-full transition-all duration-300",
                isSpectator
                  ? "bg-slate-500/10 text-slate-400"
                  : "bg-slate-500/10 text-slate-500 group-hover:text-slate-300 group-hover:scale-110"
              )}>
                <Eye size={56} />
              </div>

              <h2 className="text-2xl font-black mb-2 tracking-tight text-white">
                旁观
              </h2>
              <p className="text-slate-400/60 text-sm font-medium mb-6">Spectator</p>

              <div className="text-sm leading-relaxed text-slate-500">
                不参与行动，<br/>在一旁观看全局。
              </div>

              {!isSpectator && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-6 left-6 right-6"
                >
                  <div className="py-3 rounded-xl bg-slate-600/80 text-white font-bold text-center group-hover:bg-slate-500 transition-colors">
                    旁观
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* 底部操作 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          {myRole && (
            <button
              onClick={() => {
                if (confirm('确定要重置游戏吗？')) {
                  resetGame();
                }
              }}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all text-sm"
            >
              重置游戏
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // 房间列表
  return (
    <div className="min-h-screen rendered-dark-bg relative flex flex-col items-center justify-center p-4 sm:p-8">
      <button
        onClick={handleBackToModeSelect}
        className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        返回上一步
      </button>
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl font-black text-white tracking-tight mb-2">惨剧轮回</h1>
        <p className="text-slate-400 text-lg">Tragedy Looper</p>
      </motion.div>

      {/* 用户名显示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-4 flex items-center gap-2"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-600 text-slate-300">
          <span className="text-slate-500 text-sm">玩家:</span>
          <span className="font-bold text-white">{username}</span>
        </div>
        <button
          onClick={() => {
            if (confirm('确定要更换名字吗？')) {
              clearUsername();
            }
          }}
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
          title="更换名字"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </motion.div>

      {/* 连接状态 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-mortis/15 border border-mortis/40 text-mortis">
          <Wifi className="w-5 h-5" />
          <span className="font-medium">已连接服务器</span>
        </div>
      </motion.div>

      {/* 房间操作区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-lg"
      >
        {/* 创建房间按钮/表单 */}
        <AnimatePresence mode="wait">
          {!showCreateForm ? (
            <motion.button
              key="create-button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 py-4 rounded-xl bg-gradient-to-r from-timoris to-oblivionis hover:from-timoris/80 hover:to-oblivionis/80 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-timoris/25"
            >
              <Plus className="w-6 h-6" />
              创建新房间
            </motion.button>
          ) : (
            <motion.div
              key="create-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-6 rounded-xl bg-slate-800/80 border border-slate-700"
            >
              <h3 className="text-lg font-bold text-white mb-4">创建房间</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">房间名称</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="输入房间名称..."
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:border-timoris focus:outline-none"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-1">密码（可选）</label>
                  <input
                    type="password"
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    placeholder="留空则不设密码..."
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:border-timoris focus:outline-none"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    className="flex-1 py-3 rounded-lg bg-timoris text-white font-bold hover:bg-timoris/80 transition-colors"
                  >
                    创建
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 房间列表 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 font-medium">在线房间</h3>
            <button
              onClick={refreshRooms}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无房间</p>
              <p className="text-sm mt-1">点击上方按钮创建一个</p>
            </div>
          ) : (
            rooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-bold">{room.name}</h4>
                      {room.hasPassword && (
                        <Lock className="w-4 h-4 text-doloris" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="font-mono">#{room.id}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {room.playerCount}/2
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          room.players.mastermind ? "bg-timoris" : "bg-slate-600"
                        )} />
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          room.players.protagonist ? "bg-oblivionis" : "bg-slate-600"
                        )} />
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleJoinRoom(room.id, room.hasPassword)}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all",
                      room.playerCount >= 2
                        ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        : "bg-oblivionis text-white hover:bg-oblivionis/80"
                    )}
                  >
                    {room.playerCount >= 2 ? <Eye className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                    {room.playerCount >= 2 ? '旁观' : '加入'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* 密码输入弹窗 */}
      <AnimatePresence>
        {joiningRoomId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setJoiningRoomId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-doloris" />
                <h3 className="text-lg font-bold text-white">输入房间密码</h3>
              </div>
              
              <input
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="请输入密码..."
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:border-doloris focus:outline-none mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmJoin()}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setJoiningRoomId(null)}
                  className="flex-1 py-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmJoin}
                  className="flex-1 py-3 rounded-lg bg-doloris text-white font-bold hover:bg-doloris/80 transition-colors"
                >
                  加入
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部提示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center text-slate-600 text-sm"
      >
        <p>创建或加入房间开始游戏</p>
        {serverVersion && (
          <p className="text-xs text-slate-700 mt-2">Server v{serverVersion}</p>
        )}
      </motion.div>
    </div>
  );
}
