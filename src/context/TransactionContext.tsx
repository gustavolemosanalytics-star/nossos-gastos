'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Transaction } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { generateInstallments } from '@/utils/calculations';

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addInstallmentTransaction: (
    transaction: Omit<Transaction, 'id' | 'installmentCurrent' | 'installmentGroupId'>,
    totalInstallments: number
  ) => void;
  deleteTransaction: (id: string) => void;
  deleteInstallmentGroup: (groupId: string) => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('nossos-gastos-transactions', []);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
    };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const addInstallmentTransaction = (
    transaction: Omit<Transaction, 'id' | 'installmentCurrent' | 'installmentGroupId'>,
    totalInstallments: number
  ) => {
    const installments = generateInstallments(transaction, totalInstallments);
    const newTransactions: Transaction[] = installments.map(inst => ({
      ...inst,
      id: crypto.randomUUID(),
    }));
    setTransactions(prev => [...prev, ...newTransactions]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const deleteInstallmentGroup = (groupId: string) => {
    setTransactions(prev => prev.filter(t => t.installmentGroupId !== groupId));
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
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
