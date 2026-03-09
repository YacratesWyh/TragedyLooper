import React, { useCallback } from 'react';
import { useGameStore } from '@/games/tragedy-looper/store';
import { useMultiplayer } from '@/shared/useMultiplayer';
import { ALL_CHARACTERS } from '@/games/tragedy-looper/scripts/characters';
import { LocationZone } from './LocationZone';
import type { LocationType, PlayedCard, CharacterId } from '@/games/tragedy-looper/types';

interface GameBoardProps {
  onLocationClick?: (location: LocationType) => void;
  onCharacterClick?: (charId: string) => void;
  /** 是否正在放牌（有选中的牌） */
  isPlacingCard?: boolean;
}

export function GameBoard({ onLocationClick, onCharacterClick, isPlacingCard = false }: GameBoardProps) {
  const gameState = useGameStore((state) => state.gameState);
  const playerRole = useGameStore((state) => state.playerRole);
  const mastermindCards = useGameStore((state) => state.currentMastermindCards);
  const protagonistCards = useGameStore((state) => state.currentProtagonistCards);
  const storeRetreatCard = useGameStore((state) => state.retreatCard);
  
  // 历史回放状态
  const currentHistoryIndex = useGameStore((state) => state.currentHistoryIndex);
  const dayHistory = useGameStore((state) => state.dayHistory);
  const isViewingHistory = currentHistoryIndex !== null;
  const historySnapshot = isViewingHistory ? dayHistory[currentHistoryIndex] : null;
  
  const { isConnected, updateGameState, moveCharacter } = useMultiplayer();

  // 处理角色拖拽落下
  const handleDragEnd = useCallback((charId: string, x: number, y: number) => {
    // 查找落点在哪个区域
    const elements = document.elementsFromPoint(x, y);
    const zoneElement = elements.find(el => el.hasAttribute('data-zone-type'));
    
    if (zoneElement) {
      const newLocation = zoneElement.getAttribute('data-zone-type') as LocationType;
      if (newLocation) {
        console.log(`📍 角色 ${charId} 移动到 ${newLocation}`);
        moveCharacter(charId as CharacterId, newLocation);
      }
    }
  }, [moveCharacter]);

  // 撤回牌并同步到服务器
  const retreatCard = useCallback((cardId: string) => {
    storeRetreatCard(cardId);
    
    // 联机模式下同步到服务器
    if (isConnected) {
      setTimeout(() => {
        const state = useGameStore.getState();
        updateGameState({
          gameState: state.gameState,
          mastermindDeck: state.mastermindDeck,
          protagonistDeck: state.protagonistDeck,
          currentMastermindCards: state.currentMastermindCards,
          currentProtagonistCards: state.currentProtagonistCards,
        });
      }, 50);
    }
  }, [storeRetreatCard, isConnected, updateGameState]);

  if (!gameState) return null;

  // 区分自己的牌和对方的牌（回放时不显示牌）
  const myCards: PlayedCard[] = isViewingHistory ? [] : (playerRole === 'mastermind' ? mastermindCards : protagonistCards);
  const opponentCards: PlayedCard[] = isViewingHistory ? [] : (playerRole === 'mastermind' ? protagonistCards : mastermindCards);

  // 使用历史快照或当前状态的角色数据
  const displayCharacters = isViewingHistory && historySnapshot 
    ? historySnapshot.characters 
    : gameState.characters;
  
  const displayBoardIntrigue = isViewingHistory && historySnapshot
    ? historySnapshot.boardIntrigue
    : gameState.boardIntrigue;

  // Group characters by location
  const charsByLocation = displayCharacters.reduce((acc, char) => {
    if (!acc[char.location]) acc[char.location] = [];
    acc[char.location].push(char);
    return acc;
  }, {} as Record<LocationType, typeof displayCharacters>);

  return (
    <div className="w-full h-full p-4 grid grid-cols-2 gap-6 mx-auto relative min-w-[400px]">
      {/* 历史回放提示 */}
      {isViewingHistory && historySnapshot && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-doloris/90 text-black rounded-full text-sm font-bold shadow-lg">
          📜 回放：第 {historySnapshot.loop} 轮回 · 第 {historySnapshot.day} 天结束时
        </div>
      )}

      {/* Top Left: Hospital */}
      <LocationZone 
        type="hospital" 
        characters={charsByLocation['hospital'] || []}
        characterDefs={ALL_CHARACTERS}
        intrigueCount={displayBoardIntrigue['hospital']}
        myPlacedCards={myCards}
        opponentPlacedCards={opponentCards}
        onRetreatCard={isViewingHistory ? undefined : retreatCard}
        onLocationClick={isViewingHistory ? undefined : onLocationClick}
        onCharacterClick={isViewingHistory ? undefined : onCharacterClick}
        isPlacingCard={isViewingHistory ? false : isPlacingCard}
        onCharacterDragEnd={isViewingHistory ? undefined : handleDragEnd}
      />

      {/* Top Right: Shrine */}
      <LocationZone 
        type="shrine" 
        characters={charsByLocation['shrine'] || []}
        characterDefs={ALL_CHARACTERS}
        intrigueCount={displayBoardIntrigue['shrine']}
        myPlacedCards={myCards}
        opponentPlacedCards={opponentCards}
        onRetreatCard={isViewingHistory ? undefined : retreatCard}
        onLocationClick={isViewingHistory ? undefined : onLocationClick}
        onCharacterClick={isViewingHistory ? undefined : onCharacterClick}
        isPlacingCard={isViewingHistory ? false : isPlacingCard}
        onCharacterDragEnd={isViewingHistory ? undefined : handleDragEnd}
      />

      {/* Bottom Left: City */}
      <LocationZone 
        type="city" 
        characters={charsByLocation['city'] || []}
        characterDefs={ALL_CHARACTERS}
        intrigueCount={displayBoardIntrigue['city']}
        myPlacedCards={myCards}
        opponentPlacedCards={opponentCards}
        onRetreatCard={isViewingHistory ? undefined : retreatCard}
        onLocationClick={isViewingHistory ? undefined : onLocationClick}
        onCharacterClick={isViewingHistory ? undefined : onCharacterClick}
        isPlacingCard={isViewingHistory ? false : isPlacingCard}
        onCharacterDragEnd={isViewingHistory ? undefined : handleDragEnd}
      />

      {/* Bottom Right: School */}
      <LocationZone 
        type="school" 
        characters={charsByLocation['school'] || []}
        characterDefs={ALL_CHARACTERS}
        intrigueCount={displayBoardIntrigue['school']}
        myPlacedCards={myCards}
        opponentPlacedCards={opponentCards}
        onRetreatCard={isViewingHistory ? undefined : retreatCard}
        onLocationClick={isViewingHistory ? undefined : onLocationClick}
        onCharacterClick={isViewingHistory ? undefined : onCharacterClick}
        isPlacingCard={isViewingHistory ? false : isPlacingCard}
        onCharacterDragEnd={isViewingHistory ? undefined : handleDragEnd}
      />
    </div>
  );
}
