'use client';

import type { Transaction } from '@/types';
import { defaultCategories } from '@/data/categories';
import { formatCurrency, formatShortDate } from '@/utils/formatters';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

export function TransactionItem({ transaction, onDelete, onDeleteGroup }: TransactionItemProps) {
  const category = defaultCategories.find(c => c.id === transaction.categoryId);

  const handleDelete = () => {
    if (transaction.isInstallment && transaction.installmentGroupId && onDeleteGroup) {
      const confirmDelete = window.confirm(
        'Deseja excluir todas as parcelas deste lançamento?'
      );
      if (confirmDelete) {
        onDeleteGroup(transaction.installmentGroupId);
      }
    } else {
      onDelete(transaction.id);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white p-4 rounded-xl">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
        style={{ backgroundColor: `${category?.color}20` }}
      >
        {category?.icon || '📦'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {transaction.description}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{formatShortDate(transaction.date)}</span>
          {transaction.isInstallment && (
            <span className="bg-gray-100 px-2 py-0.5 rounded-full">
              {transaction.installmentCurrent}/{transaction.installmentTotal}
            </span>
          )}
        </div>
      </div>

      <div className="text-right flex items-center gap-2">
        <p
          className={`font-semibold ${
            transaction.type === 'income' ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </p>
        <button
          onClick={handleDelete}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
