'use client';

import { useState } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { formatCurrency } from '@/utils/formatters';

const defaultIcons = ['💰', '🏠', '🚗', '✈️', '🎓', '💍', '🎁', '📱', '💻', '🎮'];
const defaultColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

export default function Investimentos() {
  const { investments, addInvestment, deleteInvestment, addDeposit, addWithdraw } = useInvestments();
  const [showNewForm, setShowNewForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState<string | null>(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState<string | null>(null);

  // New investment form state
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💰');
  const [newColor, setNewColor] = useState('#22c55e');
  const [newGoal, setNewGoal] = useState('');

  // Deposit/Withdraw form state
  const [amount, setAmount] = useState('');

  const handleCreateInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    addInvestment({
      name: newName,
      icon: newIcon,
      color: newColor,
      goal: newGoal ? parseFloat(newGoal) : undefined,
    });

    setNewName('');
    setNewGoal('');
    setShowNewForm(false);
  };

  const handleDeposit = (investmentId: string) => {
    if (!amount || parseFloat(amount) <= 0) return;
    addDeposit(investmentId, parseFloat(amount));
    setAmount('');
    setShowDepositForm(null);
  };

  const handleWithdraw = (investmentId: string) => {
    if (!amount || parseFloat(amount) <= 0) return;
    addWithdraw(investmentId, parseFloat(amount));
    setAmount('');
    setShowWithdrawForm(null);
  };

  const getInvestmentTotal = (inv: typeof investments[0]) => {
    return inv.transactions.reduce((total, t) => {
      return t.type === 'deposit' ? total + t.amount : total - t.amount;
    }, 0);
  };

  const totalInvested = investments.reduce((sum, inv) => sum + getInvestmentTotal(inv), 0);

  return (
    <div className="flex-1">
      <div className="bg-green-600 text-white px-4 py-6">
        <h1 className="text-xl font-bold mb-2">Caixinhas</h1>
        <p className="text-green-100 text-sm mb-4">
          Guarde dinheiro para seus objetivos
        </p>
        <div className="bg-white/20 rounded-xl p-4">
          <p className="text-sm text-green-100">Total guardado</p>
          <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full py-3 mb-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-500 hover:text-green-600 transition-colors"
        >
          + Nova Caixinha
        </button>

        {investments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-2 block">🐷</span>
            <p>Nenhuma caixinha criada</p>
            <p className="text-sm mt-1">Crie uma para começar a guardar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {investments.map(inv => {
              const total = getInvestmentTotal(inv);
              const progress = inv.goal ? Math.min((total / inv.goal) * 100, 100) : 0;

              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${inv.color}20` }}
                    >
                      {inv.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{inv.name}</h3>
                          <p className="text-lg font-bold" style={{ color: inv.color }}>
                            {formatCurrency(total)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('Excluir esta caixinha?')) {
                              deleteInvestment(inv.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {inv.goal && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Meta: {formatCurrency(inv.goal)}</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: inv.color,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setAmount('');
                            setShowDepositForm(inv.id);
                          }}
                          className="flex-1 py-2 px-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                        >
                          + Depositar
                        </button>
                        <button
                          onClick={() => {
                            setAmount('');
                            setShowWithdrawForm(inv.id);
                          }}
                          className="flex-1 py-2 px-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                          disabled={total <= 0}
                        >
                          - Retirar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nova Caixinha */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Nova Caixinha</h2>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateInvestment} className="p-4 space-y-4 pb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da caixinha
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Viagem, Casa nova..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ícone
                </label>
                <div className="flex gap-2 flex-wrap">
                  {defaultIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewIcon(icon)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${
                        newIcon === icon
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor
                </label>
                <div className="flex gap-2">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        newColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta (opcional)
                </label>
                <input
                  type="number"
                  value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                  placeholder="R$ 0,00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                Criar Caixinha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Depositar */}
      {showDepositForm && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Depositar</h3>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="R$ 0,00"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-xl font-semibold mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDepositForm(null)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeposit(showDepositForm)}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                Depositar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retirar */}
      {showWithdrawForm && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Retirar</h3>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="R$ 0,00"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-xl font-semibold mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowWithdrawForm(null)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleWithdraw(showWithdrawForm)}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Retirar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
