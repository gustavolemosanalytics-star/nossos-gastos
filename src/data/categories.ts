import type { Category } from '@/types';

export const defaultCategories: Category[] = [
  { id: '1', name: 'Alimentação', icon: '🍔', color: '#f97316' },
  { id: '2', name: 'Transporte', icon: '🚗', color: '#3b82f6' },
  { id: '3', name: 'Moradia', icon: '🏠', color: '#8b5cf6' },
  { id: '4', name: 'Saúde', icon: '💊', color: '#ef4444' },
  { id: '5', name: 'Educação', icon: '📚', color: '#06b6d4' },
  { id: '6', name: 'Lazer', icon: '🎮', color: '#ec4899' },
  { id: '7', name: 'Compras', icon: '🛒', color: '#f59e0b' },
  { id: '8', name: 'Contas', icon: '📄', color: '#64748b' },
  { id: '9', name: 'Investimentos', icon: '📈', color: '#22c55e' },
  { id: '10', name: 'Salário', icon: '💰', color: '#22c55e' },
  { id: '11', name: 'Freelance', icon: '💻', color: '#6366f1' },
  { id: '12', name: 'Outros', icon: '📦', color: '#94a3b8' },
];

export const expenseCategories = defaultCategories.filter(c =>
  !['10', '11'].includes(c.id)
);

export const incomeCategories = defaultCategories.filter(c =>
  ['10', '11', '12'].includes(c.id)
);
