'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Investment, InvestmentTransaction } from '@/types';
import { supabase } from '@/lib/supabase';

interface InvestmentContextType {
  investments: Investment[];
  loading: boolean;
  addInvestment: (investment: Omit<Investment, 'id' | 'transactions'>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addDeposit: (investmentId: string, amount: number) => Promise<void>;
  addWithdraw: (investmentId: string, amount: number) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Omit<Investment, 'id' | 'transactions'>>) => Promise<void>;
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

// Mapeamento do banco para Investment
function fromDbFormat(row: Record<string, unknown>, transactions: InvestmentTransaction[]): Investment {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    color: row.color as string,
    goal: row.goal ? Number(row.goal) : undefined,
    transactions,
  };
}

// Mapeamento do banco para InvestmentTransaction
function transactionFromDb(row: Record<string, unknown>): InvestmentTransaction {
  return {
    id: row.id as string,
    amount: Number(row.amount),
    date: row.date as string,
    type: row.type as 'deposit' | 'withdraw',
  };
}

export function InvestmentProvider({ children }: { children: ReactNode }) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar investimentos do Supabase
  const fetchInvestments = useCallback(async () => {
    try {
      // Buscar investimentos
      const { data: investmentsData, error: investmentsError } = await supabase
        .from('nossos-gastos-investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (investmentsError) throw investmentsError;

      // Buscar todas as transações de investimentos
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('nossos-gastos-investment-transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Agrupar transações por investimento
      const transactionsByInvestment: Record<string, InvestmentTransaction[]> = {};
      (transactionsData || []).forEach(t => {
        const investmentId = t.investment_id as string;
        if (!transactionsByInvestment[investmentId]) {
          transactionsByInvestment[investmentId] = [];
        }
        transactionsByInvestment[investmentId].push(transactionFromDb(t));
      });

      // Combinar investimentos com suas transações
      const investmentsWithTransactions = (investmentsData || []).map(inv =>
        fromDbFormat(inv, transactionsByInvestment[inv.id as string] || [])
      );

      setInvestments(investmentsWithTransactions);
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const addInvestment = async (investment: Omit<Investment, 'id' | 'transactions'>) => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-investments')
        .insert([{
          name: investment.name,
          icon: investment.icon,
          color: investment.color,
          goal: investment.goal || null,
        }])
        .select()
        .single();

      if (error) throw error;

      setInvestments(prev => [fromDbFormat(data, []), ...prev]);
    } catch (error) {
      console.error('Erro ao adicionar investimento:', error);
      throw error;
    }
  };

  const deleteInvestment = async (id: string) => {
    try {
      // As transações serão deletadas automaticamente pelo ON DELETE CASCADE
      const { error } = await supabase
        .from('nossos-gastos-investments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInvestments(prev => prev.filter(inv => inv.id !== id));
    } catch (error) {
      console.error('Erro ao deletar investimento:', error);
      throw error;
    }
  };

  const addDeposit = async (investmentId: string, amount: number) => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-investment-transactions')
        .insert([{
          investment_id: investmentId,
          amount,
          type: 'deposit',
          date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (error) throw error;

      const newTransaction = transactionFromDb(data);
      setInvestments(prev =>
        prev.map(inv =>
          inv.id === investmentId
            ? { ...inv, transactions: [newTransaction, ...inv.transactions] }
            : inv
        )
      );
    } catch (error) {
      console.error('Erro ao adicionar depósito:', error);
      throw error;
    }
  };

  const addWithdraw = async (investmentId: string, amount: number) => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-investment-transactions')
        .insert([{
          investment_id: investmentId,
          amount,
          type: 'withdraw',
          date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (error) throw error;

      const newTransaction = transactionFromDb(data);
      setInvestments(prev =>
        prev.map(inv =>
          inv.id === investmentId
            ? { ...inv, transactions: [newTransaction, ...inv.transactions] }
            : inv
        )
      );
    } catch (error) {
      console.error('Erro ao adicionar retirada:', error);
      throw error;
    }
  };

  const updateInvestment = async (id: string, data: Partial<Omit<Investment, 'id' | 'transactions'>>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.goal !== undefined) updateData.goal = data.goal || null;

      const { error } = await supabase
        .from('nossos-gastos-investments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setInvestments(prev =>
        prev.map(inv =>
          inv.id === id ? { ...inv, ...data } : inv
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar investimento:', error);
      throw error;
    }
  };

  return (
    <InvestmentContext.Provider
      value={{
        investments,
        loading,
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
