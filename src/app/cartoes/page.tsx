'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCards } from '@/context/CardContext';
import { useSalaries } from '@/context/SalaryContext';

const defaultColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#ef4444', '#fbbf24'];

export default function Cartoes() {
  const { userCards, addCard, updateCard, deleteCard } = useCards();
  const { salaries } = useSalaries();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);

  const totalSalary = salaries
    .filter(s => s.isActive)
    .reduce((sum, s) => sum + s.amount, 0);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#22c55e');
  const [closingDay, setClosingDay] = useState('10');
  const [dueDay, setDueDay] = useState('20');
  const [bestPurchaseDay, setBestPurchaseDay] = useState('');

  const resetForm = () => {
    setName('');
    setColor('#22c55e');
    setClosingDay('10');
    setDueDay('20');
    setBestPurchaseDay('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    addCard({
      name,
      color,
      closingDay: parseInt(closingDay),
      dueDay: parseInt(dueDay),
      bestPurchaseDay: bestPurchaseDay ? parseInt(bestPurchaseDay) : undefined,
    });

    resetForm();
    setShowNewForm(false);
  };

  const handleEdit = (cardId: string) => {
    const card = userCards.find(c => c.id === cardId);
    if (!card) return;

    setName(card.name);
    setColor(card.color);
    setClosingDay(card.closingDay.toString());
    setDueDay(card.dueDay.toString());
    setBestPurchaseDay(card.bestPurchaseDay?.toString() || '');
    setEditingCard(cardId);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard || !name) return;

    updateCard(editingCard, {
      name,
      color,
      closingDay: parseInt(closingDay),
      dueDay: parseInt(dueDay),
      bestPurchaseDay: bestPurchaseDay ? parseInt(bestPurchaseDay) : undefined,
    });

    resetForm();
    setEditingCard(null);
  };

  const getNextClosingDate = (closingDay: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let nextClosing = new Date(currentYear, currentMonth, closingDay);
    if (currentDay >= closingDay) {
      nextClosing = new Date(currentYear, currentMonth + 1, closingDay);
    }

    return nextClosing;
  };

  const getNextDueDate = (dueDay: number, closingDay: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Se já passou o fechamento, o vencimento é no próximo mês
    let nextDue = new Date(currentYear, currentMonth, dueDay);
    if (currentDay >= closingDay) {
      nextDue = new Date(currentYear, currentMonth + 1, dueDay);
    }

    return nextDue;
  };

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = date.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  return (
    <div className="flex-1 pb-20">
      <div className="bg-green-600 text-white px-4 py-6">
        <h1 className="text-xl font-bold mb-2">Configurações</h1>
        <p className="text-green-100 text-sm">
          Cartões e salários
        </p>
      </div>

      <div className="p-4">
        {/* Link para Salários */}
        <Link
          href="/salarios"
          className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200 mb-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-semibold text-gray-900">Salários</p>
              <p className="text-sm text-gray-500">
                {salaries.length === 0
                  ? 'Nenhum cadastrado'
                  : `${salaries.filter(s => s.isActive).length} ativo(s) • ${formatCurrency(totalSalary)}/mês`}
              </p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <h2 className="text-lg font-bold text-gray-900 mb-3">Cartões de Crédito</h2>

        <button
          onClick={() => {
            resetForm();
            setShowNewForm(true);
          }}
          className="w-full py-3 mb-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-500 hover:text-green-600 transition-colors"
        >
          + Novo Cartão
        </button>

        {userCards.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-2 block">💳</span>
            <p>Nenhum cartão cadastrado</p>
            <p className="text-sm mt-1">Adicione seus cartões para acompanhar vencimentos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userCards.map(card => {
              const nextClosing = getNextClosingDate(card.closingDay);
              const nextDue = getNextDueDate(card.dueDay, card.closingDay);
              const daysUntilClosing = getDaysUntil(nextClosing);
              const daysUntilDue = getDaysUntil(nextDue);

              return (
                <div
                  key={card.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                >
                  <div
                    className="h-2"
                    style={{ backgroundColor: card.color }}
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {card.name}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(card.id)}
                          className="p-2 text-gray-400 hover:text-blue-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Excluir este cartão?')) {
                              deleteCard(card.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-xs text-amber-600 mb-1">Fechamento</p>
                        <p className="text-sm font-semibold text-gray-900">
                          Dia {card.closingDay}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Próximo: {formatDate(nextClosing)}
                        </p>
                        <p className={`text-xs mt-1 font-medium ${daysUntilClosing <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {daysUntilClosing === 0 ? 'Hoje!' : daysUntilClosing === 1 ? 'Amanhã' : `Em ${daysUntilClosing} dias`}
                        </p>
                      </div>

                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-xs text-red-600 mb-1">Vencimento</p>
                        <p className="text-sm font-semibold text-gray-900">
                          Dia {card.dueDay}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Próximo: {formatDate(nextDue)}
                        </p>
                        <p className={`text-xs mt-1 font-medium ${daysUntilDue <= 5 ? 'text-red-600' : 'text-gray-400'}`}>
                          {daysUntilDue === 0 ? 'Hoje!' : daysUntilDue === 1 ? 'Amanhã' : `Em ${daysUntilDue} dias`}
                        </p>
                      </div>
                    </div>

                    {card.bestPurchaseDay && (
                      <div className="mt-3 bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-600 mb-1">Melhor dia de compra</p>
                        <p className="text-sm font-semibold text-gray-900">
                          Dia {card.bestPurchaseDay}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Compras a partir desse dia vão para a próxima fatura
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Novo/Editar Cartão */}
      {(showNewForm || editingCard) && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
                </h2>
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setEditingCard(null);
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

            <form onSubmit={editingCard ? handleUpdate : handleCreate} className="p-4 space-y-4 pb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do cartão
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Nubank, Sicoob..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor
                </label>
                <div className="flex gap-2 flex-wrap">
                  {defaultColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dia do fechamento
                  </label>
                  <select
                    value={closingDay}
                    onChange={e => setClosingDay(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        Dia {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dia do vencimento
                  </label>
                  <select
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        Dia {day}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Melhor dia de compra (opcional)
                </label>
                <select
                  value={bestPurchaseDay}
                  onChange={e => setBestPurchaseDay(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                >
                  <option value="">Não definido</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>
                      Dia {day}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Compras a partir desse dia vão para a fatura do próximo mês
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                {editingCard ? 'Salvar Alterações' : 'Adicionar Cartão'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
