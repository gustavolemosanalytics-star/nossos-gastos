import type { Transaction, FinancialSummary } from '@/types';

export function calculateSummary(
  transactions: Transaction[],
  currentMonth: string,
  nextMonth: string
): FinancialSummary {
  const monthTransactions = transactions.filter(t =>
    t.date.startsWith(currentMonth)
  );

  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const upcomingInstallments = transactions.filter(t =>
    t.isInstallment &&
    t.date.startsWith(nextMonth) &&
    t.type === 'expense'
  );

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    upcomingInstallments,
  };
}

export function generateInstallments(
  baseTransaction: Omit<Transaction, 'id' | 'installmentCurrent' | 'installmentGroupId'>,
  totalInstallments: number
): Omit<Transaction, 'id'>[] {
  const groupId = crypto.randomUUID();
  const installments: Omit<Transaction, 'id'>[] = [];
  const baseDate = new Date(baseTransaction.date + 'T00:00:00');

  for (let i = 0; i < totalInstallments; i++) {
    const installmentDate = new Date(baseDate);
    installmentDate.setMonth(installmentDate.getMonth() + i);

    installments.push({
      ...baseTransaction,
      date: installmentDate.toISOString().split('T')[0],
      installmentCurrent: i + 1,
      installmentGroupId: groupId,
    });
  }

  return installments;
}
