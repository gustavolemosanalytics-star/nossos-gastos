'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Investment, InvestmentTransaction } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface InvestmentContextType {
  investments: Investment[];
  addInvestment: (investment: Omit<Investment, 'id' | 'transactions'>) => void;
  deleteInvestment: (id: string) => void;
  addDeposit: (investmentId: string, amount: number) => void;
  addWithdraw: (investmentId: string, amount: number) => void;
  updateInvestment: (id: string, data: Partial<Omit<Investment, 'id' | 'transactions'>>) => void;
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export function InvestmentProvider({ children }: { children: ReactNode }) {
  const [investments, setInvestments] = useLocalStorage<Investment[]>('nossos-gastos-investments', []);

  const addInvestment = (investment: Omit<Investment, 'id' | 'transactions'>) => {
    const newInvestment: Investment = {
      ...investment,
      id: crypto.randomUUID(),
      transactions: [],
    };
    setInvestments(prev => [...prev, newInvestment]);
  };

  const deleteInvestment = (id: string) => {
    setInvestments(prev => prev.filter(inv => inv.id !== id));
  };

  const addDeposit = (investmentId: string, amount: number) => {
    const transaction: InvestmentTransaction = {
      id: crypto.randomUUID(),
      amount,
      date: new Date().toISOString().split('T')[0],
      type: 'deposit',
    };

    setInvestments(prev =>
      prev.map(inv =>
        inv.id === investmentId
          ? { ...inv, transactions: [...inv.transactions, transaction] }
          : inv
      )
    );
  };

  const addWithdraw = (investmentId: string, amount: number) => {
    const transaction: InvestmentTransaction = {
      id: crypto.randomUUID(),
      amount,
      date: new Date().toISOString().split('T')[0],
      type: 'withdraw',
    };

    setInvestments(prev =>
      prev.map(inv =>
        inv.id === investmentId
          ? { ...inv, transactions: [...inv.transactions, transaction] }
          : inv
      )
    );
  };

  const updateInvestment = (id: string, data: Partial<Omit<Investment, 'id' | 'transactions'>>) => {
    setInvestments(prev =>
      prev.map(inv =>
        inv.id === id ? { ...inv, ...data } : inv
      )
    );
  };

  return (
    <InvestmentContext.Provider
      value={{
        investments,
        addInvestment,
        deleteInvestment,
        addDeposit,
        addWithdraw,
        updateInvestment,
      }}
    >
      {children}
    </InvestmentContext.Provider>
  );
}

export function useInvestments() {
  const context = useContext(InvestmentContext);
  if (!context) {
    throw new Error('useInvestments must be used within an InvestmentProvider');
  }
  return context;
}
