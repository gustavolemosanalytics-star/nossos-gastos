'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { id: '/', label: 'Início', icon: '🏠' },
  { id: '/faturas', label: 'Faturas', icon: '📅' },
  { id: '/transacoes', label: 'Transações', icon: '📋' },
  { id: '/cartoes', label: 'Cartões', icon: '💳' },
  { id: '/investimentos', label: 'Caixinhas', icon: '🐷' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            href={tab.id}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              pathname === tab.id
                ? 'text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-xl mb-1">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
