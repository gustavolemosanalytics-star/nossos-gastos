'use client';

import { useMemo, useState } from 'react';
import { useTransactions } from '@/context/TransactionContext';
import { TransactionItem } from '@/components/TransactionItem';
import { MonthSelector } from '@/components/MonthSelector';
import { FloatingButton } from '@/components/FloatingButton';
import { TransactionForm } from '@/components/TransactionForm';
import { getCurrentMonth } from '@/utils/formatters';
import type { TransactionType } from '@/types';

export default function Transacoes() {
  const { transactions, deleteTransaction, deleteInstallmentGroup } = useTransactions();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [filter, setFilter] = useState<TransactionType | 'all'>('all');
  const [formType, setFormType] = useState<TransactionType | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .filter(t => filter === 'all' || t.type === filter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentMonth, filter]);

  return (
    <>
      <div className="flex-1">
        <div className="bg-green-600 text-white pb-4">
          <MonthSelector currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
        </div>

        <div className="px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'expense', label: 'Gastos' },
              { value: 'income', label: 'Ganhos' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as typeof filter)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="text-4xl mb-2 block">📋</span>
              <p>Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map(transaction => (
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
