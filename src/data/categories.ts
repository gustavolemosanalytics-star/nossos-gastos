import type { Category, Card, PersonType } from '@/types';

export const persons: { id: PersonType; name: string; icon: string; color: string }[] = [
  { id: 'amanda', name: 'Amanda', icon: '👩', color: '#ec4899' },
  { id: 'gustavo', name: 'Gustavo', icon: '👨', color: '#3b82f6' },
  { id: 'nos', name: 'Nós', icon: '👫', color: '#8b5cf6' },
];

export const cards: Card[] = [
  { id: '1', name: 'Nubank', lastDigits: '', color: '#8b5cf6' },
  { id: '2', name: 'Inter', lastDigits: '', color: '#f97316' },
  { id: '3', name: 'C6 Bank', lastDigits: '', color: '#1f2937' },
  { id: '4', name: 'Itaú', lastDigits: '', color: '#f97316' },
  { id: '5', name: 'Bradesco', lastDigits: '', color: '#ef4444' },
  { id: '6', name: 'Santander', lastDigits: '', color: '#ef4444' },
  { id: '7', name: 'Caixa', lastDigits: '', color: '#3b82f6' },
  { id: '8', name: 'BB', lastDigits: '', color: '#fbbf24' },
  { id: '9', name: 'Dinheiro', lastDigits: '', color: '#22c55e' },
  { id: '10', name: 'Pix', lastDigits: '', color: '#06b6d4' },
  { id: '11', name: 'Outro', lastDigits: '', color: '#64748b' },
];

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
