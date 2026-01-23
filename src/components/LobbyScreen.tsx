/**
 * 入场大厅 - 房间选择 + 角色选择 + 剧本选择
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Users, Wifi, WifiOff, Loader2, Check, X, Plus, LogIn, RefreshCw, Lock, Unlock, ArrowLeft, Home, BookOpen } from 'lucide-react';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { ScriptSetup } from './ScriptSetup';
import { SCRIPT_TEMPLATES, generatePublicInfo, type ScriptTemplate } from '@/game/scripts/fs-01';

interface LobbyScreenProps {
  onGameStart: () => void;
}

export function LobbyScreen({ onGameStart }: LobbyScreenProps) {
  const { 
    isConnected, 
    connect, 
    rooms,
    currentRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    refreshRooms,
    myRole,
    availableRoles,
    players,
    selectRole,
    resetGame,
  } = useMultiplayer();
  
  const initializeGame = useGameStore((state) => state.initializeGame);
  const initializeWithScript = useGameStore((state) => state.initializeWithScript);
  const { updateGameState } = useMultiplayer();
  
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

  // 自动连接服务器
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

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

  // 剧作家选择剧本后初始化游戏
  const handleScriptSelect = (script: ScriptTemplate) => {
    console.log('🎭 剧作家选择剧本:', script.name);
    setShowScriptSetup(false);
    
    // 使用选定的脚本初始化游戏
    if (initializeWithScript) {
      initializeWithScript('mastermind', script);
    } else {
      // 回退到旧方法
      initializeGame('mastermind');
    }
    
    setTimeout(() => {
      const state = useGameStore.getState();
      if (state.gameState) {
        updateGameState({
          gameState: state.gameState,
          mastermindDeck: state.mastermindDeck,
          protagonistDeck: state.protagonistDeck,
          currentMastermindCards: [],
          currentProtagonistCards: [],
        });
      }
    }, 150);
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
    const isTaken = role === 'mastermind' ? players.mastermind : players.protagonist;
    if (isTaken && myRole !== role) return;
    setSelectingRole(role);
    selectRole(role);
  };

  // 角色状态
  const getRoleStatus = (role: 'mastermind' | 'protagonist') => {
    if (selectingRole === role) return 'selecting';
    if (myRole === role) return 'self';
    const isTaken = role === 'mastermind' ? !!players.mastermind : !!players.protagonist;
    if (isTaken) return 'taken';
    return 'available';
  };

  // ========== 渲染 ==========

  // 剧作家选择剧本界面
  if (showScriptSetup && myRole === 'mastermind') {
    return (
      <ScriptSetup 
        onSelect={handleScriptSelect}
        onCancel={() => setShowScriptSetup(false)}
      />
    );
  }

  // 主人公等待剧作家选择剧本
  if (myRole === 'protagonist' && !gameState && currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
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
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-blue-900/30 border border-blue-600/50 text-blue-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">剧作家正在选择剧本...</span>
          </div>
          
          <div className="text-center text-slate-500 text-sm max-w-md">
            <p>你已选择 <span className="text-blue-400 font-bold">主人公</span> 角色</p>
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

  // 未连接
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">惨剧轮回</h1>
          <p className="text-slate-400 text-lg">Tragedy Looper</p>
        </motion.div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-amber-900/30 border border-amber-600/50 text-amber-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">正在连接服务器...</span>
        </div>
      </div>
    );
  }

  // 已在房间内 - 显示角色选择
  if (currentRoom) {
    const mastermindStatus = getRoleStatus('mastermind');
    const protagonistStatus = getRoleStatus('protagonist');
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
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
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-green-900/30 border border-green-600/50 text-green-300">
            <Wifi className="w-5 h-5" />
            <span className="font-medium">已连接</span>
          </div>
        </motion.div>

        {/* 角色选择 */}
        <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center w-full max-w-4xl">
          {/* 剧作家 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={mastermindStatus === 'available' ? { scale: 1.03, y: -5 } : {}}
            whileTap={mastermindStatus === 'available' ? { scale: 0.98 } : {}}
            onClick={() => mastermindStatus === 'available' && handleSelectRole('mastermind')}
            className={cn(
              "group relative w-full md:w-80 h-[400px] overflow-hidden rounded-2xl border-2 shadow-2xl transition-all",
              mastermindStatus === 'available' 
                ? "cursor-pointer border-purple-500/30 hover:border-purple-500 hover:shadow-purple-500/20 bg-gradient-to-br from-slate-900 to-slate-800"
                : mastermindStatus === 'self' || mastermindStatus === 'selecting'
                  ? "border-purple-500 shadow-purple-500/30 bg-gradient-to-br from-purple-900/50 to-slate-900"
                  : "cursor-not-allowed border-slate-700 bg-slate-900/50 opacity-60"
            )}
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full" />
            
            {/* 状态标签 */}
            <div className="absolute top-4 right-4 z-10">
              {mastermindStatus === 'selecting' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/80 border border-blue-600 text-blue-200 text-sm font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在选择...
                </div>
              )}
              {mastermindStatus === 'taken' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/80 border border-red-600 text-red-200 text-sm font-bold">
                  <X className="w-4 h-4" />
                  已被占用
                </div>
              )}
              {mastermindStatus === 'self' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/80 border border-green-600 text-green-200 text-sm font-bold">
                  <Check className="w-4 h-4" />
                  已选择
                </div>
              )}
              {mastermindStatus === 'available' && (
                <div className="px-3 py-1 rounded-full bg-purple-600/50 text-purple-200 text-sm font-bold">
                  空位
                </div>
              )}
            </div>
            
            <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
              <div className={cn(
                "mb-6 p-5 rounded-full transition-all duration-300",
                mastermindStatus === 'available' 
                  ? "bg-purple-500/10 text-purple-400 group-hover:text-purple-300 group-hover:scale-110"
                  : "bg-purple-500/5 text-purple-500/50"
              )}>
                <Brain size={72} />
              </div>
              
              <h2 className={cn(
                "text-3xl font-black mb-2 tracking-tight",
                mastermindStatus !== 'taken' ? "text-white" : "text-slate-500"
              )}>
                剧作家
              </h2>
              <p className="text-purple-200/60 text-sm font-medium mb-6">Mastermind</p>
              
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
                  <div className="py-3 rounded-xl bg-purple-600/80 text-white font-bold text-center group-hover:bg-purple-500 transition-colors">
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
              "group relative w-full md:w-80 h-[400px] overflow-hidden rounded-2xl border-2 shadow-2xl transition-all",
              protagonistStatus === 'available' 
                ? "cursor-pointer border-blue-500/30 hover:border-blue-500 hover:shadow-blue-500/20 bg-gradient-to-br from-slate-900 to-slate-800"
                : protagonistStatus === 'self' || protagonistStatus === 'selecting'
                  ? "border-blue-500 shadow-blue-500/30 bg-gradient-to-br from-blue-900/50 to-slate-900"
                  : "cursor-not-allowed border-slate-700 bg-slate-900/50 opacity-60"
            )}
          >
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
            
            <div className="absolute top-4 right-4 z-10">
              {protagonistStatus === 'selecting' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/80 border border-blue-600 text-blue-200 text-sm font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在选择...
                </div>
              )}
              {protagonistStatus === 'taken' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/80 border border-red-600 text-red-200 text-sm font-bold">
                  <X className="w-4 h-4" />
                  已被占用
                </div>
              )}
              {protagonistStatus === 'self' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/80 border border-green-600 text-green-200 text-sm font-bold">
                  <Check className="w-4 h-4" />
                  已选择
                </div>
              )}
              {protagonistStatus === 'available' && (
                <div className="px-3 py-1 rounded-full bg-blue-600/50 text-blue-200 text-sm font-bold">
                  空位
                </div>
              )}
            </div>
            
            <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
              <div className={cn(
                "mb-6 p-5 rounded-full transition-all duration-300",
                protagonistStatus === 'available' 
                  ? "bg-blue-500/10 text-blue-400 group-hover:text-blue-300 group-hover:scale-110"
                  : "bg-blue-500/5 text-blue-500/50"
              )}>
                <Users size={72} />
              </div>
              
              <h2 className={cn(
                "text-3xl font-black mb-2 tracking-tight",
                protagonistStatus !== 'taken' ? "text-white" : "text-slate-500"
              )}>
                主人公
              </h2>
              <p className="text-blue-200/60 text-sm font-medium mb-6">Protagonist</p>
              
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
                  <div className="py-3 rounded-xl bg-blue-600/80 text-white font-bold text-center group-hover:bg-blue-500 transition-colors">
                    选择主人公
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl font-black text-white tracking-tight mb-2">惨剧轮回</h1>
        <p className="text-slate-400 text-lg">Tragedy Looper</p>
      </motion.div>

      {/* 连接状态 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-green-900/30 border border-green-600/50 text-green-300">
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
              className="w-full mb-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-purple-500/25"
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
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
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
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
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
                    className="flex-1 py-3 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 transition-colors"
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
                        <Lock className="w-4 h-4 text-amber-500" />
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
                          room.players.mastermind ? "bg-purple-500" : "bg-slate-600"
                        )} />
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          room.players.protagonist ? "bg-blue-500" : "bg-slate-600"
                        )} />
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleJoinRoom(room.id, room.hasPassword)}
                    disabled={room.playerCount >= 2}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all",
                      room.playerCount >= 2
                        ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    )}
                  >
                    <LogIn className="w-4 h-4" />
                    {room.playerCount >= 2 ? '已满' : '加入'}
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
                <Lock className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-white">输入房间密码</h3>
              </div>
              
              <input
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="请输入密码..."
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none mb-4"
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
                  className="flex-1 py-3 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 transition-colors"
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
        创建或加入房间开始游戏
      </motion.div>
    </div>
  );
}
