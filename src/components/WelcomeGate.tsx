import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const WelcomeGate = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [session, setSession] = useState<{ user: { id: string } } | null>(null);
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        const { data: u, error } = await supabase.auth.getUser();
        if (!mounted) return;
        if (error || !u.user) {
          await supabase.auth.signOut();
          setSession(null);
        } else {
          setSession(data.session as never);
        }
      } else {
        setSession(null);
      }
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s as never);
      setOnboarded(null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setOnboarded(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const uid = session.user.id;
      const { data } = await supabase
        .from("user_settings")
        .select("onboarding_completed")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        await supabase
          .from("user_settings")
          .upsert({ user_id: uid }, { onConflict: "user_id" });
        if (!cancelled) setOnboarded(false);
        return;
      }
      setOnboarded(!!data.onboarding_completed);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!ready) return null;

  if (!session) return <Navigate to="/onboarding" replace state={{ from: location }} />;

  if (onboarded === null) return null;
  if (!onboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

export default WelcomeGate;
