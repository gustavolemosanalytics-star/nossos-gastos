-- =============================================
-- NOSSOS GASTOS - Schema SQL para Supabase
-- =============================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: nossos-gastos-transactions (gastos e ganhos)
-- =============================================
CREATE TABLE "nossos-gastos-transactions" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category_id TEXT NOT NULL,
  date DATE NOT NULL,
  person TEXT NOT NULL CHECK (person IN ('amanda', 'gustavo', 'nos')),
  card_id TEXT,
  is_installment BOOLEAN DEFAULT FALSE,
  installment_current INTEGER,
  installment_total INTEGER,
  installment_group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para transactions
CREATE INDEX idx_ng_transactions_date ON "nossos-gastos-transactions"(date);
CREATE INDEX idx_ng_transactions_type ON "nossos-gastos-transactions"(type);
CREATE INDEX idx_ng_transactions_person ON "nossos-gastos-transactions"(person);
CREATE INDEX idx_ng_transactions_category ON "nossos-gastos-transactions"(category_id);
CREATE INDEX idx_ng_transactions_installment_group ON "nossos-gastos-transactions"(installment_group_id);

-- =============================================
-- TABELA: nossos-gastos-user-cards (cartões do usuário)
-- =============================================
CREATE TABLE "nossos-gastos-user-cards" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  best_purchase_day INTEGER CHECK (best_purchase_day >= 1 AND best_purchase_day <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migração: Adicionar coluna best_purchase_day se a tabela já existir
-- ALTER TABLE "nossos-gastos-user-cards" ADD COLUMN IF NOT EXISTS best_purchase_day INTEGER CHECK (best_purchase_day >= 1 AND best_purchase_day <= 31);

-- =============================================
-- TABELA: nossos-gastos-investments (caixinhas)
-- =============================================
CREATE TABLE "nossos-gastos-investments" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💰',
  color TEXT NOT NULL DEFAULT '#22c55e',
  goal DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: nossos-gastos-investment-transactions (depósitos/retiradas das caixinhas)
-- =============================================
CREATE TABLE "nossos-gastos-investment-transactions" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID NOT NULL REFERENCES "nossos-gastos-investments"(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para investment_transactions
CREATE INDEX idx_ng_investment_transactions_investment ON "nossos-gastos-investment-transactions"(investment_id);

-- =============================================
-- TABELA: nossos-gastos-categories (categorias)
-- =============================================
CREATE TABLE "nossos-gastos-categories" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO "nossos-gastos-categories" (id, name, icon, color, type) VALUES
  (uuid_generate_v4(), 'Alimentação', '🍔', '#f97316', 'expense'),
  (uuid_generate_v4(), 'Transporte', '🚗', '#3b82f6', 'expense'),
  (uuid_generate_v4(), 'Moradia', '🏠', '#8b5cf6', 'expense'),
  (uuid_generate_v4(), 'Saúde', '💊', '#ef4444', 'expense'),
  (uuid_generate_v4(), 'Educação', '📚', '#06b6d4', 'expense'),
  (uuid_generate_v4(), 'Lazer', '🎮', '#ec4899', 'expense'),
  (uuid_generate_v4(), 'Compras', '🛒', '#f59e0b', 'expense'),
  (uuid_generate_v4(), 'Contas', '📄', '#64748b', 'expense'),
  (uuid_generate_v4(), 'Investimentos', '📈', '#22c55e', 'expense'),
  (uuid_generate_v4(), 'Salário', '💰', '#22c55e', 'income'),
  (uuid_generate_v4(), 'Freelance', '💻', '#6366f1', 'income'),
  (uuid_generate_v4(), 'Outros', '📦', '#94a3b8', 'both');

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_ng_transactions_updated_at
  BEFORE UPDATE ON "nossos-gastos-transactions"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ng_user_cards_updated_at
  BEFORE UPDATE ON "nossos-gastos-user-cards"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ng_investments_updated_at
  BEFORE UPDATE ON "nossos-gastos-investments"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABELA: nossos-gastos-salaries (salários recorrentes)
-- =============================================
CREATE TABLE "nossos-gastos-salaries" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person TEXT NOT NULL CHECK (person IN ('amanda', 'gustavo')),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_ng_salaries_updated_at
  BEFORE UPDATE ON "nossos-gastos-salaries"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABELA: nossos-gastos-recurring (gastos e ganhos recorrentes)
-- =============================================
CREATE TABLE "nossos-gastos-recurring" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category_id TEXT NOT NULL,
  person TEXT NOT NULL CHECK (person IN ('amanda', 'gustavo', 'nos')),
  card_id TEXT,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ng_recurring_type ON "nossos-gastos-recurring"(type);
CREATE INDEX idx_ng_recurring_is_active ON "nossos-gastos-recurring"(is_active);

CREATE TRIGGER update_ng_recurring_updated_at
  BEFORE UPDATE ON "nossos-gastos-recurring"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
