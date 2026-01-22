/**
 * 入场大厅 - 自动连接并选择角色
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Users, Wifi, WifiOff, Loader2, Check, X } from 'lucide-react';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface LobbyScreenProps {
  onGameStart: () => void;
}

export function LobbyScreen({ onGameStart }: LobbyScreenProps) {
  const { 
    isConnected, 
    connect, 
    myRole,
    availableRoles,
    players,
    selectRole,
  } = useMultiplayer();
  
  // 调试日志
  useEffect(() => {
    if (isConnected) {
      console.log('📡 Lobby 状态更新:', { myRole, players, availableRoles });
    }
  }, [isConnected, myRole, players, availableRoles]);
  
  const initializeGame = useGameStore((state) => state.initializeGame);
  const { updateGameState } = useMultiplayer();
  
  // 正在选择角色中（等待服务器确认）
  const [selectingRole, setSelectingRole] = useState<'mastermind' | 'protagonist' | null>(null);

  // 自动连接服务器
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  // 当角色被服务器确认后，处理本地状态初始化
  useEffect(() => {
    if (myRole && selectingRole) {
      setSelectingRole(null);
      
      const currentState = useGameStore.getState();
      
      // 只有在本地没有游戏状态时才初始化（说明是第一个进入的或者重置了）
      if (!currentState.gameState) {
        console.log('🎮 初始化新游戏:', myRole);
        initializeGame(myRole);
        
        // 同步初始化状态到服务器
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
      }
    }
  }, [myRole, selectingRole, initializeGame, updateGameState]);

  // 选择角色（发送请求，等待服务器确认）
  const handleSelectRole = (role: 'mastermind' | 'protagonist') => {
    if (selectingRole) return; // 防止重复点击
    
    // 如果该位置已被占用且不是自己，不让选
    const isTaken = role === 'mastermind' ? players.mastermind : players.protagonist;
    if (isTaken && myRole !== role) return;

    setSelectingRole(role);
    selectRole(role);
  };

  // 角色卡片状态
  const getRoleStatus = (role: 'mastermind' | 'protagonist') => {
    if (selectingRole === role) return 'selecting'; // 正在选择中
    if (myRole === role) return 'self';
    
    // 检查占用状态
    const isTaken = role === 'mastermind' ? !!players.mastermind : !!players.protagonist;
    if (isTaken) return 'taken';
    
    return 'available';
  };

  const mastermindStatus = getRoleStatus('mastermind');
  const protagonistStatus = getRoleStatus('protagonist');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-black text-white tracking-tight mb-2">
          惨剧轮回
        </h1>
        <p className="text-slate-400 text-lg">Tragedy Looper</p>
      </motion.div>

      {/* 连接状态 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        {!isConnected ? (
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-amber-900/30 border border-amber-600/50 text-amber-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">正在连接服务器...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-green-900/30 border border-green-600/50 text-green-300">
            <Wifi className="w-5 h-5" />
            <span className="font-medium">已连接</span>
          </div>
        )}
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
            "group relative w-full md:w-80 h-[420px] overflow-hidden rounded-2xl border-2 shadow-2xl transition-all",
            mastermindStatus === 'available' 
              ? "cursor-pointer border-purple-500/30 hover:border-purple-500 hover:shadow-purple-500/20 bg-gradient-to-br from-slate-900 to-slate-800"
              : mastermindStatus === 'self' || mastermindStatus === 'selecting'
                ? "border-purple-500 shadow-purple-500/30 bg-gradient-to-br from-purple-900/50 to-slate-900"
                : "cursor-not-allowed border-slate-700 bg-slate-900/50 opacity-60"
          )}
        >
          {/* 背景效果 */}
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
          
          {/* 内容 */}
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
              知晓一切真相，<br/>操控轮回，<br/>在暗处编织绝望的剧本。
            </div>

            {mastermindStatus === 'available' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
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
            "group relative w-full md:w-80 h-[420px] overflow-hidden rounded-2xl border-2 shadow-2xl transition-all",
            protagonistStatus === 'available' 
              ? "cursor-pointer border-blue-500/30 hover:border-blue-500 hover:shadow-blue-500/20 bg-gradient-to-br from-slate-900 to-slate-800"
              : protagonistStatus === 'self' || protagonistStatus === 'selecting'
                ? "border-blue-500 shadow-blue-500/30 bg-gradient-to-br from-blue-900/50 to-slate-900"
                : "cursor-not-allowed border-slate-700 bg-slate-900/50 opacity-60"
          )}
        >
          {/* 背景效果 */}
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
          
          {/* 状态标签 */}
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
          
          {/* 内容 */}
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
              打破命运的枷锁，<br/>识破阴谋，<br/>在无限的轮回中寻找希望。
            </div>

            {protagonistStatus === 'available' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
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

      {/* 底部提示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-12 text-center text-slate-500 text-sm flex flex-col items-center gap-4"
      >
        {!isConnected && (
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>无法连接？请确保服务器已启动 (npm run server)</span>
          </div>
        )}
        {isConnected && !players.mastermind && !players.protagonist && (
          <span>选择一个角色开始游戏</span>
        )}
        {isConnected && (players.mastermind || players.protagonist) && !myRole && (
          <span>已有玩家在线，请选择空位加入</span>
        )}

        {/* 管理/调试工具 */}
        {isConnected && (
          <button
            onClick={() => {
              if (confirm('确定要强制重置所有玩家和游戏状态吗？')) {
                resetGame();
              }
            }}
            className="mt-4 px-3 py-1 rounded border border-slate-800 text-slate-600 hover:bg-slate-800 hover:text-slate-400 transition-all text-[10px]"
          >
            强制清除所有位置
          </button>
        )}
      </motion.div>
    </div>
  );
}
