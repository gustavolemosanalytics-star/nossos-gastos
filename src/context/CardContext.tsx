'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserCard } from '@/types';
import { supabase } from '@/lib/supabase';

interface CardContextType {
  userCards: UserCard[];
  loading: boolean;
  addCard: (card: Omit<UserCard, 'id'>) => Promise<void>;
  updateCard: (id: string, card: Partial<Omit<UserCard, 'id'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
}

const CardContext = createContext<CardContextType | undefined>(undefined);

// Mapeamento do banco para UserCard
function fromDbFormat(row: Record<string, unknown>): UserCard {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    closingDay: Number(row.closing_day),
    dueDay: Number(row.due_day),
  };
}

export function CardProvider({ children }: { children: ReactNode }) {
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar cartões do Supabase
  const fetchCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-user-cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserCards((data || []).map(fromDbFormat));
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const addCard = async (card: Omit<UserCard, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-user-cards')
        .insert([{
          name: card.name,
          color: card.color,
          closing_day: card.closingDay,
          due_day: card.dueDay,
        }])
        .select()
        .single();

      if (error) throw error;

      setUserCards(prev => [fromDbFormat(data), ...prev]);
    } catch (error) {
      console.error('Erro ao adicionar cartão:', error);
      throw error;
    }
  };

  const updateCard = async (id: string, data: Partial<Omit<UserCard, 'id'>>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.closingDay !== undefined) updateData.closing_day = data.closingDay;
      if (data.dueDay !== undefined) updateData.due_day = data.dueDay;

      const { error } = await supabase
        .from('nossos-gastos-user-cards')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setUserCards(prev =>
        prev.map(card =>
          card.id === id ? { ...card, ...data } : card
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
      throw error;
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const { error } = await supabase
        .from('nossos-gastos-user-cards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUserCards(prev => prev.filter(card => card.id !== id));
    } catch (error) {
      console.error('Erro ao deletar cartão:', error);
      throw error;
    }
  };

  return (
    <CardContext.Provider
      value={{
        userCards,
        loading,
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
