CREATE TABLE public.category_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  monthly_budget numeric NOT NULL CHECK (monthly_budget > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_name)
);

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cb_select_own" ON public.category_budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cb_insert_own" ON public.category_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cb_update_own" ON public.category_budgets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cb_delete_own" ON public.category_budgets
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER category_budgets_touch
  BEFORE UPDATE ON public.category_budgets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();