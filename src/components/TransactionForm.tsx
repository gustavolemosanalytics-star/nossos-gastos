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

// Função para calcular em qual fatura uma compra vai cair
function getBillingInfo(purchaseDate: string, card: UserCard | undefined) {
  if (!card) return null;

  const purchase = new Date(purchaseDate + 'T12:00:00');
  const purchaseDay = purchase.getDate();
  const purchaseMonth = purchase.getMonth();
  const purchaseYear = purchase.getFullYear();

  // Se a compra foi APÓS o fechamento, vai para a fatura do PRÓXIMO mês
  // Exemplo: Fechamento dia 26, compra dia 27 -> vai para fatura do próximo mês
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

// Calcula a data de cada parcela baseada no fechamento do cartão
function calculateInstallmentDates(
  purchaseDate: string,
  card: UserCard | undefined,
  totalInstallments: number
): string[] {
  const dates: string[] = [];
  const purchase = new Date(purchaseDate + 'T12:00:00');
  const purchaseDay = purchase.getDate();
  let startMonth = purchase.getMonth();
  let startYear = purchase.getFullYear();

  // Se passou do fechamento, a primeira parcela já vai pro próximo mês
  if (card && purchaseDay > card.closingDay) {
    startMonth += 1;
    if (startMonth > 11) {
      startMonth = 0;
      startYear += 1;
    }
  }

  for (let i = 0; i < totalInstallments; i++) {
    let month = startMonth + i;
    let year = startYear;

    // Ajusta o ano se passar de dezembro
    while (month > 11) {
      month -= 12;
      year += 1;
    }

    // Define o dia da fatura (vencimento) ou dia fixo para registro
    const day = card ? card.dueDay : purchase.getDate();

    // Cria a data e ajusta para o último dia do mês se necessário
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(day, lastDayOfMonth);

    const installmentDate = new Date(year, month, actualDay);
    dates.push(installmentDate.toISOString().split('T')[0]);
  }

  return dates;
}

export function TransactionForm({ type, onClose }: TransactionFormProps) {
  const { addTransaction, addInstallmentTransaction } = useTransactions();
  const { userCards } = useCards();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); // Valor à vista / total da compra
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [person, setPerson] = useState<PersonType>('nos');
  const [cardId, setCardId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentTotal, setInstallmentTotal] = useState('2');
  const [installmentAmount, setInstallmentAmount] = useState(''); // Valor de cada parcela (pode ter juros)
  const [hasInterest, setHasInterest] = useState(false); // Se tem juros

  // Encontrar o cartão selecionado
  const selectedUserCard = useMemo(() => {
    return userCards.find(c => c.id === cardId);
  }, [cardId, userCards]);

  // Calcular informações da fatura
  const billingInfo = useMemo(() => {
    return getBillingInfo(date, selectedUserCard);
  }, [date, selectedUserCard]);

  // Calcular datas das parcelas
  const installmentDates = useMemo(() => {
    if (!isInstallment) return [];
    return calculateInstallmentDates(date, selectedUserCard, parseInt(installmentTotal) || 2);
  }, [date, selectedUserCard, isInstallment, installmentTotal]);

  // Cálculos para exibição
  const calculatedValues = useMemo(() => {
    const numInstallments = parseInt(installmentTotal) || 2;
    const totalAmount = parseFloat(amount) || 0;
    const perInstallmentAmount = parseFloat(installmentAmount) || 0;

    if (hasInterest && installmentAmount) {
      // Com juros: usuário informa o valor de cada parcela
      const totalWithInterest = perInstallmentAmount * numInstallments;
      const interestAmount = totalWithInterest - totalAmount;
      const interestPercent = totalAmount > 0 ? (interestAmount / totalAmount) * 100 : 0;

      return {
        totalOriginal: totalAmount,
        totalWithInterest,
        perInstallment: perInstallmentAmount,
        interestAmount,
        interestPercent,
        hasInterest: true,
      };
    } else {
      // Sem juros: divide o valor total
      const perInstallment = totalAmount / numInstallments;
      return {
        totalOriginal: totalAmount,
        totalWithInterest: totalAmount,
        perInstallment: perInstallment > 0 ? perInstallment : 0,
        interestAmount: 0,
        interestPercent: 0,
        hasInterest: false,
      };
    }
  }, [amount, installmentAmount, installmentTotal, hasInterest]);

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !amount || !categoryId || !person) return;

    // Valor da parcela a ser lançado
    const finalInstallmentAmount = hasInterest && installmentAmount
      ? parseFloat(installmentAmount)
      : calculatedValues.perInstallment;

    const transactionData = {
      type,
      description,
      amount: isInstallment ? finalInstallmentAmount : parseFloat(amount),
      categoryId,
      date,
      person,
      cardId: cardId || undefined,
      isInstallment,
      installmentTotal: isInstallment ? parseInt(installmentTotal) : undefined,
    };

    if (isInstallment && type === 'expense') {
      // Passa as datas calculadas para a função de parcelas
      await addInstallmentTransaction(
        transactionData,
        parseInt(installmentTotal),
        installmentDates
      );
    } else {
      await addTransaction(transactionData);
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
              {isInstallment ? 'Valor total da compra (R$)' : 'Valor (R$)'}
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
              {billingInfo && selectedUserCard && !isInstallment && (
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
              Data da compra
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

                  {/* Checkbox de juros */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasInterest}
                      onChange={e => setHasInterest(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Com juros (valor da parcela diferente)
                    </span>
                  </label>

                  {/* Campo de valor da parcela (quando tem juros) */}
                  {hasInterest && (
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
                        className="w-full px-4 py-3 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-xl font-semibold bg-amber-50"
                        required
                      />
                    </div>
                  )}

                  {/* Resumo dos valores */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Valor à vista:</span>
                      <span className="font-semibold text-gray-900">
                        R$ {formatCurrency(calculatedValues.totalOriginal)}
                      </span>
                    </div>

                    {calculatedValues.hasInterest && (
                      <>
                        <div className="flex justify-between items-center text-amber-600">
                          <span className="text-sm">Juros ({calculatedValues.interestPercent.toFixed(1)}%):</span>
                          <span className="font-semibold">
                            + R$ {formatCurrency(calculatedValues.interestAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="text-sm text-gray-600">Total parcelado:</span>
                          <span className="font-semibold text-gray-900">
                            R$ {formatCurrency(calculatedValues.totalWithInterest)}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm text-gray-600">Parcelas:</span>
                      <span className="font-bold text-red-600">
                        {parseInt(installmentTotal) || 2}x de R$ {formatCurrency(calculatedValues.perInstallment)}
                      </span>
                    </div>
                  </div>

                  {/* Preview das faturas */}
                  {selectedUserCard && installmentDates.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-2">
                        📅 Parcelas por fatura:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {installmentDates.slice(0, 6).map((d, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {i + 1}ª: {formatMonth(d)}
                          </span>
                        ))}
                        {installmentDates.length > 6 && (
                          <span className="text-xs text-blue-600">
                            +{installmentDates.length - 6} mais
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        Fechamento dia {selectedUserCard.closingDay} • Vencimento dia {selectedUserCard.dueDay}
                      </p>
                    </div>
                  )}
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
