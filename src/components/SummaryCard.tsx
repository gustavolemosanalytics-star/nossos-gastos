import { formatCurrency } from '@/utils/formatters';

interface SummaryCardProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  projectedBalance?: number;
  recurringExpenses?: number;
  recurringIncome?: number;
  onClickIncome?: () => void;
  onClickExpense?: () => void;
}

export function SummaryCard({
  totalIncome,
  totalExpenses,
  balance,
  projectedBalance,
  recurringExpenses = 0,
  recurringIncome = 0,
  onClickIncome,
  onClickExpense,
}: SummaryCardProps) {
  // Junta ganhos lançados + ganhos recorrentes (inclui salários)
  const totalGanhos = totalIncome + recurringIncome;
  const totalGastos = totalExpenses + recurringExpenses;
  const saldoFinal = projectedBalance ?? balance;

  const hasRecurring = recurringExpenses > 0 || recurringIncome > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mx-4 -mt-4">
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500 mb-1">Saldo do mês</p>
        <p className={`text-3xl font-bold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {formatCurrency(saldoFinal)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        {/* Ganhos (salário + ganhos + recorrentes) */}
        <button
          onClick={onClickIncome}
          className="text-center p-2 rounded-xl hover:bg-green-50 active:bg-green-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-xs text-gray-500">Ganhos</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(totalGanhos)}
          </p>
        </button>

        {/* Gastos */}
        <button
          onClick={onClickExpense}
          className="text-center p-2 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-xs text-gray-500">Gastos</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-red-500">
            {formatCurrency(totalGastos)}
          </p>
        </button>
      </div>

      {/* Detalhes dos fixos */}
      {hasRecurring && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Fixos inclusos:</span>
            <span>
              {recurringIncome > 0 && <span className="text-green-600">+{formatCurrency(recurringIncome)}</span>}
              {recurringIncome > 0 && recurringExpenses > 0 && ' / '}
              {recurringExpenses > 0 && <span className="text-red-500">-{formatCurrency(recurringExpenses)}</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
