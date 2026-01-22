import React from 'react';
import type { LocationType, CharacterState, Character, PlayedCard, CharacterId } from '@/types/game';
import { LOCATION_NAMES } from '@/types/game';
import { CharacterCard } from './CharacterCard';
import { PlacedCards } from './PlacedCards';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface LocationZoneProps {
  type: LocationType;
  characters: CharacterState[];
  characterDefs: Record<string, Character>;
  intrigueCount: number;
  /** 自己打在该地点角色上的牌 */
  myPlacedCards?: PlayedCard[];
  /** 对方打在该地点角色上的牌 */
  opponentPlacedCards?: PlayedCard[];
  /** 撤回牌的回调 */
  onRetreatCard?: (cardId: string) => void;
  className?: string;
  onLocationClick?: (location: LocationType) => void;
  onCharacterClick?: (charId: string) => void;
  /** 是否正在放牌（有选中的牌） */
  isPlacingCard?: boolean;
  /** 角色拖拽落下回调 */
  onCharacterDragEnd?: (charId: string, x: number, y: number) => void;
}

const LOCATION_COLORS: Record<LocationType, string> = {
  hospital: 'border-cyan-500/50 bg-cyan-950/10 hover:bg-cyan-900/20',
  shrine: 'border-red-500/50 bg-red-950/10 hover:bg-red-900/20',
  city: 'border-blue-500/50 bg-blue-950/10 hover:bg-blue-900/20',
  school: 'border-yellow-500/50 bg-yellow-950/10 hover:bg-yellow-900/20',
};

const LOCATION_BG_COLORS: Record<LocationType, string> = {
  hospital: 'bg-cyan-500',
  shrine: 'bg-red-500',
  city: 'bg-blue-500',
  school: 'bg-yellow-500',
};

export function LocationZone({ 
  type, 
  characters, 
  characterDefs, 
  intrigueCount, 
  myPlacedCards = [],
  opponentPlacedCards = [],
  onRetreatCard,
  className, 
  onLocationClick, 
  onCharacterClick,
  isPlacingCard = false,
  onCharacterDragEnd
}: LocationZoneProps) {
  // 筛选打在地点上的牌（targetLocation === type）
  const myLocationCards = myPlacedCards.filter(pc => pc.targetLocation === type && !pc.targetCharacterId);
  const oppLocationCards = opponentPlacedCards.filter(pc => pc.targetLocation === type && !pc.targetCharacterId);
  const hasLocationCards = myLocationCards.length > 0 || oppLocationCards.length > 0;

  // 获取某角色上的牌
  const getCharacterCards = (charId: CharacterId) => ({
    my: myPlacedCards.filter(pc => pc.targetCharacterId === charId),
    opp: opponentPlacedCards.filter(pc => pc.targetCharacterId === charId),
  });

  return (
    <div 
      onClick={() => onLocationClick?.(type)}
      data-zone-type={type}
      className={cn(
        "relative rounded-xl border-2 p-4 min-h-[300px] flex flex-col gap-4 transition-all duration-300 cursor-pointer",
        LOCATION_COLORS[type],
        className
      )}
    >
      {/* Location Header */}
      <div className="flex justify-between items-center mb-2 pointer-events-none">
        <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg text-white", LOCATION_BG_COLORS[type])}>
                <MapPin size={16} />
            </div>
            <h3 className="text-xl font-bold text-slate-200 tracking-wider">{LOCATION_NAMES[type]}</h3>
        </div>
        
        {/* Board Intrigue Tokens + 打在地点上的牌 */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {hasLocationCards && (
            <PlacedCards 
              myCards={myLocationCards} 
              opponentCards={oppLocationCards}
              onRetreat={onRetreatCard}
            />
          )}
          {intrigueCount > 0 && (
              <div className="flex items-center gap-1 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
                  <span className="text-slate-400 text-xs">地点密谋</span>
                  <span className="text-white font-bold">{intrigueCount}</span>
              </div>
          )}
        </div>
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 place-items-start content-start flex-1">
        {characters.map((charState) => {
          const cards = getCharacterCards(charState.id as CharacterId);
          return (
            <CharacterCard 
              key={charState.id}
              characterState={charState}
              characterDef={characterDefs[charState.id]}
              isDead={!charState.alive}
              myPlacedCards={cards.my}
              opponentPlacedCards={cards.opp}
              onRetreatCard={onRetreatCard}
              isPlacingCard={isPlacingCard}
              onClick={(e) => {
                e.stopPropagation();
              onCharacterClick?.(charState.id);
            }}
            onDragEnd={onCharacterDragEnd}
          />
          );
        })}
      </div>
    </div>
  );
}
