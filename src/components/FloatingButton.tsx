'use client';

import { useState } from 'react';

interface FloatingButtonProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
}

export function FloatingButton({ onAddExpense, onAddIncome }: FloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-4 z-[60]">
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-16 right-0 flex flex-col gap-2 items-end">
            <button
              onClick={() => {
                onAddIncome();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700 transition-colors"
            >
              <span>💰</span>
              <span className="font-medium">Ganho</span>
            </button>
            <button
              onClick={() => {
                onAddExpense();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
            >
              <span>💸</span>
              <span className="font-medium">Gasto</span>
            </button>
          </div>
        </>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-all ${
          isOpen
            ? 'bg-gray-600 rotate-45'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        +
      </button>
    </div>
  );
}
