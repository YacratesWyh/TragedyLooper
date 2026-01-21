'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { GameBoard } from '@/components/GameBoard';
import { RoleSelector } from '@/components/RoleSelector';
import { GameInfo } from '@/components/GameInfo';
import { ActionHand } from '@/components/ActionHand';
import { ActionCard as ActionCardInterface, LocationType, CharacterId } from '@/types/game';
import { Play, RotateCcw } from 'lucide-react';

// Mock Cards Generator
const generateHand = (role: 'mastermind' | 'protagonist'): ActionCardInterface[] => {
  const cards: ActionCardInterface[] = [];
  let id = 1;
  const owner = role;

  // Movement
  cards.push({ id: `m-${id++}`, type: 'movement', owner, movementType: 'horizontal' });
  cards.push({ id: `m-${id++}`, type: 'movement', owner, movementType: 'vertical' });
  cards.push({ id: `m-${id++}`, type: 'movement', owner, movementType: 'diagonal' });
  
  // Goodwill
  cards.push({ id: `g-${id++}`, type: 'goodwill', owner, value: 1 });
  cards.push({ id: `g-${id++}`, type: 'goodwill', owner, value: 2 });

  // Anxiety
  cards.push({ id: `a-${id++}`, type: 'anxiety', owner, value: 1 });
  if (role === 'mastermind') {
     cards.push({ id: `a-${id++}`, type: 'anxiety', owner, value: 2 });
  }

  // Intrigue
  cards.push({ id: `i-${id++}`, type: 'intrigue', owner, value: 1 });
  if (role === 'mastermind') {
    cards.push({ id: `i-${id++}`, type: 'intrigue', owner, value: 2 });
  }
  
  return cards;
};

export default function Home() {
  const { gameState, playerRole, playCard, resolveDay, endLoop } = useGameStore();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Generate hand based on player role (derived state)
  const hand = gameState ? generateHand(playerRole) : []; 

  // Handle Card Play
  const handleCardPlay = (targetId?: string, targetType?: 'character' | 'location') => {
    if (!selectedCardId) return;

    const card = hand.find(c => c.id === selectedCardId);
    if (!card) return;

    // Validate target based on card type
    // Movement -> Character
    // Goodwill/Anxiety -> Character
    // Intrigue -> Character or Location (usually char, but some special rules allow location)
    // For this simplified version, let's assume all target characters except if explicitly location targeted (which we don't strictly enforce in types yet)
    
    // Construct PlayedCard
    const playedCard = {
      card: card,
      targetCharacterId: targetType === 'character' ? (targetId as CharacterId) : undefined,
      targetLocation: targetType === 'location' ? (targetId as LocationType) : undefined
    };

    console.log('Playing card:', playedCard);
    playCard(playedCard);
    setSelectedCardId(null);
  };

  if (!gameState) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-950 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-purple-900/20 blur-[100px] rounded-full" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-900/20 blur-[100px] rounded-full" />
        </div>
        
        <div className="z-10 text-center mb-12">
            <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-blue-500">
                惨剧轮回
            </h1>
            <p className="text-xl text-slate-400 font-light tracking-widest uppercase">Tragedy Looper</p>
        </div>

        <RoleSelector onSelect={() => {}} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Left Panel: Info */}
      <GameInfo />

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Bar / Phase Indicator */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">当前阶段</span>
                <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 font-bold text-blue-400">
                    {selectedCardId ? "请选择目标" : "行动阶段"}
                </span>
            </div>
            
            <div className="flex gap-2">
                 <button 
                    onClick={() => resolveDay()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-green-500/20 active:scale-95"
                >
                    <Play size={16} fill="currentColor" />
                    结算本日
                </button>
                
                <button 
                    onClick={() => endLoop()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold transition-all border border-slate-600 active:scale-95"
                >
                    <RotateCcw size={16} />
                    结束轮回
                </button>
            </div>
        </div>

        {/* Game Board */}
        <div className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4">
             <GameBoard 
                onCharacterClick={(charId) => handleCardPlay(charId, 'character')}
                onLocationClick={(loc) => handleCardPlay(loc, 'location')}
             />
        </div>

        {/* Hand */}
        <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-md z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
             <ActionHand 
                cards={hand} 
                selectedCardId={selectedCardId}
                onCardSelect={(card) => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
             />
        </div>
      </div>
    </main>
  );
}
