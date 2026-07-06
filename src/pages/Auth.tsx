import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MobileFrame from "@/components/MobileFrame";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const Auth = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/", { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google prijava nije uspjela.");
      setBusy(false);
    }
  };

  return (
    <MobileFrame>
      <section className="flex-1 flex flex-col items-center justify-center px-7 pt-12 pb-10">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold leading-tight text-foreground">
            Prijavi se za početak.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Koristimo Google prijavu — brzo, sigurno, bez lozinki.
          </p>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="mt-10 h-14 w-full rounded-full border border-border bg-background flex items-center justify-center gap-3 text-base font-medium text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <GoogleIcon />
            Nastavi s Googleom
          </button>

          <p className="mt-5 text-xs text-muted-foreground px-4">
            Tvoji podaci ostaju privatni i nikad se ne dijele s trećim stranama.
          </p>
        </div>
      </section>
    </MobileFrame>
  );
};

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

export default Auth;
