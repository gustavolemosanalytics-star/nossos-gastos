'use client';

import { useState, useMemo } from 'react';
import type { TransactionType, PersonType, UserCard } from '@/types';
import { expenseCategories, incomeCategories, persons, cards } from '@/data/categories';
import { useTransactions } from '@/context/TransactionContext';
import { useCards } from '@/context/CardContext';

interface TransactionFormProps {
  type: TransactionType;
  onClose: () => void;
}

type InstallmentInputMode = 'total' | 'perInstallment';

// Função para calcular em qual fatura uma compra vai cair
function getBillingInfo(purchaseDate: string, card: UserCard | undefined) {
  if (!card) return null;

  const purchase = new Date(purchaseDate + 'T12:00:00');
  const purchaseDay = purchase.getDate();
  const purchaseMonth = purchase.getMonth();
  const purchaseYear = purchase.getFullYear();

  // Se a compra foi antes do fechamento, vai para a fatura do mês atual
  // Se a compra foi depois do fechamento, vai para a fatura do próximo mês
  let billingMonth = purchaseMonth;
  let billingYear = purchaseYear;

  if (purchaseDay > card.closingDay) {
    billingMonth += 1;
    if (billingMonth > 11) {
      billingMonth = 0;
      billingYear += 1;
    }
  }

  const billingDate = new Date(billingYear, billingMonth, card.dueDay);

  // Verificar se é melhor dia de compra
  const isBestDay = card.bestPurchaseDay ? purchaseDay >= card.bestPurchaseDay : purchaseDay > card.closingDay;

  return {
    billingMonth,
    billingYear,
    billingDate,
    isBestDay,
    goesToNextMonth: purchaseDay > card.closingDay,
  };
}

export function TransactionForm({ type, onClose }: TransactionFormProps) {
  const { addTransaction, addInstallmentTransaction } = useTransactions();
  const { userCards } = useCards();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [person, setPerson] = useState<PersonType>('nos');
  const [cardId, setCardId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentTotal, setInstallmentTotal] = useState('2');
  const [installmentInputMode, setInstallmentInputMode] = useState<InstallmentInputMode>('total');
  const [installmentAmount, setInstallmentAmount] = useState('');

  // Encontrar o cartão selecionado (tanto dos cards fixos quanto dos userCards)
  const selectedUserCard = useMemo(() => {
    return userCards.find(c => c.id === cardId);
  }, [cardId, userCards]);

  // Calcular informações da fatura
  const billingInfo = useMemo(() => {
    return getBillingInfo(date, selectedUserCard);
  }, [date, selectedUserCard]);

  // Cálculos para exibição
  const calculatedValues = useMemo(() => {
    const numInstallments = parseInt(installmentTotal) || 2;

    if (installmentInputMode === 'total') {
      const total = parseFloat(amount) || 0;
      const perInstallment = total / numInstallments;
      return {
        total,
        perInstallment: perInstallment > 0 ? perInstallment : 0,
      };
    } else {
      const perInstallment = parseFloat(installmentAmount) || 0;
      const total = perInstallment * numInstallments;
      return {
        total: total > 0 ? total : 0,
        perInstallment,
      };
    }
  }, [amount, installmentAmount, installmentTotal, installmentInputMode]);

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação: precisa ter valor no campo correto
    const hasAmount = installmentInputMode === 'total' ? amount : installmentAmount;
    if (!description || !hasAmount || !categoryId || !person) return;

    // Usar o valor da parcela para salvar
    const finalAmount = calculatedValues.perInstallment;

    const transactionData = {
      type,
      description,
      amount: isInstallment ? finalAmount : parseFloat(amount),
      categoryId,
      date,
      person,
      cardId: cardId || undefined,
      isInstallment,
      installmentTotal: isInstallment ? parseInt(installmentTotal) : undefined,
    };

    if (isInstallment && type === 'expense') {
      addInstallmentTransaction(transactionData, parseInt(installmentTotal));
    } else {
      addTransaction(transactionData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-end">
      <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {type === 'expense' ? 'Novo Gasto' : 'Novo Ganho'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Almoço, Conta de luz..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor (R$)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-xl font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quem gastou?
            </label>
            <div className="flex gap-2">
              {persons.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPerson(p.id)}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    person === p.id
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

          {type === 'expense' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Cartão / Forma de pagamento
              </label>

              {/* Cartões cadastrados pelo usuário */}
              {userCards.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Meus cartões:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {userCards.map(card => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setCardId(card.id)}
                        className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          cardId === card.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: card.color }}
                        />
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {card.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Formas de pagamento fixas (Pix, Débito, etc) */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Outras formas:</p>
                <div className="grid grid-cols-3 gap-2">
                  {cards.filter(c => ['2', '3'].includes(c.id)).map(card => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setCardId(card.id)}
                      className={`flex items-center justify-center p-2 rounded-xl border-2 transition-all ${
                        cardId === card.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: card.color }}
                      >
                        {card.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Informação da fatura */}
              {billingInfo && selectedUserCard && (
                <div className={`p-3 rounded-lg ${billingInfo.isBestDay ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{billingInfo.isBestDay ? '✨' : '📅'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Fatura de {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(billingInfo.billingDate)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Vencimento: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(billingInfo.billingDate)}
                      </p>
                      {billingInfo.isBestDay && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          Melhor período de compra! Vai para a fatura do próximo mês.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                    categoryId === category.id
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              required
            />
          </div>

          {type === 'expense' && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={e => setIsInstallment(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Parcelado
                </span>
              </label>

              {isInstallment && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de parcelas
                    </label>
                    <input
                      type="number"
                      value={installmentTotal}
                      onChange={e => setInstallmentTotal(e.target.value)}
                      min="2"
                      max="48"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Informar valor por:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInstallmentInputMode('total')}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          installmentInputMode === 'total'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Valor Total
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstallmentInputMode('perInstallment')}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          installmentInputMode === 'perInstallment'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Valor da Parcela
                      </button>
                    </div>
                  </div>

                  {installmentInputMode === 'perInstallment' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor de cada parcela (R$)
                      </label>
                      <input
                        type="number"
                        value={installmentAmount}
                        onChange={e => setInstallmentAmount(e.target.value)}
                        placeholder="0,00"
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-xl font-semibold"
                        required
                      />
                    </div>
                  )}

                  {/* Resumo dos valores */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Valor à vista:</span>
                      <span className="font-semibold text-gray-900">
                        R$ {calculatedValues.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Valor de cada parcela:</span>
                      <span className="font-semibold text-red-600">
                        {parseInt(installmentTotal) || 2}x de R$ {calculatedValues.perInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
              type === 'expense'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {type === 'expense' ? 'Adicionar Gasto' : 'Adicionar Ganho'}
          </button>
        </form>
      </div>
    </div>
  );
}
