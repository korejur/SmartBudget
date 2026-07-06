-- Update default category seeding for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.categories (user_id, name, icon, is_default) VALUES
    (NEW.id, '🍔 Hrana i piće', '🍔', true),
    (NEW.id, '🚌 Prijevoz', '🚌', true),
    (NEW.id, '🎉 Izlasci', '🎉', true),
    (NEW.id, '🛒 Kupovina', '🛒', true),
    (NEW.id, '🏠 Režije', '🏠', true),
    (NEW.id, '💊 Zdravlje', '💊', true),
    (NEW.id, '📱 Pretplate', '📱', true),
    (NEW.id, '🛍️ Ostalo', '🛍️', true)
  ON CONFLICT (user_id, name) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Migrate existing users whose categories are exactly the previous 5 untouched defaults
DO $$
DECLARE
  u uuid;
  old_defaults text[] := ARRAY['🍔 Hrana','🚌 Prijevoz','🎉 Izlasci','📱 Pretplate','🛍️ Ostalo'];
BEGIN
  FOR u IN
    SELECT user_id
    FROM public.categories
    GROUP BY user_id
    HAVING COUNT(*) = 5
       AND COUNT(*) FILTER (WHERE is_default = true) = 5
       AND array_agg(name ORDER BY name) = (SELECT array_agg(n ORDER BY n) FROM unnest(old_defaults) n)
  LOOP
    DELETE FROM public.categories WHERE user_id = u AND is_default = true;
    INSERT INTO public.categories (user_id, name, icon, is_default) VALUES
      (u, '🍔 Hrana i piće', '🍔', true),
      (u, '🚌 Prijevoz', '🚌', true),
      (u, '🎉 Izlasci', '🎉', true),
      (u, '🛒 Kupovina', '🛒', true),
      (u, '🏠 Režije', '🏠', true),
      (u, '💊 Zdravlje', '💊', true),
      (u, '📱 Pretplate', '📱', true),
      (u, '🛍️ Ostalo', '🛍️', true)
    ON CONFLICT (user_id, name) DO NOTHING;
  END LOOP;
END$$;

-- Rewrite transactions referencing the renamed default
UPDATE public.transactions
SET category = '🍔 Hrana i piće'
WHERE category = '🍔 Hrana';