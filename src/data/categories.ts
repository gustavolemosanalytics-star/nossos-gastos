import type { Category, Card, PersonType } from '@/types';

export const persons: { id: PersonType; name: string; icon: string; color: string }[] = [
  { id: 'amanda', name: 'Amanda', icon: '👩', color: '#ec4899' },
  { id: 'gustavo', name: 'Gustavo', icon: '👨', color: '#3b82f6' },
  { id: 'nos', name: 'Nós', icon: '👫', color: '#8b5cf6' },
];

export const cards: Card[] = [
  { id: '1', name: 'Sicoob', lastDigits: '', color: '#22c55e' },
  { id: '2', name: 'Pix', lastDigits: '', color: '#06b6d4' },
  { id: '3', name: 'Débito', lastDigits: '', color: '#64748b' },
  { id: '4', name: 'Nubank', lastDigits: '', color: '#8b5cf6' },
  { id: '5', name: 'Banco do Brasil', lastDigits: '', color: '#fbbf24' },
];

export const defaultCategories: Category[] = [
  // Gastos
  { id: '1', name: 'Alimentação', icon: '🍔', color: '#f97316' },
  { id: '2', name: 'Transporte', icon: '🚗', color: '#3b82f6' },
  { id: '3', name: 'Moradia', icon: '🏠', color: '#8b5cf6' },
  { id: '4', name: 'Saúde', icon: '💊', color: '#ef4444' },
  { id: '5', name: 'Educação', icon: '📚', color: '#06b6d4' },
  { id: '6', name: 'Lazer', icon: '🎮', color: '#ec4899' },
  { id: '7', name: 'Compras', icon: '🛒', color: '#f59e0b' },
  { id: '8', name: 'Contas', icon: '📄', color: '#64748b' },
  { id: '9', name: 'Investimentos', icon: '📈', color: '#22c55e' },
  { id: '13', name: 'Assinaturas', icon: '📺', color: '#7c3aed' },
  { id: '14', name: 'Pets', icon: '🐾', color: '#a855f7' },
  { id: '15', name: 'Beleza', icon: '💅', color: '#f472b6' },
  { id: '16', name: 'Vestuário', icon: '👕', color: '#0ea5e9' },
  { id: '17', name: 'Restaurante', icon: '🍽️', color: '#fb923c' },
  { id: '18', name: 'Mercado', icon: '🛍️', color: '#84cc16' },
  { id: '19', name: 'Farmácia', icon: '💉', color: '#f43f5e' },
  { id: '20', name: 'Viagem', icon: '✈️', color: '#14b8a6' },
  { id: '21', name: 'Casa', icon: '🔧', color: '#78716c' },
  { id: '22', name: 'Presente', icon: '🎁', color: '#e11d48' },
  { id: '23', name: 'Impostos', icon: '🏛️', color: '#475569' },
  { id: '24', name: 'Seguro', icon: '🛡️', color: '#0891b2' },
  // Ganhos
  { id: '10', name: 'Salário', icon: '💰', color: '#22c55e' },
  { id: '11', name: 'Freelance', icon: '💻', color: '#6366f1' },
  { id: '25', name: 'Dividendos', icon: '📊', color: '#10b981' },
  { id: '26', name: 'Aluguel', icon: '🏢', color: '#0d9488' },
  { id: '27', name: 'Reembolso', icon: '💵', color: '#059669' },
  { id: '28', name: 'Bônus', icon: '🎉', color: '#16a34a' },
  { id: '12', name: 'Outros', icon: '📦', color: '#94a3b8' },
];

// IDs de categorias de ganhos
const incomeIds = ['10', '11', '12', '25', '26', '27', '28'];

export const expenseCategories = defaultCategories.filter(c =>
  !incomeIds.includes(c.id)
);

export const incomeCategories = defaultCategories.filter(c =>
  incomeIds.includes(c.id)
);
