import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Users } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayer } from '@/lib/useMultiplayer';

export function RoleSelector({ onSelect }: { onSelect: () => void }) {
  const initializeGame = useGameStore((state) => state.initializeGame);
  const { isConnected, updateGameState } = useMultiplayer();

  const handleSelect = (role: 'mastermind' | 'protagonist') => {
    initializeGame(role);
    
    // 联机模式下同步初始化状态到服务器
    if (isConnected) {
      setTimeout(() => {
        const state = useGameStore.getState();
        console.log('📤 同步游戏初始化状态到服务器');
        updateGameState({
          gameState: state.gameState,
          mastermindDeck: state.mastermindDeck,
          protagonistDeck: state.protagonistDeck,
          currentMastermindCards: [],
          currentProtagonistCards: [],
        });
      }, 100);
    }
    
    onSelect();
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full max-w-4xl z-10">
      {/* Mastermind Card */}
      <motion.div
        whileHover={{ scale: 1.05, y: -10 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleSelect('mastermind')}
        className="group relative w-full md:w-80 h-96 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 shadow-2xl hover:shadow-purple-500/20 hover:border-purple-500 transition-all"
      >
        <div className="absolute inset-0 bg-purple-900/10 group-hover:bg-purple-900/20 transition-colors" />
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full" />
        
        <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-6 p-4 rounded-full bg-purple-500/10 text-purple-400 group-hover:text-purple-300 group-hover:scale-110 transition-all duration-300">
                <Brain size={64} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">剧作家</h2>
            <p className="text-purple-200/60 text-sm font-medium">Mastermind</p>
            <div className="mt-8 text-sm text-slate-400 leading-relaxed group-hover:text-slate-300">
                知晓一切真相，<br/>操控轮回，<br/>在暗处编织绝望的剧本。
            </div>
        </div>
      </motion.div>

      {/* Protagonist Card */}
      <motion.div
        whileHover={{ scale: 1.05, y: -10 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleSelect('protagonist')}
        className="group relative w-full md:w-80 h-96 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-blue-500/30 shadow-2xl hover:shadow-blue-500/20 hover:border-blue-500 transition-all"
      >
        <div className="absolute inset-0 bg-blue-900/10 group-hover:bg-blue-900/20 transition-colors" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
        
        <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-6 p-4 rounded-full bg-blue-500/10 text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-all duration-300">
                <Users size={64} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">主人公</h2>
            <p className="text-blue-200/60 text-sm font-medium">Protagonist</p>
            <div className="mt-8 text-sm text-slate-400 leading-relaxed group-hover:text-slate-300">
                打破命运的枷锁，<br/>识破阴谋，<br/>在无限的轮回中寻找希望。
            </div>
        </div>
      </motion.div>
    </div>
  );
}
