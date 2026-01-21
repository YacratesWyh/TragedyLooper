import React, { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { FS01_CHARACTERS } from '@/game/scripts/fs-01';
import { LocationZone } from './LocationZone';
import type { LocationType, PlayedCard } from '@/types/game';

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
  
  const { isConnected, updateGameState } = useMultiplayer();

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

  // 区分自己的牌和对方的牌
  const myCards: PlayedCard[] = playerRole === 'mastermind' ? mastermindCards : protagonistCards;
  const opponentCards: PlayedCard[] = playerRole === 'mastermind' ? protagonistCards : mastermindCards;

  // Group characters by location
  const charsByLocation = gameState.characters.reduce((acc, char) => {
    if (!acc[char.location]) acc[char.location] = [];
    acc[char.location].push(char);
    return acc;
  }, {} as Record<LocationType, typeof gameState.characters>);

  return (
    <div className="w-full h-full p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
      {/* Top Left: Hospital */}
      <LocationZone 
        type="hospital" 
        characters={charsByLocation['hospital'] || []}
        characterDefs={FS01_CHARACTERS}
        intrigueCount={gameState.boardIntrigue['hospital']}
        myPlacedCards={myCards}
        opponentPlacedCards={opponentCards}
        onRetreatCard={retreatCard}
        onLocationClick={onLocationClick}
        onCharacterClick={onCharacterClick}
        isPlacingCard={isPlacingCard}
      />

      {/* Top Right: Shrine */}
      <LocationZone 
        type="shrine" 
        characters={charsByLocation['shrine'] || []}
        characterDefs={FS01_CHARACTERS}
        intrigueCount={gameState.boardIntrigue['shrine']}
        myPlacedCards={myCards}
        opponentPlacedCards={opponentCards}
        onRetreatCard={retreatCard}
        onLocationClick={onLocationClick}
        onCharacterClick={onCharacterClick}
        isPlacingCard={isPlacingCard}
      />

      {/* Bottom Left: City */}
      <LocationZone 
        type="city" 
        characters={charsByLocation['city'] || []}
        characterDefs={FS01_CHARACTERS}
        intrigueCount={gameState.boardIntrigue['city']}
        myPlacedCards={myCards}
        opponentPlacedCards={opponentCards}
        onRetreatCard={retreatCard}
        onLocationClick={onLocationClick}
        onCharacterClick={onCharacterClick}
        isPlacingCard={isPlacingCard}
      />

      {/* Bottom Right: School */}
      <LocationZone 
        type="school" 
        characters={charsByLocation['school'] || []}
        characterDefs={FS01_CHARACTERS}
        intrigueCount={gameState.boardIntrigue['school']}
        myPlacedCards={myCards}
        opponentPlacedCards={opponentCards}
        onRetreatCard={retreatCard}
        onLocationClick={onLocationClick}
        onCharacterClick={onCharacterClick}
        isPlacingCard={isPlacingCard}
      />
    </div>
  );
}
