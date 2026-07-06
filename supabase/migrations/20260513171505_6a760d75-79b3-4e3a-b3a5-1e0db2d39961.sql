ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_role text,
  ADD COLUMN IF NOT EXISTS coachmarks_dismissed boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_user_role_check;

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_user_role_check
  CHECK (user_role IS NULL OR user_role IN ('ucenik','student','zaposlen','freelancer','ostalo'));