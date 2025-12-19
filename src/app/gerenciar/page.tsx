'use client';

import { useState, useMemo } from 'react';
import { useTransactions } from '@/context/TransactionContext';
import { useCards } from '@/context/CardContext';
import { useSalaries } from '@/context/SalaryContext';
import { useRecurring } from '@/context/RecurringContext';
import { useToast } from '@/context/ToastContext';
import { expenseCategories, incomeCategories, defaultCategories, persons } from '@/data/categories';
import { MonthSelector } from '@/components/MonthSelector';
import { getCurrentMonth } from '@/utils/formatters';
import type { Transaction, TransactionType, PersonType, RecurringTransaction } from '@/types';

// Gerar array de meses (atual + próximos 11)
function getNextMonths(count: number): string[] {
  const months: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push(date.toISOString().slice(0, 7));
  }
  return months;
}

export default function Gerenciar() {
  const { transactions, updateTransaction, deleteTransaction, deleteInstallmentGroup } = useTransactions();
  const { userCards } = useCards();
  const { salaries } = useSalaries();
  const { recurringTransactions, updateRecurring, deleteRecurring } = useRecurring();
  const { showToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType | 'recurring'>('all');
  const [filterCard, setFilterCard] = useState<string>('all'); // 'all', 'none', ou cardId
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteRecurring, setConfirmDeleteRecurring] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'spreadsheet'>('list');

  // Estado para modo planilha - valores editáveis por mês
  const [spreadsheetData, setSpreadsheetData] = useState<{
    [month: string]: {
      cards: { [cardId: string]: string };
      otherExpenses: string;
      extraIncome: string;
    };
  }>({});

  // Meses para a planilha (12 meses)
  const spreadsheetMonths = useMemo(() => getNextMonths(12), []);

  // Inicializar dados da planilha com valores reais das transações
  const initializeSpreadsheetData = () => {
    const data: typeof spreadsheetData = {};

    spreadsheetMonths.forEach(month => {
      const monthTransactions = transactions.filter(t => t.date.startsWith(month));

      // Calcular gastos por cartão
      const cardTotals: { [cardId: string]: number } = {};
      userCards.forEach(card => {
        const cardExpenses = monthTransactions
          .filter(t => t.type === 'expense' && t.cardId === card.id)
          .reduce((sum, t) => sum + t.amount, 0);
        cardTotals[card.id] = cardExpenses;
      });

      // Outros gastos (não cartão)
      const otherExp = monthTransactions
        .filter(t => t.type === 'expense' && !userCards.find(c => c.id === t.cardId))
        .reduce((sum, t) => sum + t.amount, 0);

      // Ganhos extras (não salário)
      const extraInc = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      data[month] = {
        cards: Object.fromEntries(
          Object.entries(cardTotals).map(([id, val]) => [id, val > 0 ? val.toString() : ''])
        ),
        otherExpenses: otherExp > 0 ? otherExp.toString() : '',
        extraIncome: extraInc > 0 ? extraInc.toString() : '',
      };
    });

    setSpreadsheetData(data);
  };

  // Calcular totais para cada mês na planilha
  const spreadsheetTotals = useMemo(() => {
    const totals: {
      [month: string]: {
        totalSalary: number;
        totalCards: number;
        otherExpenses: number;
        extraIncome: number;
        totalIncome: number;
        totalExpenses: number;
        balance: number;
      };
    } = {};

    const totalSalary = salaries
      .filter(s => s.isActive)
      .reduce((sum, s) => sum + s.amount, 0);

    spreadsheetMonths.forEach(month => {
      const monthData = spreadsheetData[month] || { cards: {}, otherExpenses: '', extraIncome: '' };

      const totalCards = Object.values(monthData.cards)
        .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

      const otherExp = parseFloat(monthData.otherExpenses) || 0;
      const extraInc = parseFloat(monthData.extraIncome) || 0;

      const totalIncome = totalSalary + extraInc;
      const totalExpenses = totalCards + otherExp;
      const balance = totalIncome - totalExpenses;

      totals[month] = {
        totalSalary,
        totalCards,
        otherExpenses: otherExp,
        extraIncome: extraInc,
        totalIncome,
        totalExpenses,
        balance,
      };
    });

    return totals;
  }, [spreadsheetData, spreadsheetMonths, salaries]);

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

  // Form state para edição de recorrentes
  const [editRecurringForm, setEditRecurringForm] = useState<{
    description: string;
    amount: string;
    dayOfMonth: string;
    categoryId: string;
    person: PersonType;
    cardId: string;
    type: TransactionType;
    isActive: boolean;
  }>({
    description: '',
    amount: '',
    dayOfMonth: '1',
    categoryId: '',
    person: 'nos',
    cardId: '',
    type: 'expense',
    isActive: true,
  });

  const filteredTransactions = useMemo(() => {
    if (filterType === 'recurring') return [];
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t => {
        if (filterCard === 'all') return true;
        if (filterCard === 'none') return !t.cardId || !userCards.find(c => c.id === t.cardId);
        return t.cardId === filterCard;
      })
      .filter(t =>
        searchTerm === '' ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentMonth, filterType, filterCard, searchTerm, userCards]);

  // Filtrar recorrentes
  const filteredRecurring = useMemo(() => {
    if (filterType !== 'all' && filterType !== 'recurring') return [];
    return recurringTransactions
      .filter(r =>
        searchTerm === '' ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }, [recurringTransactions, filterType, searchTerm]);

  const allCategories = [...expenseCategories, ...incomeCategories];

  const getCategoryById = (id: string) => allCategories.find(c => c.id === id);
  const getPersonById = (id: PersonType) => persons.find(p => p.id === id);
  const getCardById = (id: string) => userCards.find(c => c.id === id);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatMonthLabel = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1, 1);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date);
  };

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

  // Funções para recorrentes
  const startEditingRecurring = (r: RecurringTransaction) => {
    setEditingRecurringId(r.id);
    setEditRecurringForm({
      description: r.description,
      amount: r.amount.toString(),
      dayOfMonth: r.dayOfMonth.toString(),
      categoryId: r.categoryId,
      person: r.person,
      cardId: r.cardId || '',
      type: r.type,
      isActive: r.isActive,
    });
  };

  const cancelEditingRecurring = () => {
    setEditingRecurringId(null);
    setEditRecurringForm({
      description: '',
      amount: '',
      dayOfMonth: '1',
      categoryId: '',
      person: 'nos',
      cardId: '',
      type: 'expense',
      isActive: true,
    });
  };

  const saveEditingRecurring = async () => {
    if (!editingRecurringId) return;

    try {
      await updateRecurring(editingRecurringId, {
        description: editRecurringForm.description,
        amount: parseFloat(editRecurringForm.amount),
        dayOfMonth: parseInt(editRecurringForm.dayOfMonth),
        categoryId: editRecurringForm.categoryId,
        person: editRecurringForm.person,
        cardId: editRecurringForm.cardId || undefined,
        type: editRecurringForm.type,
        isActive: editRecurringForm.isActive,
      });
      showToast('Recorrente atualizado!', 'success');
      cancelEditingRecurring();
    } catch {
      showToast('Erro ao atualizar', 'error');
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await deleteRecurring(id);
      showToast('Recorrente excluído!', 'success');
      setConfirmDeleteRecurring(null);
    } catch {
      showToast('Erro ao excluir', 'error');
    }
  };

  const toggleRecurringActive = async (r: RecurringTransaction) => {
    try {
      await updateRecurring(r.id, { isActive: !r.isActive });
      showToast(r.isActive ? 'Desativado' : 'Ativado', 'info');
    } catch {
      showToast('Erro ao atualizar', 'error');
    }
  };

  // Totais do mês (modo lista)
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  // Atualizar valor na planilha
  const updateSpreadsheetValue = (
    month: string,
    field: 'cards' | 'otherExpenses' | 'extraIncome',
    value: string,
    cardId?: string
  ) => {
    setSpreadsheetData(prev => {
      const monthData = prev[month] || { cards: {}, otherExpenses: '', extraIncome: '' };

      if (field === 'cards' && cardId) {
        return {
          ...prev,
          [month]: {
            ...monthData,
            cards: {
              ...monthData.cards,
              [cardId]: value,
            },
          },
        };
      }

      return {
        ...prev,
        [month]: {
          ...monthData,
          [field]: value,
        },
      };
    });
  };

  return (
    <div className="flex-1 pb-20">
      <div className="bg-green-600 text-white pb-4">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold">Gerenciar Registros</h1>
          <p className="text-green-100 text-sm">Edite e exclua transações</p>
        </div>
        {viewMode === 'list' && (
          <MonthSelector currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
        )}
      </div>

      {/* Botões de modo */}
      <div className="px-4 py-3 bg-white border-b flex gap-2">
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Lista
        </button>
        <button
          onClick={() => {
            setViewMode('spreadsheet');
            initializeSpreadsheetData();
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'spreadsheet'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Modo Planilha
        </button>
      </div>

      {viewMode === 'list' ? (
        <>
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
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'expense', label: 'Gastos' },
                { value: 'income', label: 'Ganhos' },
                { value: 'recurring', label: 'Fixos', color: 'purple' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value as typeof filterType)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterType === option.value
                      ? option.value === 'recurring' ? 'bg-purple-600 text-white' : 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <span className="ml-auto text-xs text-gray-500 self-center">
                {filterType === 'recurring' ? filteredRecurring.length : filteredTransactions.length} registros
              </span>
            </div>

            {/* Filtro por Cartão */}
            {userCards.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterCard('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterCard === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Todos
                </button>
                {userCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => setFilterCard(card.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                      filterCard === card.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: filterCard === card.id ? 'white' : card.color }}
                    />
                    {card.name}
                  </button>
                ))}
                <button
                  onClick={() => setFilterCard('none')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterCard === 'none'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Sem cartão
                </button>
              </div>
            )}
          </div>

          {/* Seção de Recorrentes (quando filtro é 'all' ou 'recurring') */}
          {(filterType === 'all' || filterType === 'recurring') && filteredRecurring.length > 0 && (
            <div className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-purple-700 flex items-center gap-2 mb-3">
                <span className="text-lg">🔄</span> Gastos/Ganhos Fixos
              </h3>
              {filteredRecurring.map(r => {
                const category = defaultCategories.find(c => c.id === r.categoryId);
                const person = getPersonById(r.person);
                const card = getCardById(r.cardId || '');
                const isEditing = editingRecurringId === r.id;
                const isDeleting = confirmDeleteRecurring === r.id;

                return (
                  <div
                    key={r.id}
                    className={`bg-white rounded-xl border ${
                      isEditing ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-100'
                    } ${!r.isActive ? 'opacity-50' : ''} overflow-hidden`}
                  >
                    {isEditing ? (
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">Descrição</label>
                            <input
                              type="text"
                              value={editRecurringForm.description}
                              onChange={e => setEditRecurringForm({ ...editRecurringForm, description: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Valor (R$)</label>
                            <input
                              type="number"
                              value={editRecurringForm.amount}
                              onChange={e => setEditRecurringForm({ ...editRecurringForm, amount: e.target.value })}
                              step="0.01"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">Dia do mês</label>
                            <input
                              type="number"
                              value={editRecurringForm.dayOfMonth}
                              onChange={e => setEditRecurringForm({ ...editRecurringForm, dayOfMonth: e.target.value })}
                              min="1"
                              max="31"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Tipo</label>
                            <select
                              value={editRecurringForm.type}
                              onChange={e => setEditRecurringForm({ ...editRecurringForm, type: e.target.value as TransactionType })}
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
                              value={editRecurringForm.categoryId}
                              onChange={e => setEditRecurringForm({ ...editRecurringForm, categoryId: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                            >
                              {(editRecurringForm.type === 'expense' ? expenseCategories : incomeCategories).map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.icon} {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Pessoa</label>
                            <select
                              value={editRecurringForm.person}
                              onChange={e => setEditRecurringForm({ ...editRecurringForm, person: e.target.value as PersonType })}
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

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editRecurringForm.isActive}
                            onChange={e => setEditRecurringForm({ ...editRecurringForm, isActive: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600"
                          />
                          <span className="text-sm text-gray-700">Ativo</span>
                        </label>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={saveEditingRecurring}
                            className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={cancelEditingRecurring}
                            className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
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
                                {r.description}
                              </p>
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                FIXO
                              </span>
                              {!r.isActive && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  Inativo
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <span>Dia {r.dayOfMonth}</span>
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
                              r.type === 'expense' ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {r.type === 'expense' ? '-' : '+'}{formatCurrency(r.amount)}
                          </p>
                        </div>

                        {isDeleting ? (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-600 mb-2">Excluir este fixo?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeleteRecurring(r.id)}
                                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium"
                              >
                                Excluir
                              </button>
                              <button
                                onClick={() => setConfirmDeleteRecurring(null)}
                                className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                            <button
                              onClick={() => toggleRecurringActive(r)}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                                r.isActive
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-green-100 text-green-600'
                              }`}
                            >
                              {r.isActive ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              onClick={() => startEditingRecurring(r)}
                              className="flex-1 py-2 rounded-lg bg-purple-100 text-purple-700 text-sm font-medium hover:bg-purple-200"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteRecurring(r.id)}
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
              })}
            </div>
          )}

          {/* Lista de transações */}
          {filterType !== 'recurring' && (
          <div className="p-4 space-y-2">
            {filteredTransactions.length === 0 && (filterType !== 'all' || filteredRecurring.length === 0) ? (
              <div className="text-center py-12 text-gray-500">
                <span className="text-4xl mb-2 block">📋</span>
                <p>Nenhuma transação encontrada</p>
              </div>
            ) : filteredTransactions.length === 0 ? null : (
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
          )}
        </>
      ) : (
        /* Modo Planilha */
        <div className="overflow-x-auto">
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Preencha os valores de cada mês para calcular quanto vai sobrar.
              Os salários cadastrados ({formatCurrency(salaries.filter(s => s.isActive).reduce((sum, s) => sum + s.amount, 0))}/mês) são incluídos automaticamente.
            </p>
          </div>

          <div className="min-w-[800px]">
            {/* Header da planilha */}
            <div className="grid grid-cols-[140px_repeat(12,minmax(90px,1fr))] bg-gray-100 border-b sticky top-0">
              <div className="p-2 font-semibold text-xs text-gray-700 border-r">Item</div>
              {spreadsheetMonths.map(month => (
                <div key={month} className="p-2 font-semibold text-xs text-gray-700 text-center border-r">
                  {formatMonthLabel(month)}
                </div>
              ))}
            </div>

            {/* Linha de Salários (fixo) */}
            <div className="grid grid-cols-[140px_repeat(12,minmax(90px,1fr))] bg-green-50 border-b">
              <div className="p-2 text-xs font-medium text-green-700 border-r flex items-center gap-1">
                💰 Salários
              </div>
              {spreadsheetMonths.map(month => (
                <div key={month} className="p-2 text-xs text-green-700 text-right border-r font-medium">
                  {formatCurrency(spreadsheetTotals[month]?.totalSalary || 0)}
                </div>
              ))}
            </div>

            {/* Linha de Ganhos Extras */}
            <div className="grid grid-cols-[140px_repeat(12,minmax(90px,1fr))] bg-green-50/50 border-b">
              <div className="p-2 text-xs font-medium text-green-600 border-r flex items-center gap-1">
                💵 Ganhos extras
              </div>
              {spreadsheetMonths.map(month => (
                <div key={month} className="p-1 border-r">
                  <input
                    type="number"
                    value={spreadsheetData[month]?.extraIncome || ''}
                    onChange={e => updateSpreadsheetValue(month, 'extraIncome', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1 text-xs text-right rounded border border-gray-200 focus:border-green-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Linhas de Cartões */}
            {userCards.map(card => (
              <div key={card.id} className="grid grid-cols-[140px_repeat(12,minmax(90px,1fr))] border-b">
                <div className="p-2 text-xs font-medium text-gray-700 border-r flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
                  {card.name}
                </div>
                {spreadsheetMonths.map(month => (
                  <div key={month} className="p-1 border-r">
                    <input
                      type="number"
                      value={spreadsheetData[month]?.cards[card.id] || ''}
                      onChange={e => updateSpreadsheetValue(month, 'cards', e.target.value, card.id)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right rounded border border-gray-200 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            ))}

            {/* Linha de Outros Gastos */}
            <div className="grid grid-cols-[140px_repeat(12,minmax(90px,1fr))] border-b">
              <div className="p-2 text-xs font-medium text-gray-700 border-r flex items-center gap-1">
                📦 Outros gastos
              </div>
              {spreadsheetMonths.map(month => (
                <div key={month} className="p-1 border-r">
                  <input
                    type="number"
                    value={spreadsheetData[month]?.otherExpenses || ''}
                    onChange={e => updateSpreadsheetValue(month, 'otherExpenses', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1 text-xs text-right rounded border border-gray-200 focus:border-green-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Separador */}
            <div className="h-2 bg-gray-200" />

            {/* Total Entradas */}
            <div className="grid grid-cols-[140px_repeat(12,minmax(90px,1fr))] bg-green-100 border-b">
              <div className="p-2 text-xs font-bold text-green-800 border-r">
                Total Entradas
              </div>
              {spreadsheetMonths.map(month => (
                <div key={month} className="p-2 text-xs text-green-800 text-right border-r font-bold">
                  {formatCurrency(spreadsheetTotals[month]?.totalIncome || 0)}
                </div>
              ))}
            </div>

            {/* Total Saídas */}
            <div className="grid grid-cols-[140px_repeat(12,minmax(90px,1fr))] bg-red-100 border-b">
              <div className="p-2 text-xs font-bold text-red-800 border-r">
                Total Saídas
              </div>
              {spreadsheetMonths.map(month => (
                <div key={month} className="p-2 text-xs text-red-800 text-right border-r font-bold">
                  {formatCurrency(spreadsheetTotals[month]?.totalExpenses || 0)}
                </div>
              ))}
            </div>

            {/* Saldo */}
            <div className="grid grid-cols-[140px_repeat(12,minmax(90px,1fr))] bg-gray-800">
              <div className="p-3 text-sm font-bold text-white border-r">
                SOBRA
              </div>
              {spreadsheetMonths.map(month => {
                const balance = spreadsheetTotals[month]?.balance || 0;
                return (
                  <div
                    key={month}
                    className={`p-3 text-sm text-right border-r font-bold ${
                      balance >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(balance)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="p-4 bg-gray-50 mt-4 mx-4 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Como usar:</strong> Digite o valor das faturas de cada cartão e outros gastos previstos.
              O sistema calcula automaticamente quanto vai sobrar em cada mês.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
