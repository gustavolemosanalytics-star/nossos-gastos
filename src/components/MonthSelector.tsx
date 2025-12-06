'use client';

import { getMonthName, parseMonth } from '@/utils/formatters';

interface MonthSelectorProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
}

export function MonthSelector({ currentMonth, onMonthChange }: MonthSelectorProps) {
  const date = parseMonth(currentMonth);

  const goToPreviousMonth = () => {
    const prev = new Date(date);
    prev.setMonth(prev.getMonth() - 1);
    onMonthChange(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const goToNextMonth = () => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthName = getMonthName(date);
  const year = date.getFullYear();

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <button
        onClick={goToPreviousMonth}
        className="p-2 rounded-full hover:bg-white/20 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-lg font-medium capitalize min-w-[160px] text-center">
        {monthName} {year}
      </span>
      <button
        onClick={goToNextMonth}
        className="p-2 rounded-full hover:bg-white/20 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
