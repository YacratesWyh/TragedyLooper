import React from 'react';
import { motion } from 'framer-motion';
import { ActionCard as ActionCardInterface } from '@/types/game';
import { ActionCard } from './ActionCard';
import { cn } from '@/lib/utils';

interface ActionHandProps {
  cards: ActionCardInterface[];
  selectedCardId?: string | null;
  onCardSelect: (card: ActionCardInterface) => void;
  className?: string;
}

export function ActionHand({ cards, selectedCardId, onCardSelect, className }: ActionHandProps) {
  return (
    <div className={cn("flex gap-4 overflow-x-auto p-4 items-end min-h-[160px]", className)}>
      {cards.map((card) => (
        <motion.div
            key={card.id}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <ActionCard
            card={card}
            isSelected={selectedCardId === card.id}
            onClick={() => onCardSelect(card)}
            />
        </motion.div>
      ))}
    </div>
  );
}
