'use client';

import { useState, useMemo } from 'react';
import type { TransactionType, PersonType, UserCard } from '@/types';
import { expenseCategories, incomeCategories, persons } from '@/data/categories';
import { useTransactions } from '@/context/TransactionContext';
import { useCards } from '@/context/CardContext';
import { useToast } from '@/context/ToastContext';
import { useRecurring } from '@/context/RecurringContext';

interface TransactionFormProps {
  type: TransactionType;
  onClose: () => void;
}

// Formas de pagamento que não são cartão de crédito
const otherPaymentMethods = [
  { id: 'pix', name: 'Pix', color: '#06b6d4' },
  { id: 'debito', name: 'Débito', color: '#64748b' },
  { id: 'dinheiro', name: 'Dinheiro', color: '#22c55e' },
];

// Função para calcular em qual fatura uma compra vai cair
// A fatura é identificada pelo mês de VENCIMENTO (quando é paga), não pelo mês de fechamento
// Exemplo: Compra dia 07/12, fecha dia 26, vence dia 05
// - Fatura fecha em 26/12 e vence em 05/01 → fatura de JANEIRO
// - Compra APÓS dia 26/12 vai para fatura que fecha em 26/01, vence 05/02 → fatura de FEVEREIRO
function getBillingInfo(purchaseDate: string, card: UserCard | undefined) {
  if (!card) return null;

  const purchase = new Date(purchaseDate + 'T12:00:00');
  const purchaseDay = purchase.getDate();
  const purchaseMonth = purchase.getMonth();
  const purchaseYear = purchase.getFullYear();

  // A fatura sempre vence no mês SEGUINTE ao fechamento
  // Se comprou ANTES ou NO dia do fechamento: fatura vence no próximo mês
  // Se comprou APÓS o fechamento: fatura vence em 2 meses
  let billingMonth = purchaseMonth + 1; // Sempre pelo menos 1 mês à frente (mês do vencimento)
  let billingYear = purchaseYear;

  // Se a compra foi APÓS o fechamento, adiciona mais 1 mês
  if (purchaseDay > card.closingDay) {
    billingMonth += 1;
  }

  // Ajusta o ano se passar de dezembro
  while (billingMonth > 11) {
    billingMonth -= 12;
    billingYear += 1;
  }

  const billingDate = new Date(billingYear, billingMonth, card.dueDay);

  // Verificar se é melhor dia de compra (logo após fechamento = mais tempo para pagar)
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
// A primeira parcela sempre vai para o mês de VENCIMENTO da fatura atual
// Exemplo: Compra 07/12, fecha 26, vence 05
// - 1ª parcela: Janeiro 2025 (fatura vence 05/01)
// - 2ª parcela: Fevereiro 2025 (fatura vence 05/02)
// - etc.
function calculateInstallmentDates(
  purchaseDate: string,
  card: UserCard | undefined,
  totalInstallments: number
): string[] {
  const dates: string[] = [];
  const purchase = new Date(purchaseDate + 'T12:00:00');
  const purchaseDay = purchase.getDate();

  // Começa no mês SEGUINTE (mês do vencimento da fatura)
  let startMonth = purchase.getMonth() + 1;
  let startYear = purchase.getFullYear();

  // Se passou do fechamento, a primeira parcela vai pro mês seguinte ao vencimento
  if (card && purchaseDay > card.closingDay) {
    startMonth += 1;
  }

  // Ajusta o ano se passar de dezembro
  while (startMonth > 11) {
    startMonth -= 12;
    startYear += 1;
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
  const { showToast } = useToast();
  const { addRecurring } = useRecurring();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); // Valor à vista
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [person, setPerson] = useState<PersonType>('nos');
  const [cardId, setCardId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); // Para Pix, Débito, Dinheiro
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentTotal, setInstallmentTotal] = useState('2');
  const [installmentAmount, setInstallmentAmount] = useState(''); // Valor de cada parcela
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState('1');
  const [recurringDuration, setRecurringDuration] = useState(''); // Vazio = sem fim
  const [addedCount, setAddedCount] = useState(0); // Contador de itens adicionados
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Encontrar o cartão selecionado (apenas cartões cadastrados)
  const selectedUserCard = useMemo(() => {
    return userCards.find(c => c.id === cardId);
  }, [cardId, userCards]);

  // Verifica se é um cartão de crédito selecionado (permite parcelamento)
  const isCreditCardSelected = !!selectedUserCard;

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

    if (installmentAmount && perInstallmentAmount > 0) {
      // Usuário informou o valor da parcela
      const totalWithInterest = perInstallmentAmount * numInstallments;
      const interestAmount = totalWithInterest - totalAmount;
      const interestPercent = totalAmount > 0 ? (interestAmount / totalAmount) * 100 : 0;

      return {
        totalOriginal: totalAmount,
        totalWithInterest,
        perInstallment: perInstallmentAmount,
        interestAmount,
        interestPercent,
        hasInterest: interestAmount > 0.01, // Considera juros se diferença > 1 centavo
      };
    } else {
      // Sem valor de parcela informado: divide o valor à vista
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
  }, [amount, installmentAmount, installmentTotal]);

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Limpa campos para adicionar outro item (mantém data, pessoa e forma de pagamento)
  const resetForAnotherItem = () => {
    setDescription('');
    setAmount('');
    setCategoryId('');
    setIsInstallment(false);
    setInstallmentTotal('2');
    setInstallmentAmount('');
    setIsRecurring(false);
    setRecurringDay('1');
    setRecurringDuration('');
  };

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(d);
  };

  const saveTransaction = async (closeAfter: boolean) => {
    if (!description || !amount || !categoryId || !person) return false;

    setIsSubmitting(true);

    // Valor da parcela a ser lançado (usa valor informado ou calcula)
    const finalInstallmentAmount = installmentAmount && parseFloat(installmentAmount) > 0
      ? parseFloat(installmentAmount)
      : calculatedValues.perInstallment;

    // Determina o cardId final (cartão cadastrado ou forma de pagamento)
    const finalCardId = cardId || paymentMethod || undefined;

    // Para cartão de crédito, usa a data do vencimento da fatura
    // Para outras formas (Pix, Débito, Dinheiro), usa a data da compra
    let transactionDate = date;
    if (isCreditCardSelected && billingInfo && !isInstallment) {
      // Compra à vista no cartão: registra na data do vencimento da fatura
      transactionDate = billingInfo.billingDate.toISOString().split('T')[0];
    }

    const transactionData = {
      type,
      description,
      amount: isInstallment ? finalInstallmentAmount : parseFloat(amount),
      categoryId,
      date: transactionDate,
      person,
      cardId: finalCardId,
      isInstallment,
      installmentTotal: isInstallment ? parseInt(installmentTotal) : undefined,
    };

    try {
      if (isRecurring) {
        // Adiciona como recorrente
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        await addRecurring({
          type,
          description,
          amount: parseFloat(amount),
          categoryId,
          person,
          cardId: finalCardId,
          dayOfMonth: parseInt(recurringDay),
          isActive: true,
          durationMonths: recurringDuration ? parseInt(recurringDuration) : undefined,
          startMonth: currentMonth,
        });
      } else if (isInstallment && type === 'expense' && isCreditCardSelected) {
        // Passa as datas calculadas para a função de parcelas
        await addInstallmentTransaction(
          transactionData,
          parseInt(installmentTotal),
          installmentDates
        );
      } else {
        await addTransaction(transactionData);
      }

      setAddedCount(prev => prev + 1);
      setIsSubmitting(false);

      if (closeAfter) {
        const total = addedCount + 1;
        if (total === 1) {
          showToast(
            isRecurring
              ? (type === 'expense' ? 'Gasto fixo adicionado!' : 'Ganho fixo adicionado!')
              : (type === 'expense' ? 'Gasto adicionado!' : 'Ganho adicionado!'),
            'success'
          );
        } else {
          showToast(`${total} ${type === 'expense' ? 'gastos adicionados' : 'ganhos adicionados'}!`, 'success');
        }
        onClose();
      } else {
        showToast('Adicionado! Continue lançando...', 'success');
        resetForAnotherItem();
      }
      return true;
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showToast('Erro ao salvar. Tente novamente.', 'error');
      setIsSubmitting(false);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveTransaction(true);
  };

  const handleAddAnother = async () => {
    await saveTransaction(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-end">
      <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {type === 'expense' ? 'Novo Gasto' : 'Novo Ganho'}
              </h2>
              {addedCount > 0 && (
                <p className="text-xs text-green-600">
                  {addedCount} {addedCount === 1 ? 'item adicionado' : 'itens adicionados'}
                </p>
              )}
            </div>
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
              {type === 'expense' ? 'Valor à vista (R$)' : 'Valor (R$)'}
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
              {type === 'expense' ? 'Quem gastou?' : 'Quem recebeu?'}
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
                Forma de pagamento
              </label>

              {/* Cartões cadastrados pelo usuário */}
              {userCards.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Meus cartões (crédito):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {userCards.map(card => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          setCardId(card.id);
                          setPaymentMethod('');
                        }}
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

              {/* Outras formas de pagamento */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Outras formas:</p>
                <div className="grid grid-cols-3 gap-2">
                  {otherPaymentMethods.map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method.id);
                        setCardId('');
                        setIsInstallment(false); // Desabilita parcelamento para outras formas
                      }}
                      className={`flex items-center justify-center p-2 rounded-xl border-2 transition-all ${
                        paymentMethod === method.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: method.color }}
                      >
                        {method.name}
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
              {type === 'expense' ? 'Data da compra' : 'Data do recebimento'}
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              required
            />
          </div>

          {/* Parcelamento - só aparece se for cartão de crédito */}
          {type === 'expense' && isCreditCardSelected && (
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parcelas
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor da parcela (R$)
                      </label>
                      <input
                        type="number"
                        value={installmentAmount}
                        onChange={e => setInstallmentAmount(e.target.value)}
                        placeholder={calculatedValues.perInstallment > 0 ? formatCurrency(calculatedValues.perInstallment) : '0,00'}
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Se o valor da parcela for diferente do valor à vista dividido, informe acima.
                  </p>

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

          {/* Opção de Recorrente */}
          <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={e => {
                  setIsRecurring(e.target.checked);
                  if (e.target.checked) {
                    setIsInstallment(false); // Desabilita parcelamento se for recorrente
                  }
                }}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Fixo mensal (recorrente)
                </span>
                <p className="text-xs text-gray-500">
                  Será contabilizado automaticamente todo mês
                </p>
              </div>
            </label>

            {isRecurring && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dia do mês
                    </label>
                    <input
                      type="number"
                      value={recurringDay}
                      onChange={e => setRecurringDay(e.target.value)}
                      min="1"
                      max="31"
                      placeholder="1-31"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duração (meses)
                    </label>
                    <input
                      type="number"
                      value={recurringDuration}
                      onChange={e => setRecurringDuration(e.target.value)}
                      min="1"
                      max="120"
                      placeholder="Sem fim"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Deixe duração em branco para repetir sem data de término
                </p>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="space-y-2">
            {/* Botão Adicionar Outro */}
            <button
              type="button"
              onClick={handleAddAnother}
              disabled={isSubmitting || !description || !amount || !categoryId}
              className={`w-full py-3 rounded-xl font-semibold transition-colors border-2 ${
                isSubmitting || !description || !amount || !categoryId
                  ? 'border-gray-200 text-gray-400 bg-gray-50'
                  : 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100'
              }`}
            >
              {isSubmitting ? 'Salvando...' : '+ Adicionar outro'}
            </button>

            {/* Botão Finalizar */}
            <button
              type="submit"
              disabled={isSubmitting || !description || !amount || !categoryId}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
                isSubmitting || !description || !amount || !categoryId
                  ? 'bg-gray-300'
                  : isRecurring
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : type === 'expense'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSubmitting
                ? 'Salvando...'
                : addedCount > 0
                  ? `Finalizar (${addedCount + 1} itens)`
                  : isRecurring
                    ? (type === 'expense' ? 'Adicionar Gasto Fixo' : 'Adicionar Ganho Fixo')
                    : (type === 'expense' ? 'Adicionar Gasto' : 'Adicionar Ganho')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
