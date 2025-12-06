'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { UserCard } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface CardContextType {
  userCards: UserCard[];
  addCard: (card: Omit<UserCard, 'id'>) => void;
  updateCard: (id: string, card: Partial<Omit<UserCard, 'id'>>) => void;
  deleteCard: (id: string) => void;
}

const CardContext = createContext<CardContextType | undefined>(undefined);

export function CardProvider({ children }: { children: ReactNode }) {
  const [userCards, setUserCards] = useLocalStorage<UserCard[]>('nossos-gastos-user-cards', []);

  const addCard = (card: Omit<UserCard, 'id'>) => {
    const newCard: UserCard = {
      ...card,
      id: crypto.randomUUID(),
    };
    setUserCards(prev => [...prev, newCard]);
  };

  const updateCard = (id: string, data: Partial<Omit<UserCard, 'id'>>) => {
    setUserCards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, ...data } : card
      )
    );
  };

  const deleteCard = (id: string) => {
    setUserCards(prev => prev.filter(card => card.id !== id));
  };

  return (
    <CardContext.Provider
      value={{
        userCards,
        addCard,
        updateCard,
        deleteCard,
      }}
    >
      {children}
    </CardContext.Provider>
  );
}

export function useCards() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('useCards must be used within a CardProvider');
  }
  return context;
}
