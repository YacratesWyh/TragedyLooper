import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Users } from 'lucide-react';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';

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
        className="group relative w-full md:w-80 h-96 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-timoris/30 shadow-2xl hover:shadow-timoris/20 hover:border-timoris transition-all"
      >
        <div className="absolute inset-0 bg-timoris/5 group-hover:bg-timoris/10 transition-colors" />
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-timoris/20 blur-3xl rounded-full" />
        
        <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-6 p-4 rounded-full bg-timoris/10 text-timoris group-hover:text-timoris/80 group-hover:scale-110 transition-all duration-300">
                <Brain size={64} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">剧作家</h2>
            <p className="text-timoris/60 text-sm font-medium">Mastermind</p>
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
        className="group relative w-full md:w-80 h-96 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-oblivionis/30 shadow-2xl hover:shadow-oblivionis/20 hover:border-oblivionis transition-all"
      >
        <div className="absolute inset-0 bg-oblivionis/5 group-hover:bg-oblivionis/10 transition-colors" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-oblivionis/20 blur-3xl rounded-full" />
        
        <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-6 p-4 rounded-full bg-oblivionis/10 text-oblivionis group-hover:text-oblivionis/80 group-hover:scale-110 transition-all duration-300">
                <Users size={64} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">主人公</h2>
            <p className="text-oblivionis/60 text-sm font-medium">Protagonist</p>
            <div className="mt-8 text-sm text-slate-400 leading-relaxed group-hover:text-slate-300">
                打破命运的枷锁，<br/>识破阴谋，<br/>在无限的轮回中寻找希望。
            </div>
        </div>
      </motion.div>
    </div>
  );
}
