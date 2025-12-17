'use client';

import { useState, useMemo } from 'react';
import { useTransactions } from '@/context/TransactionContext';
import { useSalaries } from '@/context/SalaryContext';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionItem } from '@/components/TransactionItem';
import { MonthSelector } from '@/components/MonthSelector';
import { FloatingButton } from '@/components/FloatingButton';
import { TransactionForm } from '@/components/TransactionForm';
import { calculateSummary } from '@/utils/calculations';
import { getCurrentMonth, getNextMonth, formatCurrency } from '@/utils/formatters';
import type { TransactionType } from '@/types';

export default function Dashboard() {
  const { transactions, loading, deleteTransaction, deleteInstallmentGroup } = useTransactions();
  const { salaries, getTotalSalaryForMonth } = useSalaries();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [formType, setFormType] = useState<TransactionType | null>(null);

  const nextMonth = getNextMonth();

  const summary = useMemo(
    () => calculateSummary(transactions, currentMonth, nextMonth),
    [transactions, currentMonth, nextMonth]
  );

  // Total de salários esperados para o mês
  const expectedSalary = useMemo(
    () => getTotalSalaryForMonth(currentMonth),
    [getTotalSalaryForMonth, currentMonth]
  );

  // Saldo projetado (considerando salários + ganhos - gastos)
  const projectedBalance = useMemo(() => {
    return expectedSalary + summary.totalIncome - summary.totalExpenses;
  }, [expectedSalary, summary.totalIncome, summary.totalExpenses]);

  const recentTransactions = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions, currentMonth]);

  const nextMonthInstallmentsTotal = useMemo(() => {
    return summary.upcomingInstallments.reduce((sum, t) => sum + t.amount, 0);
  }, [summary.upcomingInstallments]);

  return (
    <>
      <div className="flex-1">
        <div className="bg-green-600 text-white pb-8">
          <MonthSelector currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
        </div>

        <SummaryCard
          totalIncome={summary.totalIncome}
          totalExpenses={summary.totalExpenses}
          balance={summary.balance}
          expectedSalary={expectedSalary}
          projectedBalance={projectedBalance}
        />

        {summary.upcomingInstallments.length > 0 && (
          <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600">⚠️</span>
              <h3 className="font-semibold text-amber-800">Próximo mês</h3>
            </div>
            <p className="text-sm text-amber-700">
              Você tem <strong>{summary.upcomingInstallments.length} parcela(s)</strong> previstas
              totalizando <strong>{formatCurrency(nextMonthInstallmentsTotal)}</strong>
            </p>
          </div>
        )}

        <div className="mt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Últimas transações</h2>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
              <p>Carregando...</p>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-2 block">📊</span>
              <p>Nenhuma transação este mês</p>
              <p className="text-sm mt-1">Toque no + para adicionar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map(transaction => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  onDelete={deleteTransaction}
                  onDeleteGroup={deleteInstallmentGroup}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <FloatingButton
        onAddExpense={() => setFormType('expense')}
        onAddIncome={() => setFormType('income')}
      />

      {formType && (
        <TransactionForm type={formType} onClose={() => setFormType(null)} />
      )}
    </>
  );
}
