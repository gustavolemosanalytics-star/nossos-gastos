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
  totalInstallments: number,
  customDates?: string[]
): Omit<Transaction, 'id'>[] {
  const groupId = crypto.randomUUID();
  const installments: Omit<Transaction, 'id'>[] = [];

  for (let i = 0; i < totalInstallments; i++) {
    let installmentDate: string;

    if (customDates && customDates[i]) {
      // Usa a data customizada passada (calculada com base no fechamento do cartão)
      installmentDate = customDates[i];
    } else {
      // Fallback: adiciona meses à data base
      const baseDate = new Date(baseTransaction.date + 'T12:00:00');
      baseDate.setMonth(baseDate.getMonth() + i);
      installmentDate = baseDate.toISOString().split('T')[0];
    }

    installments.push({
      ...baseTransaction,
      date: installmentDate,
      installmentCurrent: i + 1,
      installmentGroupId: groupId,
    });
  }

  return installments;
}
