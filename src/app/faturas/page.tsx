'use client';

import { useMemo } from 'react';
import { useTransactions } from '@/context/TransactionContext';
import { useCards } from '@/context/CardContext';

interface FaturaResumo {
  mes: string;
  mesLabel: string;
  ano: number;
  total: number;
  porCartao: {
    cardId: string;
    cardName: string;
    cardColor: string;
    total: number;
    transacoes: {
      id: string;
      description: string;
      amount: number;
      date: string;
      isInstallment: boolean;
      installmentCurrent?: number;
      installmentTotal?: number;
    }[];
  }[];
}

export default function Faturas() {
  const { transactions } = useTransactions();
  const { userCards } = useCards();

  // Agrupa transações por mês de vencimento da fatura
  const faturasPorMes = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Criar mapa de cartões para lookup rápido
    const cartoesMap = new Map(userCards.map(c => [c.id, c]));

    // Filtrar apenas gastos no cartão de crédito (que têm cardId de cartão cadastrado)
    const gastosCartao = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      return cartoesMap.has(t.cardId || '');
    });

    // Agrupar por mês/ano
    const porMes = new Map<string, FaturaResumo>();

    // Gerar os próximos 6 meses (incluindo atual)
    for (let i = 0; i < 6; i++) {
      let mes = mesAtual + i;
      let ano = anoAtual;
      while (mes > 11) {
        mes -= 12;
        ano += 1;
      }

      const chave = `${ano}-${String(mes + 1).padStart(2, '0')}`;
      const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(ano, mes, 1));

      porMes.set(chave, {
        mes: chave,
        mesLabel: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
        ano,
        total: 0,
        porCartao: [],
      });
    }

    // Agrupar gastos por mês e cartão
    gastosCartao.forEach(t => {
      const dataTransacao = new Date(t.date + 'T12:00:00');
      const mesTransacao = dataTransacao.getMonth();
      const anoTransacao = dataTransacao.getFullYear();
      const chave = `${anoTransacao}-${String(mesTransacao + 1).padStart(2, '0')}`;

      // Só incluir se estiver nos próximos 6 meses
      if (!porMes.has(chave)) return;

      const fatura = porMes.get(chave)!;
      const cartao = cartoesMap.get(t.cardId || '');
      if (!cartao) return;

      // Encontrar ou criar entrada do cartão
      let cartaoEntry = fatura.porCartao.find(c => c.cardId === cartao.id);
      if (!cartaoEntry) {
        cartaoEntry = {
          cardId: cartao.id,
          cardName: cartao.name,
          cardColor: cartao.color,
          total: 0,
          transacoes: [],
        };
        fatura.porCartao.push(cartaoEntry);
      }

      cartaoEntry.total += t.amount;
      cartaoEntry.transacoes.push({
        id: t.id,
        description: t.description,
        amount: t.amount,
        date: t.date,
        isInstallment: t.isInstallment,
        installmentCurrent: t.installmentCurrent,
        installmentTotal: t.installmentTotal,
      });

      fatura.total += t.amount;
    });

    // Ordenar transações por data e converter para array
    const resultado = Array.from(porMes.values());
    resultado.forEach(fatura => {
      fatura.porCartao.forEach(cartao => {
        cartao.transacoes.sort((a, b) => a.date.localeCompare(b.date));
      });
      // Ordenar cartões por total (maior primeiro)
      fatura.porCartao.sort((a, b) => b.total - a.total);
    });

    return resultado;
  }, [transactions, userCards]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
  };

  // Calcular total geral
  const totalGeral = faturasPorMes.reduce((sum, f) => sum + f.total, 0);

  return (
    <div className="flex-1 pb-20">
      <div className="bg-green-600 text-white px-4 py-6">
        <h1 className="text-xl font-bold mb-2">Quanto a Pagar</h1>
        <p className="text-green-100 text-sm mb-4">
          Faturas dos próximos meses
        </p>
        <div className="bg-white/20 rounded-xl p-4">
          <p className="text-sm text-green-100">Total em faturas</p>
          <p className="text-3xl font-bold">{formatCurrency(totalGeral)}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {faturasPorMes.map((fatura, index) => {
          const isCurrentMonth = index === 0;

          return (
            <div
              key={fatura.mes}
              className={`bg-white rounded-xl overflow-hidden shadow-sm ${
                isCurrentMonth ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div className={`px-4 py-3 ${isCurrentMonth ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {fatura.mesLabel} {fatura.ano}
                    </h3>
                    {isCurrentMonth && (
                      <span className="text-xs text-green-600 font-medium">Fatura atual</span>
                    )}
                  </div>
                  <p className={`text-lg font-bold ${fatura.total > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {formatCurrency(fatura.total)}
                  </p>
                </div>
              </div>

              {fatura.total > 0 ? (
                <div className="p-4 space-y-4">
                  {fatura.porCartao.map(cartao => (
                    <div key={cartao.cardId}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cartao.cardColor }}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {cartao.cardName}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(cartao.total)}
                        </span>
                      </div>

                      <div className="ml-5 space-y-1">
                        {cartao.transacoes.slice(0, 5).map(t => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between text-xs text-gray-500"
                          >
                            <span className="truncate flex-1 mr-2">
                              {t.description}
                              {t.isInstallment && (
                                <span className="text-blue-500 ml-1">
                                  ({t.installmentCurrent}/{t.installmentTotal})
                                </span>
                              )}
                            </span>
                            <span className="text-gray-700 whitespace-nowrap">
                              {formatCurrency(t.amount)}
                            </span>
                          </div>
                        ))}
                        {cartao.transacoes.length > 5 && (
                          <p className="text-xs text-gray-400">
                            +{cartao.transacoes.length - 5} itens
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400 text-sm">
                  Nenhum gasto nesta fatura
                </div>
              )}
            </div>
          );
        })}

        {userCards.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-2 block">💳</span>
            <p>Nenhum cartão cadastrado</p>
            <p className="text-sm mt-1">
              Cadastre seus cartões na aba Cartões para ver as faturas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
