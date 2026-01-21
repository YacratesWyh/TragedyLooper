import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { FS01_CHARACTERS } from '@/game/scripts/fs-01';
import { LocationZone } from './LocationZone';
import { LocationType } from '@/types/game';

interface GameBoardProps {
  onLocationClick?: (location: LocationType) => void;
  onCharacterClick?: (charId: string) => void;
}

export function GameBoard({ onLocationClick, onCharacterClick }: GameBoardProps) {
  const gameState = useGameStore((state) => state.gameState);

  if (!gameState) return null;

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
        onLocationClick={onLocationClick}
        onCharacterClick={onCharacterClick}
      />

      {/* Top Right: Shrine */}
      <LocationZone 
        type="shrine" 
        characters={charsByLocation['shrine'] || []}
        characterDefs={FS01_CHARACTERS}
        intrigueCount={gameState.boardIntrigue['shrine']}
        onLocationClick={onLocationClick}
        onCharacterClick={onCharacterClick}
      />

      {/* Bottom Left: City */}
      <LocationZone 
        type="city" 
        characters={charsByLocation['city'] || []}
        characterDefs={FS01_CHARACTERS}
        intrigueCount={gameState.boardIntrigue['city']}
        onLocationClick={onLocationClick}
        onCharacterClick={onCharacterClick}
      />

      {/* Bottom Right: School */}
      <LocationZone 
        type="school" 
        characters={charsByLocation['school'] || []}
        characterDefs={FS01_CHARACTERS}
        intrigueCount={gameState.boardIntrigue['school']}
        onLocationClick={onLocationClick}
        onCharacterClick={onCharacterClick}
      />
    </div>
  );
}
