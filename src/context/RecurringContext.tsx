'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { RecurringTransaction } from '@/types';
import { supabase } from '@/lib/supabase';

interface RecurringContextType {
  recurringTransactions: RecurringTransaction[];
  loading: boolean;
  addRecurring: (recurring: Omit<RecurringTransaction, 'id'>) => Promise<void>;
  updateRecurring: (id: string, data: Partial<Omit<RecurringTransaction, 'id'>>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  getRecurringForMonth: (month: string) => RecurringTransaction[];
  getTotalRecurringExpensesForMonth: (month: string) => number;
  getTotalRecurringIncomeForMonth: (month: string) => number;
}

const RecurringContext = createContext<RecurringContextType | undefined>(undefined);

// Mapeamento para formato do banco
function toDbFormat(r: Omit<RecurringTransaction, 'id'>) {
  return {
    type: r.type,
    description: r.description,
    amount: r.amount,
    category_id: r.categoryId,
    person: r.person,
    card_id: r.cardId || null,
    day_of_month: r.dayOfMonth,
    is_active: r.isActive,
  };
}

// Mapeamento do banco para RecurringTransaction
function fromDbFormat(row: Record<string, unknown>): RecurringTransaction {
  return {
    id: row.id as string,
    type: row.type as 'expense' | 'income',
    description: row.description as string,
    amount: Number(row.amount),
    categoryId: row.category_id as string,
    person: row.person as 'amanda' | 'gustavo' | 'nos',
    cardId: row.card_id as string | undefined,
    dayOfMonth: row.day_of_month as number,
    isActive: row.is_active as boolean,
  };
}

export function RecurringProvider({ children }: { children: ReactNode }) {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar recorrentes do Supabase
  const fetchRecurring = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-recurring')
        .select('*')
        .order('day_of_month', { ascending: true });

      if (error) throw error;

      setRecurringTransactions((data || []).map(fromDbFormat));
    } catch (error) {
      console.error('Erro ao carregar recorrentes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const addRecurring = async (recurring: Omit<RecurringTransaction, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-recurring')
        .insert([toDbFormat(recurring)])
        .select()
        .single();

      if (error) throw error;

      setRecurringTransactions(prev => [...prev, fromDbFormat(data)]);
    } catch (error) {
      console.error('Erro ao adicionar recorrente:', error);
      throw error;
    }
  };

  const updateRecurring = async (id: string, data: Partial<Omit<RecurringTransaction, 'id'>>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.type !== undefined) updateData.type = data.type;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
      if (data.person !== undefined) updateData.person = data.person;
      if (data.cardId !== undefined) updateData.card_id = data.cardId || null;
      if (data.dayOfMonth !== undefined) updateData.day_of_month = data.dayOfMonth;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { error } = await supabase
        .from('nossos-gastos-recurring')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setRecurringTransactions(prev =>
        prev.map(r => (r.id === id ? { ...r, ...data } : r))
      );
    } catch (error) {
      console.error('Erro ao atualizar recorrente:', error);
      throw error;
    }
  };

  const deleteRecurring = async (id: string) => {
    try {
      const { error } = await supabase
        .from('nossos-gastos-recurring')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecurringTransactions(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Erro ao deletar recorrente:', error);
      throw error;
    }
  };

  const getRecurringForMonth = useCallback((month: string) => {
    return recurringTransactions.filter(r => r.isActive);
  }, [recurringTransactions]);

  const getTotalRecurringExpensesForMonth = useCallback((month: string) => {
    return recurringTransactions
      .filter(r => r.isActive && r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurringTransactions]);

  const getTotalRecurringIncomeForMonth = useCallback((month: string) => {
    return recurringTransactions
      .filter(r => r.isActive && r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurringTransactions]);

  return (
    <RecurringContext.Provider
      value={{
        recurringTransactions,
        loading,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        getRecurringForMonth,
        getTotalRecurringExpensesForMonth,
        getTotalRecurringIncomeForMonth,
      }}
    >
      {children}
    </RecurringContext.Provider>
  );
}

export function useRecurring() {
  const context = useContext(RecurringContext);
  if (!context) {
    throw new Error('useRecurring must be used within a RecurringProvider');
  }
  return context;
}
