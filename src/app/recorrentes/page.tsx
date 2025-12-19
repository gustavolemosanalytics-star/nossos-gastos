'use client';

import { useState } from 'react';
import { useRecurring } from '@/context/RecurringContext';
import { useCards } from '@/context/CardContext';
import { useToast } from '@/context/ToastContext';
import { defaultCategories, persons } from '@/data/categories';
import { formatCurrency } from '@/utils/formatters';
import type { TransactionType, PersonType, RecurringTransaction } from '@/types';

export default function RecorrentesPage() {
  const { recurringTransactions, loading, addRecurring, updateRecurring, deleteRecurring } = useRecurring();
  const { userCards } = useCards();
  const { showToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    description: '',
    amount: '',
    categoryId: '',
    person: 'nos' as PersonType,
    cardId: '',
    dayOfMonth: '1',
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      type: 'expense',
      description: '',
      amount: '',
      categoryId: '',
      person: 'nos',
      cardId: '',
      dayOfMonth: '1',
      isActive: true,
    });
    setEditingId(null);
  };

  const handleEdit = (recurring: RecurringTransaction) => {
    setFormData({
      type: recurring.type,
      description: recurring.description,
      amount: recurring.amount.toString(),
      categoryId: recurring.categoryId,
      person: recurring.person,
      cardId: recurring.cardId || '',
      dayOfMonth: recurring.dayOfMonth.toString(),
      isActive: recurring.isActive,
    });
    setEditingId(recurring.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.amount || !formData.categoryId) {
      showToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    try {
      const data = {
        type: formData.type,
        description: formData.description,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        person: formData.person,
        cardId: formData.cardId || undefined,
        dayOfMonth: parseInt(formData.dayOfMonth),
        isActive: formData.isActive,
      };

      if (editingId) {
        await updateRecurring(editingId, data);
        showToast('Recorrente atualizado com sucesso!', 'success');
      } else {
        await addRecurring(data);
        showToast('Recorrente adicionado com sucesso!', 'success');
      }

      resetForm();
      setShowForm(false);
    } catch {
      showToast('Erro ao salvar. Tente novamente.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este recorrente?')) {
      try {
        await deleteRecurring(id);
        showToast('Recorrente excluído com sucesso!', 'success');
      } catch {
        showToast('Erro ao excluir. Tente novamente.', 'error');
      }
    }
  };

  const handleToggleActive = async (recurring: RecurringTransaction) => {
    try {
      await updateRecurring(recurring.id, { isActive: !recurring.isActive });
      showToast(
        recurring.isActive ? 'Recorrente desativado' : 'Recorrente ativado',
        'info'
      );
    } catch {
      showToast('Erro ao atualizar. Tente novamente.', 'error');
    }
  };

  const expenses = recurringTransactions.filter(r => r.type === 'expense');
  const incomes = recurringTransactions.filter(r => r.type === 'income');

  const totalExpenses = expenses.filter(r => r.isActive).reduce((sum, r) => sum + r.amount, 0);
  const totalIncomes = incomes.filter(r => r.isActive).reduce((sum, r) => sum + r.amount, 0);

  const categories = formData.type === 'expense'
    ? defaultCategories.filter(c => !['10', '11', '12', '25', '26', '27', '28'].includes(c.id))
    : defaultCategories.filter(c => ['10', '11', '12', '25', '26', '27', '28'].includes(c.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-6">
        <h1 className="text-xl font-bold">Recorrentes</h1>
        <p className="text-green-100 text-sm mt-1">Gastos e ganhos que se repetem todo mês</p>
      </div>

      {/* Resumo */}
      <div className="mx-4 -mt-4 bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Gastos mensais</p>
            <p className="text-lg font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Ganhos mensais</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncomes)}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t text-center">
          <p className="text-xs text-gray-500 mb-1">Saldo recorrente</p>
          <p className={`text-xl font-bold ${totalIncomes - totalExpenses >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(totalIncomes - totalExpenses)}
          </p>
        </div>
      </div>

      {/* Botão adicionar */}
      <div className="px-4 mb-4">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
        >
          + Adicionar Recorrente
        </button>
      </div>

      {/* Lista de Gastos Recorrentes */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Gastos Recorrentes</h2>
        {expenses.length === 0 ? (
          <p className="text-center py-4 text-gray-400 text-sm">Nenhum gasto recorrente</p>
        ) : (
          <div className="space-y-2">
            {expenses.map(recurring => {
              const category = defaultCategories.find(c => c.id === recurring.categoryId);
              const person = persons.find(p => p.id === recurring.person);
              return (
                <div
                  key={recurring.id}
                  className={`bg-white rounded-xl p-4 ${!recurring.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${category?.color}20` }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{recurring.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Dia {recurring.dayOfMonth}</span>
                        {person && <span>{person.icon} {person.name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-500">-{formatCurrency(recurring.amount)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button
                      onClick={() => handleToggleActive(recurring)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        recurring.isActive
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {recurring.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleEdit(recurring)}
                      className="flex-1 py-2 bg-blue-100 text-blue-600 rounded-lg text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(recurring.id)}
                      className="py-2 px-4 bg-red-100 text-red-600 rounded-lg text-sm font-medium"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de Ganhos Recorrentes */}
      <div className="px-4 pb-24">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Ganhos Recorrentes</h2>
        {incomes.length === 0 ? (
          <p className="text-center py-4 text-gray-400 text-sm">Nenhum ganho recorrente</p>
        ) : (
          <div className="space-y-2">
            {incomes.map(recurring => {
              const category = defaultCategories.find(c => c.id === recurring.categoryId);
              const person = persons.find(p => p.id === recurring.person);
              return (
                <div
                  key={recurring.id}
                  className={`bg-white rounded-xl p-4 ${!recurring.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${category?.color}20` }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{recurring.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Dia {recurring.dayOfMonth}</span>
                        {person && <span>{person.icon} {person.name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+{formatCurrency(recurring.amount)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button
                      onClick={() => handleToggleActive(recurring)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        recurring.isActive
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {recurring.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleEdit(recurring)}
                      className="flex-1 py-2 bg-blue-100 text-blue-600 rounded-lg text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(recurring.id)}
                      className="py-2 px-4 bg-red-100 text-red-600 rounded-lg text-sm font-medium"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? 'Editar Recorrente' : 'Novo Recorrente'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'expense', categoryId: '' }))}
                    className={`py-3 rounded-xl font-medium transition-all ${
                      formData.type === 'expense'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'income', categoryId: '' }))}
                    className={`py-3 rounded-xl font-medium transition-all ${
                      formData.type === 'income'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Ganho
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Netflix, Aluguel, Salário..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  required
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-xl font-semibold"
                  required
                />
              </div>

              {/* Dia do mês */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dia do mês</label>
                <input
                  type="number"
                  value={formData.dayOfMonth}
                  onChange={e => setFormData(prev => ({ ...prev, dayOfMonth: e.target.value }))}
                  min="1"
                  max="31"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  required
                />
              </div>

              {/* Pessoa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quem?</label>
                <div className="flex gap-2">
                  {persons.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, person: p.id }))}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        formData.person === p.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cartão (opcional para gastos) */}
              {formData.type === 'expense' && userCards.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cartão (opcional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, cardId: '' }))}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        !formData.cardId
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-700">Nenhum</span>
                    </button>
                    {userCards.map(card => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, cardId: card.id }))}
                        className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          formData.cardId === card.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: card.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">{card.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <div className="grid grid-cols-4 gap-2">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, categoryId: category.id }))}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                        formData.categoryId === category.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-2xl mb-1">{category.icon}</span>
                      <span className="text-xs text-gray-600 text-center leading-tight">
                        {category.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ativo */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Ativo</span>
              </label>

              <button
                type="submit"
                className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
                  formData.type === 'expense'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {editingId ? 'Salvar Alterações' : 'Adicionar Recorrente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
