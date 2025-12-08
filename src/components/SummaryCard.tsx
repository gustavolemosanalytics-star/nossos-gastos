import { formatCurrency } from '@/utils/formatters';

interface SummaryCardProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expectedSalary?: number;
  projectedBalance?: number;
}

export function SummaryCard({
  totalIncome,
  totalExpenses,
  balance,
  expectedSalary = 0,
  projectedBalance,
}: SummaryCardProps) {
  const totalEntradas = expectedSalary + totalIncome;
  const saldoFinal = projectedBalance ?? balance;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mx-4 -mt-4">
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500 mb-1">Saldo do mês</p>
        <p className={`text-3xl font-bold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {formatCurrency(saldoFinal)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
        {/* Salários */}
        {expectedSalary > 0 && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-xs text-gray-500">Salários</span>
            </div>
            <p className="text-sm font-semibold text-blue-600">
              {formatCurrency(expectedSalary)}
            </p>
          </div>
        )}

        {/* Ganhos */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-xs text-gray-500">Ganhos</span>
          </div>
          <p className="text-sm font-semibold text-green-600">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        {/* Gastos */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-xs text-gray-500">Gastos</span>
          </div>
          <p className="text-sm font-semibold text-red-500">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
      </div>

      {/* Resumo detalhado quando tem salário */}
      {expectedSalary > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 text-center">
          Total de entradas: {formatCurrency(totalEntradas)}
        </div>
      )}
    </div>
  );
}
