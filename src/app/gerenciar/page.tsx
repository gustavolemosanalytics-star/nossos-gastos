'use client';

import { useState, useMemo } from 'react';
import { useTransactions } from '@/context/TransactionContext';
import { useCards } from '@/context/CardContext';
import { expenseCategories, incomeCategories, persons } from '@/data/categories';
import { MonthSelector } from '@/components/MonthSelector';
import { getCurrentMonth } from '@/utils/formatters';
import type { Transaction, TransactionType, PersonType } from '@/types';

export default function Gerenciar() {
  const { transactions, updateTransaction, deleteTransaction, deleteInstallmentGroup } = useTransactions();
  const { userCards } = useCards();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state para edição
  const [editForm, setEditForm] = useState<{
    description: string;
    amount: string;
    date: string;
    categoryId: string;
    person: PersonType;
    cardId: string;
    type: TransactionType;
  }>({
    description: '',
    amount: '',
    date: '',
    categoryId: '',
    person: 'nos',
    cardId: '',
    type: 'expense',
  });

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t =>
        searchTerm === '' ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentMonth, filterType, searchTerm]);

  const allCategories = [...expenseCategories, ...incomeCategories];

  const getCategoryById = (id: string) => allCategories.find(c => c.id === id);
  const getPersonById = (id: PersonType) => persons.find(p => p.id === id);
  const getCardById = (id: string) => userCards.find(c => c.id === id);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  };

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setEditForm({
      description: t.description,
      amount: t.amount.toString(),
      date: t.date,
      categoryId: t.categoryId,
      person: t.person,
      cardId: t.cardId || '',
      type: t.type,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({
      description: '',
      amount: '',
      date: '',
      categoryId: '',
      person: 'nos',
      cardId: '',
      type: 'expense',
    });
  };

  const saveEditing = async () => {
    if (!editingId) return;

    await updateTransaction(editingId, {
      description: editForm.description,
      amount: parseFloat(editForm.amount),
      date: editForm.date,
      categoryId: editForm.categoryId,
      person: editForm.person,
      cardId: editForm.cardId || undefined,
      type: editForm.type,
    });

    cancelEditing();
  };

  const handleDelete = async (t: Transaction) => {
    if (t.installmentGroupId) {
      await deleteInstallmentGroup(t.installmentGroupId);
    } else {
      await deleteTransaction(t.id);
    }
    setConfirmDelete(null);
  };

  // Totais do mês
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  return (
    <div className="flex-1 pb-20">
      <div className="bg-green-600 text-white pb-4">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold">Gerenciar Registros</h1>
          <p className="text-green-100 text-sm">Edite e exclua transações</p>
        </div>
        <MonthSelector currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
      </div>

      {/* Resumo do mês */}
      <div className="px-4 py-3 bg-gray-50 border-b grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-500">Ganhos</p>
          <p className="font-semibold text-green-600">{formatCurrency(totals.income)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Gastos</p>
          <p className="font-semibold text-red-600">{formatCurrency(totals.expense)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Saldo</p>
          <p className={`font-semibold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totals.balance)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 py-3 bg-white border-b space-y-3">
        <input
          type="text"
          placeholder="Buscar por descrição..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
        />
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'expense', label: 'Gastos' },
            { value: 'income', label: 'Ganhos' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setFilterType(option.value as typeof filterType)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterType === option.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-500 self-center">
            {filteredTransactions.length} registros
          </span>
        </div>
      </div>

      {/* Lista de transações */}
      <div className="p-4 space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-2 block">📋</span>
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          filteredTransactions.map(t => {
            const category = getCategoryById(t.categoryId);
            const person = getPersonById(t.person);
            const card = getCardById(t.cardId || '');
            const isEditing = editingId === t.id;
            const isDeleting = confirmDelete === t.id;

            return (
              <div
                key={t.id}
                className={`bg-white rounded-xl border ${
                  isEditing ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100'
                } overflow-hidden`}
              >
                {isEditing ? (
                  // Formulário de edição
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Descrição</label>
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Valor (R$)</label>
                        <input
                          type="number"
                          value={editForm.amount}
                          onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                          step="0.01"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Data</label>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Tipo</label>
                        <select
                          value={editForm.type}
                          onChange={e => setEditForm({ ...editForm, type: e.target.value as TransactionType })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        >
                          <option value="expense">Gasto</option>
                          <option value="income">Ganho</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Categoria</label>
                        <select
                          value={editForm.categoryId}
                          onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        >
                          {(editForm.type === 'expense' ? expenseCategories : incomeCategories).map(c => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Pessoa</label>
                        <select
                          value={editForm.person}
                          onChange={e => setEditForm({ ...editForm, person: e.target.value as PersonType })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        >
                          {persons.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.icon} {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {editForm.type === 'expense' && userCards.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-500">Cartão/Pagamento</label>
                        <select
                          value={editForm.cardId}
                          onChange={e => setEditForm({ ...editForm, cardId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        >
                          <option value="">Pix/Débito/Dinheiro</option>
                          {userCards.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={saveEditing}
                        className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  // Visualização normal
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: category?.color + '20' }}
                      >
                        {category?.icon || '📦'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {t.description}
                          </p>
                          {t.isInstallment && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              {t.installmentCurrent}/{t.installmentTotal}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{formatDate(t.date)}</span>
                          <span>•</span>
                          <span>{person?.icon} {person?.name}</span>
                          {card && (
                            <>
                              <span>•</span>
                              <span style={{ color: card.color }}>{card.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <p
                        className={`font-semibold whitespace-nowrap ${
                          t.type === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                      </p>
                    </div>

                    {/* Ações */}
                    {isDeleting ? (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 mb-2">
                          {t.installmentGroupId
                            ? `Excluir todas as ${t.installmentTotal} parcelas?`
                            : 'Confirmar exclusão?'}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(t)}
                            className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium"
                          >
                            Excluir
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                        <button
                          onClick={() => startEditing(t)}
                          className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmDelete(t.id)}
                          className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
