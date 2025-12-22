'use client';

import { useState } from 'react';
import type { Transaction } from '@/types';
import { defaultCategories, persons, cards } from '@/data/categories';
import { formatCurrency, formatShortDate } from '@/utils/formatters';
import { useCards } from '@/context/CardContext';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onEdit?: (transaction: Transaction) => void;
}

export function TransactionItem({ transaction, onDelete, onDeleteGroup, onEdit }: TransactionItemProps) {
  const { userCards } = useCards();
  const [showActions, setShowActions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const category = defaultCategories.find(c => c.id === transaction.categoryId);
  const person = persons.find(p => p.id === transaction.person);
  // Busca primeiro nos cartões do usuário, depois nos cards padrão
  const card = userCards.find(c => c.id === transaction.cardId) || cards.find(c => c.id === transaction.cardId);

  const handleDelete = () => {
    if (transaction.isInstallment && transaction.installmentGroupId && onDeleteGroup) {
      onDeleteGroup(transaction.installmentGroupId);
    } else {
      onDelete(transaction.id);
    }
    setConfirmDelete(false);
    setShowActions(false);
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer active:bg-gray-50"
        onClick={() => setShowActions(!showActions)}
      >
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
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            <span>{formatShortDate(transaction.date)}</span>
            {person && (
              <span className="flex items-center gap-1">
                <span>{person.icon}</span>
              </span>
            )}
            {card && (
              <span
                className="px-2 py-0.5 rounded-full text-white text-[10px]"
                style={{ backgroundColor: card.color }}
              >
                {card.name}
              </span>
            )}
            {transaction.isInstallment && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {transaction.installmentCurrent}/{transaction.installmentTotal}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p
            className={`font-semibold ${
              transaction.type === 'income' ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </p>
        </div>
      </div>

      {/* Ações expandidas */}
      {showActions && (
        <div className="px-4 pb-3 border-t border-gray-100">
          {confirmDelete ? (
            <div className="pt-3">
              <p className="text-sm text-gray-600 mb-2">
                {transaction.isInstallment
                  ? `Excluir todas as ${transaction.installmentTotal} parcelas?`
                  : 'Confirmar exclusão?'
                }
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium"
                >
                  Excluir
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-3">
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit(transaction);
                    setShowActions(false);
                  }}
                  className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Excluir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
