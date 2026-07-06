import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileFrame from "@/components/MobileFrame";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

type Step = "welcome" | "auth" | "category" | "success";
type RoleId = "ucenik" | "student" | "zaposlen" | "freelancer" | "ostalo";

const categories: { id: RoleId; emoji: string; label: string }[] = [
  { id: "ucenik", emoji: "🎒", label: "Učenik/ica" },
  { id: "student", emoji: "🎓", label: "Student/ica" },
  { id: "zaposlen", emoji: "💼", label: "Zaposlen/a" },
  { id: "freelancer", emoji: "💻", label: "Freelancer" },
  { id: "ostalo", emoji: "👤", label: "Ostalo" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [category, setCategory] = useState<RoleId | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);

  // On mount: check session and onboarding state.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      let uid: string | null = null;
      if (data.session) {
        const { data: u, error } = await supabase.auth.getUser();
        if (!mounted) return;
        if (error || !u.user) {
          await supabase.auth.signOut();
        } else {
          uid = u.user.id;
        }
      }
      setUserId(uid);
      if (uid) {
        const { data: row } = await supabase
          .from("user_settings")
          .select("onboarding_completed")
          .eq("user_id", uid)
          .maybeSingle();
        if (!mounted) return;
        if (row?.onboarding_completed) {
          navigate("/", { replace: true });
          return;
        }
        // Already authenticated but onboarding not done → skip Welcome+Auth.
        setStep("category");
      }
      setBootChecked(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const newUid = session?.user.id ?? null;
      setUserId(newUid);
      if (event === "SIGNED_IN" && newUid) {
        // After Google OAuth returns, jump straight to role selection.
        setStep((s) => (s === "welcome" || s === "auth" ? "category" : s));
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const advanceFromWelcome = () => {
    setStep(userId ? "category" : "auth");
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/onboarding`,
    });
    if (result.error) {
      toast.error("Google prijava nije uspjela.");
      setBusy(false);
    }
    // On success the browser will redirect; WelcomeGate will route back here.
  };

  const saveRole = async () => {
    if (!category || !userId) return;
    setBusy(true);
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, user_role: category },
        { onConflict: "user_id" },
      );
    setBusy(false);
    if (error) {
      if ((error as { code?: string }).code === "23503") {
        await supabase.auth.signOut();
        setUserId(null);
        setStep("auth");
        toast.error("Tvoja sesija je istekla. Prijavi se ponovo.");
        return;
      }
      toast.error("Spremanje nije uspjelo. Pokušaj ponovo.");
      return;
    }
    setStep("success");
  };

  const finish = async () => {
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, onboarding_completed: true },
        { onConflict: "user_id" },
      );
    setBusy(false);
    if (error) {
      if ((error as { code?: string }).code === "23503") {
        await supabase.auth.signOut();
        setUserId(null);
        setStep("auth");
        toast.error("Tvoja sesija je istekla. Prijavi se ponovo.");
        return;
      }
      toast.error("Spremanje nije uspjelo. Pokušaj ponovo.");
      return;
    }
    navigate("/", { replace: true });
  };

  if (!bootChecked) {
    return (
      <MobileFrame>
        <section className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </section>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      <section className="flex-1 flex flex-col px-8 pt-12 pb-10">
        {step === "welcome" && (
          <>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <CoinAnimation />
              <h1 className="mt-10 text-4xl font-semibold leading-tight text-primary">
                Tvoj novac,
                <br />u tvojim rukama.
              </h1>
              <p className="mt-5 text-base text-muted-foreground max-w-sm">
                SmartBudget ti pomaže pratiti troškove i donijeti pametnije
                odluke — bez stresa.
              </p>
            </div>
            <Button
              size="lg"
              onClick={advanceFromWelcome}
              className="h-14 rounded-full text-base font-semibold w-full"
            >
              Krenimo
              <ArrowRight className="ml-1 h-5 w-5" strokeWidth={2} />
            </Button>
          </>
        )}

        {step === "auth" && (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-semibold leading-tight text-foreground">
              Prijavi se za početak.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
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

            <p className="mt-5 text-xs text-muted-foreground text-center px-4">
              Tvoji podaci ostaju privatni i nikad se ne dijele s trećim
              stranama.
            </p>
          </div>
        )}

        {step === "category" && (
          <>
            <div className="flex-1 flex flex-col">
              <h2 className="text-3xl font-semibold leading-tight text-foreground">
                Što te najbolje opisuje?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Koristimo ovo kako bismo SmartBudget prilagodili tebi.
              </p>

              <ul className="mt-8 flex flex-col gap-3">
                {categories.map((c) => {
                  const selected = category === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setCategory(c.id)}
                        aria-pressed={selected}
                        className={cn(
                          "w-full flex items-center gap-4 rounded-2xl border bg-background px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-primary border-2 bg-secondary"
                            : "border-border hover:bg-secondary/60",
                        )}
                      >
                        <span className="text-2xl" aria-hidden>
                          {c.emoji}
                        </span>
                        <span className="text-base font-medium text-foreground">
                          {c.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <Button
              size="lg"
              disabled={!category || busy}
              onClick={saveRole}
              className="h-14 rounded-full text-base font-semibold w-full mt-6"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Dalje
              <ArrowRight className="ml-1 h-5 w-5" strokeWidth={2} />
            </Button>
          </>
        )}

        {step === "success" && (
          <>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                  <Check
                    className="h-9 w-9 text-primary-foreground"
                    strokeWidth={3}
                  />
                </div>
              </div>
              <h1 className="mt-8 text-4xl font-semibold leading-tight text-primary">
                To je to!
              </h1>
              <p className="mt-4 text-base text-muted-foreground max-w-sm">
                Sve je spremno. Sad možeš početi pratiti svoje troškove.
              </p>
            </div>
            <Button
              size="lg"
              disabled={busy}
              onClick={finish}
              className="h-14 rounded-full text-base font-semibold w-full"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Krenimo!
              <ArrowRight className="ml-1 h-5 w-5" strokeWidth={2} />
            </Button>
          </>
        )}
      </section>
    </MobileFrame>
  );
};

const CoinAnimation = () => (
  <div className="relative h-28 w-28" aria-hidden>
    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
    <div className="absolute inset-3 rounded-full bg-primary/20" />
    <div className="absolute inset-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg">
      €
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

export default Onboarding;
