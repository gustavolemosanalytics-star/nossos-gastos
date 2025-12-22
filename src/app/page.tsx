'use client';

import { useState, useMemo } from 'react';
import { useTransactions } from '@/context/TransactionContext';
import { useSalaries } from '@/context/SalaryContext';
import { useRecurring } from '@/context/RecurringContext';
import { useToast } from '@/context/ToastContext';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionItem } from '@/components/TransactionItem';
import { MonthSelector } from '@/components/MonthSelector';
import { FloatingButton } from '@/components/FloatingButton';
import { TransactionForm } from '@/components/TransactionForm';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { calculateSummary } from '@/utils/calculations';
import { getCurrentMonth, getNextMonth, formatCurrency } from '@/utils/formatters';
import { defaultCategories } from '@/data/categories';
import type { Transaction, TransactionType } from '@/types';

export default function Dashboard() {
  const { transactions, loading, deleteTransaction, deleteInstallmentGroup, updateTransaction } = useTransactions();
  const { salaries, getTotalSalaryForMonth } = useSalaries();
  const { recurringTransactions, getTotalRecurringExpensesForMonth, getTotalRecurringIncomeForMonth } = useRecurring();
  const { showToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [formType, setFormType] = useState<TransactionType | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showDetails, setShowDetails] = useState<'income' | 'expense' | null>(null);

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

  // Totais recorrentes
  const recurringExpenses = useMemo(
    () => getTotalRecurringExpensesForMonth(currentMonth),
    [getTotalRecurringExpensesForMonth, currentMonth]
  );

  const recurringIncome = useMemo(
    () => getTotalRecurringIncomeForMonth(currentMonth),
    [getTotalRecurringIncomeForMonth, currentMonth]
  );

  // Saldo projetado (considerando salários + ganhos + recorrentes - gastos - gastos recorrentes)
  const projectedBalance = useMemo(() => {
    return expectedSalary + summary.totalIncome + recurringIncome - summary.totalExpenses - recurringExpenses;
  }, [expectedSalary, summary.totalIncome, recurringIncome, summary.totalExpenses, recurringExpenses]);

  // Transações recentes (mantém ordem de lançamento do banco)
  const recentTransactions = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .slice(0, 5);
  }, [transactions, currentMonth]);

  // Todas as transações do mês para o modal de detalhes (mantém ordem de lançamento)
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(currentMonth));
  }, [transactions, currentMonth]);

  const incomeTransactions = useMemo(() =>
    monthTransactions.filter(t => t.type === 'income'),
    [monthTransactions]
  );

  const expenseTransactions = useMemo(() =>
    monthTransactions.filter(t => t.type === 'expense'),
    [monthTransactions]
  );

  // Salários ativos
  const activeSalaries = useMemo(() =>
    salaries.filter(s => s.isActive),
    [salaries]
  );

  // Recorrentes ativos
  const activeRecurringIncome = useMemo(() =>
    recurringTransactions.filter(r => r.isActive && r.type === 'income'),
    [recurringTransactions]
  );

  const activeRecurringExpenses = useMemo(() =>
    recurringTransactions.filter(r => r.isActive && r.type === 'expense'),
    [recurringTransactions]
  );

  const nextMonthInstallmentsTotal = useMemo(() => {
    return summary.upcomingInstallments.reduce((sum, t) => sum + t.amount, 0);
  }, [summary.upcomingInstallments]);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleSaveEdit = async (id: string, data: Partial<Transaction>) => {
    try {
      await updateTransaction(id, data);
      showToast('Transação atualizada!', 'success');
      setEditingTransaction(null);
    } catch {
      showToast('Erro ao atualizar', 'error');
    }
  };

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
          recurringExpenses={recurringExpenses}
          recurringIncome={recurringIncome}
          onClickIncome={() => setShowDetails('income')}
          onClickExpense={() => setShowDetails('expense')}
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
                  onEdit={handleEdit}
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

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Modal de detalhes de Ganhos/Gastos */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 z-10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {showDetails === 'income' ? 'Detalhes dos Ganhos' : 'Detalhes dos Gastos'}
              </h2>
              <button
                onClick={() => setShowDetails(null)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
              {showDetails === 'income' ? (
                <>
                  {/* Salários */}
                  {activeSalaries.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Salários
                      </h3>
                      <div className="space-y-2">
                        {activeSalaries.map(s => (
                          <div key={s.id} className="bg-blue-50 p-3 rounded-xl flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{s.person === 'amanda' ? 'Amanda' : s.person === 'gustavo' ? 'Gustavo' : 'Nós'}</p>
                              <p className="text-xs text-gray-500">Dia {s.dueDay}</p>
                            </div>
                            <p className="font-semibold text-blue-600">{formatCurrency(s.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ganhos Fixos */}
                  {activeRecurringIncome.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Ganhos Fixos
                      </h3>
                      <div className="space-y-2">
                        {activeRecurringIncome.map(r => {
                          const cat = defaultCategories.find(c => c.id === r.categoryId);
                          return (
                            <div key={r.id} className="bg-purple-50 p-3 rounded-xl flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span>{cat?.icon || '📦'}</span>
                                <div>
                                  <p className="font-medium text-gray-900">{r.description}</p>
                                  <p className="text-xs text-gray-500">Dia {r.dayOfMonth}</p>
                                </div>
                              </div>
                              <p className="font-semibold text-purple-600">{formatCurrency(r.amount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ganhos Lançados */}
                  {incomeTransactions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Ganhos Lançados ({incomeTransactions.length})
                      </h3>
                      <div className="space-y-2">
                        {incomeTransactions.map(t => {
                          const cat = defaultCategories.find(c => c.id === t.categoryId);
                          return (
                            <div key={t.id} className="bg-green-50 p-3 rounded-xl flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span>{cat?.icon || '📦'}</span>
                                <p className="font-medium text-gray-900">{t.description}</p>
                              </div>
                              <p className="font-semibold text-green-600">{formatCurrency(t.amount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeSalaries.length === 0 && activeRecurringIncome.length === 0 && incomeTransactions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-2 block">💰</span>
                      <p>Nenhum ganho este mês</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Gastos Fixos */}
                  {activeRecurringExpenses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Gastos Fixos
                      </h3>
                      <div className="space-y-2">
                        {activeRecurringExpenses.map(r => {
                          const cat = defaultCategories.find(c => c.id === r.categoryId);
                          return (
                            <div key={r.id} className="bg-purple-50 p-3 rounded-xl flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span>{cat?.icon || '📦'}</span>
                                <div>
                                  <p className="font-medium text-gray-900">{r.description}</p>
                                  <p className="text-xs text-gray-500">Dia {r.dayOfMonth}</p>
                                </div>
                              </div>
                              <p className="font-semibold text-purple-600">{formatCurrency(r.amount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gastos Lançados */}
                  {expenseTransactions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Gastos Lançados ({expenseTransactions.length})
                      </h3>
                      <div className="space-y-2">
                        {expenseTransactions.map(t => {
                          const cat = defaultCategories.find(c => c.id === t.categoryId);
                          return (
                            <div key={t.id} className="bg-red-50 p-3 rounded-xl flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span>{cat?.icon || '📦'}</span>
                                <div>
                                  <p className="font-medium text-gray-900">{t.description}</p>
                                  {t.isInstallment && (
                                    <p className="text-xs text-blue-600">{t.installmentCurrent}/{t.installmentTotal}x</p>
                                  )}
                                </div>
                              </div>
                              <p className="font-semibold text-red-500">{formatCurrency(t.amount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeRecurringExpenses.length === 0 && expenseTransactions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-2 block">💸</span>
                      <p>Nenhum gasto este mês</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
