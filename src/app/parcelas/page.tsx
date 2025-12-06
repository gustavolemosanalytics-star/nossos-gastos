'use client';

import { useMemo, useState } from 'react';
import { useTransactions } from '@/context/TransactionContext';
import { FloatingButton } from '@/components/FloatingButton';
import { TransactionForm } from '@/components/TransactionForm';
import { defaultCategories } from '@/data/categories';
import { formatCurrency, formatShortDate, getMonthName, parseMonth } from '@/utils/formatters';
import type { TransactionType } from '@/types';

export default function Parcelas() {
  const { transactions, deleteInstallmentGroup } = useTransactions();
  const [formType, setFormType] = useState<TransactionType | null>(null);

  const installmentGroups = useMemo(() => {
    const groups = new Map<string, typeof transactions>();

    transactions
      .filter(t => t.isInstallment && t.installmentGroupId)
      .forEach(t => {
        const groupId = t.installmentGroupId!;
        if (!groups.has(groupId)) {
          groups.set(groupId, []);
        }
        groups.get(groupId)!.push(t);
      });

    return Array.from(groups.entries())
      .map(([groupId, items]) => {
        const sorted = items.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const first = sorted[0];
        const category = defaultCategories.find(c => c.id === first.categoryId);
        const paidCount = sorted.filter(
          t => new Date(t.date) <= new Date()
        ).length;

        return {
          groupId,
          description: first.description,
          category,
          amount: first.amount,
          total: first.installmentTotal || sorted.length,
          paid: paidCount,
          installments: sorted,
        };
      })
      .sort((a, b) => {
        const aNext = a.installments.find(i => new Date(i.date) > new Date());
        const bNext = b.installments.find(i => new Date(i.date) > new Date());
        if (!aNext) return 1;
        if (!bNext) return -1;
        return new Date(aNext.date).getTime() - new Date(bNext.date).getTime();
      });
  }, [transactions]);

  const handleDelete = (groupId: string) => {
    const confirmDelete = window.confirm(
      'Deseja excluir todas as parcelas deste lançamento?'
    );
    if (confirmDelete) {
      deleteInstallmentGroup(groupId);
    }
  };

  return (
    <>
      <div className="flex-1">
        <div className="bg-green-600 text-white px-4 py-6">
          <h1 className="text-xl font-bold mb-2">Parcelas</h1>
          <p className="text-green-100 text-sm">
            Acompanhe seus gastos parcelados
          </p>
        </div>

        <div className="p-4">
          {installmentGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="text-4xl mb-2 block">📅</span>
              <p>Nenhuma parcela cadastrada</p>
              <p className="text-sm mt-1">Adicione um gasto parcelado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {installmentGroups.map(group => {
                const nextInstallment = group.installments.find(
                  i => new Date(i.date) > new Date()
                );

                return (
                  <div
                    key={group.groupId}
                    className="bg-white rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: `${group.category?.color}20` }}
                      >
                        {group.category?.icon || '📦'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-gray-900 truncate">
                              {group.description}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(group.amount)} por parcela
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(group.groupId)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-500">Progresso</span>
                            <span className="font-medium text-gray-700">
                              {group.paid} de {group.total}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{
                                width: `${(group.paid / group.total) * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        {nextInstallment && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500">Próxima parcela</p>
                            <p className="text-sm font-medium text-gray-700">
                              {formatShortDate(nextInstallment.date)} -{' '}
                              <span className="capitalize">
                                {getMonthName(parseMonth(nextInstallment.date.slice(0, 7)))}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
