import { useEffect, useState } from "react";
import { Pencil, LogOut, Loader2, Tags, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUserSettings } from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";

const Profil = () => {
  const navigate = useNavigate();
  const { settings, update, loading } = useUserSettings();
  const { user } = useAuthUser();
  const fullName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name?.trim() || "";
  const email = user?.email ?? "";
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Allow Home banner CTA to deep-link and auto-open the budget editor.
  useEffect(() => {
    if (window.location.hash === "#budget") {
      setBudgetOpen(true);
      // scroll into view
      setTimeout(() => {
        document.getElementById("budget-card")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    }
  }, []);

  const toggle = (v: boolean) => {
    update({ ai_categorization_enabled: v });
  };

  const openEditor = () => {
    setDraft(
      settings.monthly_budget != null ? String(settings.monthly_budget) : "",
    );
    setBudgetOpen(true);
  };

  const saveBudget = async () => {
    const val = parseFloat(draft.replace(",", "."));
    if (!Number.isFinite(val) || val <= 0) {
      toast.error("Unesi pozitivan iznos.");
      return;
    }
    setSaving(true);
    await update({ monthly_budget: val });
    setSaving(false);
    setBudgetOpen(false);
    toast.success("Budžet spremljen.");
  };

  const clearBudget = async () => {
    setSaving(true);
    await update({ monthly_budget: null });
    setSaving(false);
    setBudgetOpen(false);
    toast("Budžet uklonjen.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const isBudgetSet = settings.monthly_budget != null;
  const budgetLabel = isBudgetSet
    ? `Tvoj mjesečni budžet je: ${settings.monthly_budget!.toLocaleString("hr-HR")} €`
    : "Nije postavljen";

  const ROLE_LABELS: Record<string, { emoji: string; label: string }> = {
    ucenik: { emoji: "🎒", label: "Učenik/ica" },
    student: { emoji: "🎓", label: "Student/ica" },
    zaposlen: { emoji: "💼", label: "Zaposlen/a" },
    freelancer: { emoji: "💻", label: "Freelancer" },
    ostalo: { emoji: "👤", label: "Ostalo" },
  };
  const role = settings.user_role ? ROLE_LABELS[settings.user_role] : null;

  const showDismissedCaption =
    !loading &&
    settings.budget_banner_dismissed &&
    settings.monthly_budget == null;

  return (
    <section className="flex-1 flex flex-col px-5 pt-10 pb-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tvoje postavke i ciljevi.
        </p>
      </header>

      {(fullName || email) && (
        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {fullName && (
              <p className="text-base font-medium text-foreground truncate">{fullName}</p>
            )}
            {email && (
              <p className={`${fullName ? "mt-0.5" : ""} text-xs text-muted-foreground truncate`}>
                {email}
              </p>
            )}
          </div>
          {role && (
            <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
              <span aria-hidden>{role.emoji}</span>
              <span>{role.label}</span>
            </div>
          )}
        </div>
      )}

      {/* Monthly budget card — always visible */}
      <div
        id="budget-card"
        className="rounded-2xl border border-border p-4 flex items-start gap-4"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Mjesečni budžet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Postavi koliko želiš potrošiti ovaj mjesec.
          </p>
          <p
            className={`mt-3 font-semibold text-primary tabular-nums text-xs ${
              isBudgetSet ? "text-gray-500" : "text-red-600"
            }`}
          >
            {budgetLabel}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={openEditor}
          aria-label="Uredi budžet"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {showDismissedCaption && (
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Možeš postaviti budžet ovdje kad budeš spreman/na.
        </p>
      )}

      <button
        type="button"
        onClick={() => navigate("/profil/kategorije")}
        className="mt-4 w-full rounded-2xl border border-border p-4 flex items-center gap-4 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary shrink-0">
          <Tags className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Kategorije</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Dodaj, preimenuj ili sakrij kategorije.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      <div className="mt-4 rounded-2xl border border-border p-4 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Koristi AI za kategorizaciju
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Kada je isključeno, AI i dalje prepoznaje iznos, datum i mjesto
            kupnje — kategoriju unosiš ručno.
          </p>
        </div>
        <Switch
          checked={settings.ai_categorization_enabled}
          onCheckedChange={toggle}
          aria-label="Koristi AI za kategorizaciju"
        />
      </div>

      <Button
        variant="ghost"
        onClick={signOut}
        className="mt-6 self-start text-muted-foreground"
      >
        <LogOut className="h-4 w-4" />
        Odjavi se
      </Button>

      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mjesečni budžet</DialogTitle>
            <DialogDescription>
              Postavi koliko želiš mjesečno potrošiti.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Label htmlFor="budget">Iznos (€)</Label>
            <Input
              id="budget"
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="npr. 800"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {settings.monthly_budget != null && (
              <Button
                variant="ghost"
                onClick={clearBudget}
                disabled={saving}
                className="text-muted-foreground"
              >
                Ukloni
              </Button>
            )}
            <Button onClick={saveBudget} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Spremi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Profil;
