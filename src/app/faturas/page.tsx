'use client';

import { useMemo, useState } from 'react';
import { useTransactions } from '@/context/TransactionContext';
import { useCards } from '@/context/CardContext';
import { expenseCategories } from '@/data/categories';

interface TransacaoFatura {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId?: string;
  isInstallment: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
}

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
    totalParcelado: number;
    totalAVista: number;
    transacoes: TransacaoFatura[];
    parceladas: TransacaoFatura[];
    aVista: TransacaoFatura[];
  }[];
}

// Componente de gráfico de linha simples
function LineChart({
  data,
  labels,
  datasets,
  height = 200,
}: {
  data: number[][];
  labels: string[];
  datasets: { label: string; color: string }[];
  height?: number;
}) {
  if (data.length === 0 || labels.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Sem dados para exibir</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.flat(), 1);
  const chartHeight = 60;

  const getY = (value: number) => {
    const percentage = value / maxValue;
    return chartHeight - 10 - percentage * (chartHeight - 20);
  };

  const getX = (index: number, total: number) => {
    if (total <= 1) return 50;
    const padding = 15;
    const availableWidth = 100 - padding * 2;
    return padding + (index / (total - 1)) * availableWidth;
  };

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(0);
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 100 ${chartHeight}`}
        className="w-full min-w-[300px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.5, 1].map((percent, i) => {
          const y = chartHeight - 10 - percent * (chartHeight - 20);
          const value = percent * maxValue;
          return (
            <g key={i}>
              <line
                x1="12"
                y1={y}
                x2="98"
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.3"
                strokeDasharray="1,1"
              />
              <text
                x="10"
                y={y + 1}
                fontSize="3"
                fill="#9ca3af"
                textAnchor="end"
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        {datasets.map((dataset, datasetIndex) => {
          if (!data[datasetIndex] || data[datasetIndex].length === 0) return null;

          const points = data[datasetIndex]
            .map((value, i) => `${getX(i, labels.length)},${getY(value)}`)
            .join(' ');

          return (
            <g key={dataset.label}>
              <polyline
                points={points}
                fill="none"
                stroke={dataset.color}
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {data[datasetIndex].map((value, i) => (
                <g key={i}>
                  <circle
                    cx={getX(i, labels.length)}
                    cy={getY(value)}
                    r="1.5"
                    fill={dataset.color}
                  />
                  {/* Rótulo de dados */}
                  {value > 0 && (
                    <text
                      x={getX(i, labels.length)}
                      y={getY(value) - 3}
                      fontSize="2.5"
                      fill={dataset.color}
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {formatValue(value)}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={getX(i, labels.length)}
            y={chartHeight - 2}
            fontSize="3"
            fill="#6b7280"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function Faturas() {
  const { transactions } = useTransactions();
  const { userCards } = useCards();
  const [activeTab, setActiveTab] = useState<'faturas' | 'graficos'>('faturas');
  const [chartType, setChartType] = useState<'cartao' | 'categoria'>('cartao');

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
          totalParcelado: 0,
          totalAVista: 0,
          transacoes: [],
          parceladas: [],
          aVista: [],
        };
        fatura.porCartao.push(cartaoEntry);
      }

      const transacao: TransacaoFatura = {
        id: t.id,
        description: t.description,
        amount: t.amount,
        date: t.date,
        categoryId: t.categoryId,
        isInstallment: t.isInstallment,
        installmentCurrent: t.installmentCurrent,
        installmentTotal: t.installmentTotal,
      };

      cartaoEntry.total += t.amount;
      cartaoEntry.transacoes.push(transacao);

      if (t.isInstallment) {
        cartaoEntry.totalParcelado += t.amount;
        cartaoEntry.parceladas.push(transacao);
      } else {
        cartaoEntry.totalAVista += t.amount;
        cartaoEntry.aVista.push(transacao);
      }

      fatura.total += t.amount;
    });

    // Converter para array e ordenar cartões (mantém ordem de lançamento das transações)
    const resultado = Array.from(porMes.values());
    resultado.forEach(fatura => {
      // Ordenar cartões por total (maior primeiro)
      fatura.porCartao.sort((a, b) => b.total - a.total);
    });

    return resultado;
  }, [transactions, userCards]);

  // Dados para gráfico por cartão (6 meses)
  const chartDataByCard = useMemo(() => {
    const labels = faturasPorMes.map(f => f.mesLabel.substring(0, 3));
    const datasets = userCards.map(card => ({
      label: card.name,
      color: card.color,
    }));

    const data = userCards.map(card =>
      faturasPorMes.map(fatura => {
        const cartaoEntry = fatura.porCartao.find(c => c.cardId === card.id);
        return cartaoEntry?.total || 0;
      })
    );

    return { labels, datasets, data };
  }, [faturasPorMes, userCards]);

  // Dados para gráfico por categoria (6 meses)
  const chartDataByCategory = useMemo(() => {
    const labels = faturasPorMes.map(f => f.mesLabel.substring(0, 3));

    // Calcular totais por categoria
    const categoryTotals = new Map<string, number>();
    faturasPorMes.forEach(fatura => {
      fatura.porCartao.forEach(cartao => {
        cartao.transacoes.forEach(t => {
          if (t.categoryId) {
            const current = categoryTotals.get(t.categoryId) || 0;
            categoryTotals.set(t.categoryId, current + t.amount);
          }
        });
      });
    });

    // Pegar as top 6 categorias
    const sortedCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([catId]) => expenseCategories.find(c => c.id === catId))
      .filter(Boolean);

    const datasets = sortedCategories.map(cat => ({
      label: cat!.name,
      color: cat!.color,
    }));

    const data = sortedCategories.map(cat =>
      faturasPorMes.map(fatura => {
        let total = 0;
        fatura.porCartao.forEach(cartao => {
          cartao.transacoes.forEach(t => {
            if (t.categoryId === cat!.id) {
              total += t.amount;
            }
          });
        });
        return total;
      })
    );

    return { labels, datasets, data };
  }, [faturasPorMes]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

      {/* Tabs */}
      <div className="px-4 py-3 bg-white border-b flex gap-2">
        <button
          onClick={() => setActiveTab('faturas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'faturas'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Faturas
        </button>
        <button
          onClick={() => setActiveTab('graficos')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'graficos'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Gráficos
        </button>
      </div>

      {activeTab === 'faturas' ? (
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
                        <div className="flex items-center justify-between mb-3">
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

                        <div className="ml-5 space-y-3">
                          {/* Compras Parceladas */}
                          {cartao.parceladas.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                  🔄 Parceladas
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatCurrency(cartao.totalParcelado)}
                                </span>
                              </div>
                              <div className="space-y-1 pl-2 border-l-2 border-blue-200">
                                {cartao.parceladas.slice(0, 5).map(t => (
                                  <div
                                    key={t.id}
                                    className="flex items-center justify-between text-xs text-gray-500"
                                  >
                                    <span className="truncate flex-1 mr-2">
                                      {t.description}
                                      <span className="text-blue-500 ml-1">
                                        ({t.installmentCurrent}/{t.installmentTotal})
                                      </span>
                                    </span>
                                    <span className="text-gray-700 whitespace-nowrap">
                                      {formatCurrency(t.amount)}
                                    </span>
                                  </div>
                                ))}
                                {cartao.parceladas.length > 5 && (
                                  <p className="text-xs text-gray-400">
                                    +{cartao.parceladas.length - 5} itens
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Compras à Vista */}
                          {cartao.aVista.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                  💳 À vista
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatCurrency(cartao.totalAVista)}
                                </span>
                              </div>
                              <div className="space-y-1 pl-2 border-l-2 border-green-200">
                                {cartao.aVista.slice(0, 5).map(t => (
                                  <div
                                    key={t.id}
                                    className="flex items-center justify-between text-xs text-gray-500"
                                  >
                                    <span className="truncate flex-1 mr-2">
                                      {t.description}
                                    </span>
                                    <span className="text-gray-700 whitespace-nowrap">
                                      {formatCurrency(t.amount)}
                                    </span>
                                  </div>
                                ))}
                                {cartao.aVista.length > 5 && (
                                  <p className="text-xs text-gray-400">
                                    +{cartao.aVista.length - 5} itens
                                  </p>
                                )}
                              </div>
                            </div>
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
      ) : (
        /* Aba Gráficos */
        <div className="p-4 space-y-4">
          {/* Seletor de tipo de gráfico */}
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('cartao')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'cartao'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Por Cartão
            </button>
            <button
              onClick={() => setChartType('categoria')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'categoria'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Por Categoria
            </button>
          </div>

          {/* Gráfico */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">
              {chartType === 'cartao' ? 'Evolução por Cartão' : 'Evolução por Categoria'}
            </h3>

            {chartType === 'cartao' && userCards.length > 0 ? (
              <>
                <LineChart
                  data={chartDataByCard.data}
                  labels={chartDataByCard.labels}
                  datasets={chartDataByCard.datasets}
                />
                {/* Legenda */}
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {chartDataByCard.datasets.map((dataset, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dataset.color }}
                      />
                      <span className="text-xs text-gray-600">{dataset.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : chartType === 'categoria' && chartDataByCategory.datasets.length > 0 ? (
              <>
                <LineChart
                  data={chartDataByCategory.data}
                  labels={chartDataByCategory.labels}
                  datasets={chartDataByCategory.datasets}
                />
                {/* Legenda */}
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {chartDataByCategory.datasets.map((dataset, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dataset.color }}
                      />
                      <span className="text-xs text-gray-600">{dataset.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Sem dados para exibir</p>
              </div>
            )}
          </div>

          {/* Resumo por cartão ou categoria */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">
              Total dos 6 meses
            </h3>

            {chartType === 'cartao' ? (
              <div className="space-y-2">
                {userCards.map((card, index) => {
                  const total = chartDataByCard.data[index]?.reduce((a, b) => a + b, 0) || 0;
                  return (
                    <div key={card.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: card.color }}
                        />
                        <span className="text-sm text-gray-700">{card.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  );
                })}
                {userCards.length === 0 && (
                  <p className="text-sm text-gray-400 text-center">Nenhum cartão cadastrado</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {chartDataByCategory.datasets.map((dataset, i) => {
                  const total = chartDataByCategory.data[i]?.reduce((a, b) => a + b, 0) || 0;
                  return (
                    <div key={dataset.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: dataset.color }}
                        />
                        <span className="text-sm text-gray-700">{dataset.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  );
                })}
                {chartDataByCategory.datasets.length === 0 && (
                  <p className="text-sm text-gray-400 text-center">Nenhum gasto registrado</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
