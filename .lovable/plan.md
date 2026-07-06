## Cause

Two bugs combined are blocking you on `/onboarding`:

1. **Stale session in the browser.** Your browser still has a Supabase session (stored in `localStorage`) for an old user (`korinajuric03@gmail.com`, id `674576b8…`) that **no longer exists in `auth.users`** for this backend. Only `vjeran@netgen.io` currently exists.
2. **The code trusts `getSession()` blindly.** `Onboarding.tsx` calls `supabase.auth.getSession()`, sees a `userId`, and therefore skips the Auth step (`advanceFromWelcome` goes straight to `category` when `userId` is truthy). Then "Dalje" tries to `upsert` into `user_settings` with that ghost `user_id`, and the FK `user_settings_user_id_fkey → auth.users(id)` rejects it with `23503` → toast: *"Spremanje nije uspjelo. Pokušaj ponovo."*

`getSession()` is a pure local read; it never asks the server whether the user still exists. So a deleted-user session looks valid until the first write hits the FK.

The same flaw exists in `WelcomeGate.tsx`, which also acts on `getSession()` only.

## Fix plan

**1. Validate the session against the server, not just localStorage.**
In both `Onboarding.tsx` and `WelcomeGate.tsx`, after `getSession()` returns a session, call `supabase.auth.getUser()`. If it returns an error or `data.user` is null, treat the session as invalid:
- `await supabase.auth.signOut()`
- set local `userId`/`session` state to `null`
- in `Onboarding`, this lets `advanceFromWelcome` correctly route to the `auth` step; in `WelcomeGate`, the `Navigate to="/onboarding"` path will run with no session.

**2. Defensive handling on save.**
In `Onboarding.saveRole` and `Onboarding.finish`, if the upsert returns Postgres code `23503` (FK violation), sign the user out and reset to `step = "auth"` with a clearer toast ("Tvoja sesija je istekla. Prijavi se ponovo."), instead of the generic save-failed message.

**3. No DB / schema changes.**
The FK is correct, the trigger `on_auth_user_created_settings` already seeds `user_settings` for real new users, and RLS is fine. The only data issue is the orphan session in your browser, which step 1 will clear automatically next time the app loads.

## Files to change

- `src/pages/Onboarding.tsx` — validate session via `getUser()` in the boot effect; handle `23503` in `saveRole` / `finish`.
- `src/components/WelcomeGate.tsx` — validate session via `getUser()`; if invalid, sign out and redirect to `/onboarding` as unauthenticated.

No migration, no changes to `Auth.tsx`, no other files.

## After the fix

Reloading the preview will detect the dead session, sign you out, show **Welcome → "Krenimo" → Auth (Google)**, and after a real Google login the trigger will create your `user_settings` row, so role save succeeds.