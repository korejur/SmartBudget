
-- Extend user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS ai_categorization_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('expense','income')),
  name text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  category text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  place text,
  purchase_name text,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_interval text CHECK (recurring_interval IN ('weekly','monthly','custom')),
  recurring_interval_custom text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tx_select_own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tx_insert_own" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tx_update_own" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tx_delete_own" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_select_own" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cat_insert_own" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cat_update_own" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cat_delete_own" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- receipt_line_items
CREATE TABLE IF NOT EXISTS public.receipt_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rli_tx ON public.receipt_line_items(transaction_id);
ALTER TABLE public.receipt_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rli_select_own" ON public.receipt_line_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rli_insert_own" ON public.receipt_line_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rli_update_own" ON public.receipt_line_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rli_delete_own" ON public.receipt_line_items FOR DELETE USING (auth.uid() = user_id);

-- Seed defaults on new user (settings row + 5 categories)
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.categories (user_id, name, icon, is_default) VALUES
    (NEW.id, '🍔 Hrana', '🍔', true),
    (NEW.id, '🚌 Prijevoz', '🚌', true),
    (NEW.id, '🎉 Izlasci', '🎉', true),
    (NEW.id, '📱 Pretplate', '📱', true),
    (NEW.id, '🛍️ Ostalo', '🛍️', true)
  ON CONFLICT (user_id, name) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();
