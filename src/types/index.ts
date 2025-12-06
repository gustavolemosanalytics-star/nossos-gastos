export type TransactionType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  categoryId: string;
  date: string;
  isInstallment: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  upcomingInstallments: Transaction[];
}
