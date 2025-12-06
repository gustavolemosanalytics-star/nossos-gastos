-- =============================================
-- NOSSOS GASTOS - Schema SQL para Supabase
-- =============================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: users (opcional, se quiser multi-usuário)
-- =============================================
-- CREATE TABLE users (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   email TEXT UNIQUE NOT NULL,
--   name TEXT,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- =============================================
-- TABELA: transactions (gastos e ganhos)
-- =============================================
CREATE TABLE transactions (
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
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_person ON transactions(person);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_installment_group ON transactions(installment_group_id);

-- =============================================
-- TABELA: user_cards (cartões do usuário)
-- =============================================
CREATE TABLE user_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: investments (caixinhas)
-- =============================================
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💰',
  color TEXT NOT NULL DEFAULT '#22c55e',
  goal DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: investment_transactions (depósitos/retiradas das caixinhas)
-- =============================================
CREATE TABLE investment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para investment_transactions
CREATE INDEX idx_investment_transactions_investment ON investment_transactions(investment_id);

-- =============================================
-- TABELA: categories (opcional - caso queira categorias customizáveis)
-- =============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO categories (id, name, icon, color, type) VALUES
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
-- VIEWS úteis
-- =============================================

-- View: Resumo mensal
CREATE VIEW monthly_summary AS
SELECT
  DATE_TRUNC('month', date) AS month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS balance
FROM transactions
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;

-- View: Total por categoria
CREATE VIEW category_totals AS
SELECT
  category_id,
  DATE_TRUNC('month', date) AS month,
  SUM(amount) AS total
FROM transactions
WHERE type = 'expense'
GROUP BY category_id, DATE_TRUNC('month', date);

-- View: Total por pessoa
CREATE VIEW person_totals AS
SELECT
  person,
  DATE_TRUNC('month', date) AS month,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income
FROM transactions
GROUP BY person, DATE_TRUNC('month', date);

-- View: Saldo das caixinhas
CREATE VIEW investment_balances AS
SELECT
  i.id,
  i.name,
  i.icon,
  i.color,
  i.goal,
  COALESCE(SUM(CASE WHEN it.type = 'deposit' THEN it.amount ELSE -it.amount END), 0) AS balance
FROM investments i
LEFT JOIN investment_transactions it ON i.id = it.investment_id
GROUP BY i.id, i.name, i.icon, i.color, i.goal;

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
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_cards_updated_at
  BEFORE UPDATE ON user_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) - Para multi-usuário futuro
-- =============================================
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS DE ACESSO (quando habilitar RLS)
-- =============================================
-- CREATE POLICY "Users can view own transactions" ON transactions
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own transactions" ON transactions
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own transactions" ON transactions
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own transactions" ON transactions
--   FOR DELETE USING (auth.uid() = user_id);
