'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Salary } from '@/types';
import { supabase } from '@/lib/supabase';

interface SalaryContextType {
  salaries: Salary[];
  loading: boolean;
  addSalary: (salary: Omit<Salary, 'id'>) => Promise<void>;
  updateSalary: (id: string, data: Partial<Omit<Salary, 'id'>>) => Promise<void>;
  deleteSalary: (id: string) => Promise<void>;
  getTotalSalaryForMonth: (month: string) => number;
}

const SalaryContext = createContext<SalaryContextType | undefined>(undefined);

function fromDbFormat(row: Record<string, unknown>): Salary {
  return {
    id: row.id as string,
    person: row.person as 'amanda' | 'gustavo',
    description: row.description as string,
    amount: Number(row.amount),
    dueDay: Number(row.due_day),
    isActive: row.is_active as boolean,
  };
}

export function SalaryProvider({ children }: { children: ReactNode }) {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSalaries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-salaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSalaries((data || []).map(fromDbFormat));
    } catch (error) {
      console.error('Erro ao carregar salários:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  const addSalary = async (salary: Omit<Salary, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('nossos-gastos-salaries')
        .insert([{
          person: salary.person,
          description: salary.description,
          amount: salary.amount,
          due_day: salary.dueDay,
          is_active: salary.isActive,
        }])
        .select()
        .single();

      if (error) throw error;

      setSalaries(prev => [fromDbFormat(data), ...prev]);
    } catch (error) {
      console.error('Erro ao adicionar salário:', error);
      throw error;
    }
  };

  const updateSalary = async (id: string, data: Partial<Omit<Salary, 'id'>>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.person !== undefined) updateData.person = data.person;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.dueDay !== undefined) updateData.due_day = data.dueDay;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { error } = await supabase
        .from('nossos-gastos-salaries')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setSalaries(prev =>
        prev.map(s => (s.id === id ? { ...s, ...data } : s))
      );
    } catch (error) {
      console.error('Erro ao atualizar salário:', error);
      throw error;
    }
  };

  const deleteSalary = async (id: string) => {
    try {
      const { error } = await supabase
        .from('nossos-gastos-salaries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSalaries(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Erro ao deletar salário:', error);
      throw error;
    }
  };

  // Retorna o total de salários ativos para um mês específico
  const getTotalSalaryForMonth = useCallback((month: string) => {
    return salaries
      .filter(s => s.isActive)
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salaries]);

  return (
    <SalaryContext.Provider
      value={{
        salaries,
        loading,
        addSalary,
        updateSalary,
        deleteSalary,
        getTotalSalaryForMonth,
      }}
    >
      {children}
    </SalaryContext.Provider>
  );
}

export function useSalaries() {
  const context = useContext(SalaryContext);
  if (!context) {
    throw new Error('useSalaries must be used within a SalaryProvider');
  }
  return context;
}
