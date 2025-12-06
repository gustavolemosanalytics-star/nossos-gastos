import { formatCurrency } from '@/utils/formatters';

interface SummaryCardProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export function SummaryCard({ totalIncome, totalExpenses, balance }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mx-4 -mt-4">
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500 mb-1">Saldo do mês</p>
        <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {formatCurrency(balance)}
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-100">
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-xs text-gray-500">Ganhos</span>
          </div>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        <div className="w-px bg-gray-100"></div>

        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-xs text-gray-500">Gastos</span>
          </div>
          <p className="text-lg font-semibold text-red-500">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
      </div>
    </div>
  );
}
