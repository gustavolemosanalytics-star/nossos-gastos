import type { Metadata, Viewport } from 'next';
import { TransactionProvider } from '@/context/TransactionContext';
import { InvestmentProvider } from '@/context/InvestmentContext';
import { CardProvider } from '@/context/CardContext';
import { SalaryProvider } from '@/context/SalaryContext';
import { BottomNav } from '@/components/BottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nossos Gastos',
  description: 'Aplicativo para controle de gastos pessoais',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#16a34a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-100">
        <TransactionProvider>
          <InvestmentProvider>
            <CardProvider>
              <SalaryProvider>
                <main className="pb-20">
                  {children}
                </main>
                <BottomNav />
              </SalaryProvider>
            </CardProvider>
          </InvestmentProvider>
        </TransactionProvider>
      </body>
    </html>
  );
}
