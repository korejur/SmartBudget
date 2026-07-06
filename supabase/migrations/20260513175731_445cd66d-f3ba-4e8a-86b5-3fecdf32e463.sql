ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;