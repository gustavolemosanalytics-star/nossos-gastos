'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Transaction } from '@/types';
import { supabase } from '@/lib/supabase';
import { generateInstallments } from '@/utils/calculations';

interface TransactionContextType {
  transactions: Transaction[];
  loading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  addInstallmentTransaction: (
    transaction: Omit<Transaction, 'id' | 'installmentCurrent' | 'installmentGroupId'>,
    totalInstallments: number,
    customDates?: string[]
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteInstallmentGroup: (groupId: string) => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

// Mapeamento de Transaction para formato do banco
function toDbFormat(t: Omit<Transaction, 'id'>) {
  return {
    type: t.type,
    description: t.description,
    amount: t.amount,
    category_id: t.categoryId,
    date: t.date,
    person: t.person,
    card_id: t.cardId || null,
    is_installment: t.isInstallment,
    installment_current: t.installmentCurrent || null,
    installment_total: t.installmentTotal || null,
    installment_group_id: t.installmentGroupId || null,
  };
}

// Mapeamento do banco para Transaction
function fromDbFormat(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    type: row.type as 'expense' | 'income',
    description: row.description as string,
    amount: Number(row.amount),
    categoryId: row.category_id as string,
    date: row.date as string,
    person: row.person as 'amanda' | 'gustavo' | 'nos',
    cardId: row.card_id as string | undefined,
    isInstallment: row.is_installment as boolean,
    installmentCurrent: row.installment_current as number | undefined,
    installmentTotal: row.installment_total as number | undefined,
    installmentGroupId: row.installment_group_id as string | undefined,
  };
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar transações do Supabase
  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setTransactions((data || []).map(fromDbFormat));
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-transactions')
        .insert([toDbFormat(transaction)])
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => [fromDbFormat(data), ...prev]);
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      throw error;
    }
  };

  const addInstallmentTransaction = async (
    transaction: Omit<Transaction, 'id' | 'installmentCurrent' | 'installmentGroupId'>,
    totalInstallments: number,
    customDates?: string[]
  ) => {
    try {
      const installments = generateInstallments(transaction, totalInstallments, customDates);
      const dbInstallments = installments.map(inst => toDbFormat(inst));

      const { data, error } = await supabase
        .from('nossos-gastos-transactions')
        .insert(dbInstallments)
        .select();

      if (error) throw error;

      const newTransactions = (data || []).map(fromDbFormat);
      setTransactions(prev => [...newTransactions, ...prev]);
    } catch (error) {
      console.error('Erro ao adicionar parcelas:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('nossos-gastos-transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      throw error;
    }
  };

  const deleteInstallmentGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('nossos-gastos-transactions')
        .delete()
        .eq('installment_group_id', groupId);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.installmentGroupId !== groupId));
    } catch (error) {
      console.error('Erro ao deletar parcelas:', error);
      throw error;
    }
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        loading,
        addTransaction,
        addInstallmentTransaction,
        deleteTransaction,
        deleteInstallmentGroup,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}
