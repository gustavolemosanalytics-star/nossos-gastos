export type TransactionType = 'expense' | 'income';

export type PersonType = 'amanda' | 'gustavo' | 'nos';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Card {
  id: string;
  name: string;
  lastDigits?: string;
  color: string;
}

export interface UserCard {
  id: string;
  name: string;
  color: string;
  closingDay: number;
  dueDay: number;
  bestPurchaseDay?: number; // Melhor dia de compra (dia após o fechamento)
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  categoryId: string;
  date: string;
  person: PersonType;
  cardId?: string;
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

export interface InvestmentTransaction {
  id: string;
  amount: number;
  date: string;
  type: 'deposit' | 'withdraw';
}

export interface Investment {
  id: string;
  name: string;
  icon: string;
  color: string;
  goal?: number;
  transactions: InvestmentTransaction[];
}

export interface Salary {
  id: string;
  person: 'amanda' | 'gustavo';
  description: string;
  amount: number;
  dueDay: number; // Dia limite para receber
  isActive: boolean;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  categoryId: string;
  person: PersonType;
  cardId?: string;
  dayOfMonth: number; // Dia do mês que se repete
  isActive: boolean;
  durationMonths?: number; // Quantidade de meses (null = sem fim)
  startMonth?: string; // Mês de início (YYYY-MM)
}
