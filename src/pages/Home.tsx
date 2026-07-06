import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Wallet,
  Receipt,
  PlusCircle,
  Camera,
  User,
  X,
  Lightbulb,
  Utensils,
  Bus,
  Music,
  ShoppingBag,
  Home as HomeIcon,
  HeartPulse,
  Smartphone,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HomeCoachmarks from "@/components/HomeCoachmarks";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import { useAuthUser } from "@/hooks/useAuthUser";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  "🍔 Hrana i piće": Utensils,
  "🚌 Prijevoz": Bus,
  "🎉 Izlasci": Music,
  "🛒 Kupovina": ShoppingBag,
  "🏠 Režije": HomeIcon,
  "💊 Zdravlje": HeartPulse,
  "📱 Pretplate": Smartphone,
  "🛍️ Ostalo": Tag,
};

const getCategoryIcon = (
  type: "expense" | "income",
  category: string | null,
): LucideIcon => {
  if (type === "income") return Wallet;
  if (category && CATEGORY_ICON_MAP[category]) return CATEGORY_ICON_MAP[category];
  return Tag;
};

const formatAmount = (value: number) => {
  const sign = value < 0 ? "-" : "+";
  const abs = Math.abs(value).toLocaleString("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${abs} €`;
};

const formatEur = (value: number) =>
  value.toLocaleString("hr-HR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const isThisMonth = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
};

const formatRelativeDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) /
      86400000,
  );
  if (diff <= 0) return "danas";
  if (diff === 1) return "jučer";
  if (diff < 7) return `prije ${diff} dana`;
  return d.toLocaleDateString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const Home = () => {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const { settings, update, loading: settingsLoading } = useUserSettings();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { user } = useAuthUser();
  const fullName =
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ||
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.name ||
    "";
  const firstName = fullName.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Bok, ${firstName}!` : "Bok!";
  const fabRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLButtonElement>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [navRefs, setNavRefs] = useState<{
    analiza: React.RefObject<HTMLElement> | null;
    profil: React.RefObject<HTMLElement> | null;
  }>({ analiza: null, profil: null });

  // Show coachmarks the first time after onboarding completes (DB-backed).
  useEffect(() => {
    if (settingsLoading) return;
    if (settings.coachmarks_dismissed) return;
    if (coachOpen) return;
    const raf = requestAnimationFrame(() => {
      const t = window.setTimeout(() => setCoachOpen(true), 50);
      (window as unknown as { __cmTimer?: number }).__cmTimer = t;
    });
    return () => {
      cancelAnimationFrame(raf);
      const t = (window as unknown as { __cmTimer?: number }).__cmTimer;
      if (t) window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading, settings.coachmarks_dismissed]);

  // Resolve bottom-nav targets after mount.
  useEffect(() => {
    const analiza = document.querySelector<HTMLElement>(
      '[data-coachmark="analiza"]',
    );
    const profil = document.querySelector<HTMLElement>(
      '[data-coachmark="profil"]',
    );
    setNavRefs({
      analiza: analiza ? { current: analiza } : null,
      profil: profil ? { current: profil } : null,
    });
  }, []);

  const handleAction = (label: string) => {
    setSheetOpen(false);
    if (label === "Skeniraj račun") return navigate("/scan");
    if (label === "Dodaj trošak") return navigate("/expense");
    if (label === "Dodaj prihod") return navigate("/income");
    toast(`${label} — uskoro`);
  };

  const loading = settingsLoading || txLoading;

  const hasAnyTransactions = transactions.length > 0;

  // Expenses for the current calendar month — incomes are NEVER part of this.
  const monthlyExpenses = transactions
    .filter((tx) => tx.type === "expense" && isThisMonth(tx.date))
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const budget = settings.monthly_budget ?? 0;
  const hasBudget = budget > 0;

  const goToBudget = () => {
    setBudgetDraft(
      settings.monthly_budget != null ? String(settings.monthly_budget) : "",
    );
    setBudgetOpen(true);
  };

  const saveBudget = async () => {
    const val = parseFloat(budgetDraft.replace(",", "."));
    if (!Number.isFinite(val) || val <= 0) {
      toast.error("Unesi pozitivan iznos.");
      return;
    }
    setSavingBudget(true);
    await update({ monthly_budget: val });
    setSavingBudget(false);
    setBudgetOpen(false);
    toast.success("Budžet spremljen.");
  };

  const renderHero = () => {
    if (hasBudget) {
      const remaining = budget - monthlyExpenses;
      const overspent = remaining < 0;
      const consumedPct = Math.max(
        0,
        Math.min(100, Math.round((monthlyExpenses / budget) * 100)),
      );
      return (
        <div className="mt-8">
          {overspent ? (
            <h1 className="text-[34px] sm:text-4xl font-bold leading-[1.1] tracking-tight text-destructive/80">
              Potrošio/la si
              <br />
              {formatEur(Math.abs(remaining))} € više od plana
            </h1>
          ) : (
            <h1 className="text-[40px] sm:text-5xl font-bold leading-[1.05] tracking-tight text-primary">
              Preostalo ti je
              <br />
              {formatEur(remaining)} €
            </h1>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            od mjesečnog budžeta od {formatEur(budget)} €
          </p>
          <div
            className="mt-4 h-1 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={consumedPct}
            aria-label="Iskorišteno mjesečnog budžeta"
          >
            <div
              className={`h-full ${overspent ? "bg-destructive/70" : "bg-primary"}`}
              style={{ width: `${consumedPct}%` }}
            />
          </div>
        </div>
      );
    }
    // No budget set — show monthly spend only.
    return (
      <div className="mt-8">
        <h1 className="text-[40px] sm:text-5xl font-bold leading-[1.05] tracking-tight text-primary">
          Ovaj mjesec si
          <br />
          potrošio/la {formatEur(monthlyExpenses)} €
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          ukupno svih troškova ovog mjeseca
        </p>
      </div>
    );
  };

  // -------- FULL EMPTY STATE: no budget AND no transactions --------
  if (!loading && !hasBudget && !hasAnyTransactions) {
    return (
      <section className="relative flex-1 flex flex-col px-5 pt-8 pb-6">
        <header className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <button
            ref={profileRef}
            type="button"
            aria-label="Profil"
            onClick={() => navigate("/profil")}
            className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors"
          >
            <User className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        {!settings.budget_banner_dismissed && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-4 flex items-center gap-3 border-l-4 border-l-[hsl(45_95%_55%)]">
            <div className="text-2xl leading-none" aria-hidden>💡</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Postavi mjesečni budžet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Znaj točno koliko ti ostaje do kraja mjeseca.
              </p>
            </div>
            <Button size="sm" onClick={goToBudget}>
              Postavi
            </Button>
            <button
              type="button"
              aria-label="Zatvori"
              onClick={() => update({ budget_banner_dismissed: true })}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex-1 px-4 text-center flex-col flex items-center justify-start">
          <div className="text-6xl mb-6" aria-hidden>​</div>
          <h2 className="text-2xl font-semibold text-foreground text-center">
            {'\n\n'}Još nema troškova.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs whitespace-pre-line">
            Dodaj svoj prvi trošak i počni pratiti gdje ti odlazi novac.
          </p>
          <Button
            size="lg"
            className="mt-8 w-full max-w-sm h-12 rounded-full font-semibold"
            onClick={() => navigate("/expense")}
          >
            {'\n\n'}Dodaj prvi trošak 💸
          </Button>
        </div>

        <FAB fabRef={fabRef} onClick={() => setSheetOpen(true)} />
        <ActionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onAction={handleAction}
        />
        <BudgetDialog
          open={budgetOpen}
          onOpenChange={setBudgetOpen}
          draft={budgetDraft}
          setDraft={setBudgetDraft}
          onSave={saveBudget}
          saving={savingBudget}
        />
      </section>
    );
  }

  const showBanner =
    !loading &&
    !hasBudget &&
    hasAnyTransactions &&
    !settings.budget_banner_dismissed;
  const showEmptyTxBlock = !loading && hasBudget && !hasAnyTransactions;

  return (
    <section className="relative flex-1 flex flex-col px-5 pt-8 pb-6">
      <header className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <button
          ref={profileRef}
          type="button"
          aria-label="Profil"
          onClick={() => navigate("/profil")}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors"
        >
          <User className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      {renderHero()}

      {showBanner && (
        <div className="mt-5 rounded-xl border border-border bg-card p-3 flex items-center gap-3">
          <Lightbulb
            className="h-4 w-4 text-[hsl(45_95%_45%)] shrink-0"
            aria-hidden
          />
          <p className="flex-1 text-xs text-foreground">
            Postavi budžet za bolji uvid u potrošnju
          </p>
          <Button variant="ghost" size="sm" onClick={goToBudget}>
            Postavi
          </Button>
          <button
            type="button"
            aria-label="Zatvori"
            onClick={() => update({ budget_banner_dismissed: true })}
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showEmptyTxBlock ? (
        <div className="flex-1 px-4 text-center flex-col flex items-center justify-start">
          <div className="text-6xl mb-6" aria-hidden>​</div>
          <h2 className="text-2xl font-semibold text-foreground text-center">
            {'\n\n'}Još nema troškova.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs whitespace-pre-line">
            Dodaj svoj prvi trošak i počni pratiti gdje ti odlazi novac.
          </p>
          <Button
            size="lg"
            className="mt-8 w-full max-w-sm h-12 rounded-full font-semibold"
            onClick={() => navigate("/expense")}
          >
            {'\n\n'}Dodaj prvi trošak 💸
          </Button>
        </div>
      ) : (
        <div className="mt-10">
          <h2 className="text-base font-semibold text-foreground">
            Zadnje transakcije
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {transactions.map((tx: Transaction) => {
              const isExpense = tx.type === "expense";
              const Icon: LucideIcon = getCategoryIcon(
                tx.type as "expense" | "income",
                tx.category,
              );
              const signed = isExpense ? -Number(tx.amount) : Number(tx.amount);
              return (
                <li key={tx.id} className="flex items-center gap-3 py-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-secondary flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(tx.date)}
                      {tx.category ? ` · ${tx.category}` : ""}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      isExpense ? "text-expense" : "text-income"
                    }`}
                  >
                    {formatAmount(signed)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <FAB fabRef={fabRef} onClick={() => setSheetOpen(true)} />
      <ActionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAction={handleAction}
      />
      <BudgetDialog
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        draft={budgetDraft}
        setDraft={setBudgetDraft}
        onSave={saveBudget}
        saving={savingBudget}
      />

      {coachOpen && navRefs.analiza && navRefs.profil && (
        <HomeCoachmarks
          onDone={() => {
            setCoachOpen(false);
            update({ coachmarks_dismissed: true });
          }}
          targets={[
            {
              ref: fabRef,
              text: "Ovdje dodaješ novi trošak — brzo i jednostavno.",
            },
            {
              ref: navRefs.analiza,
              text: "Ovdje vidiš pregled svojih troškova i trendove.",
            },
            {
              ref: navRefs.profil,
              text: "U profilu možeš postaviti budžet i osobne postavke.",
            },
          ]}
        />
      )}
    </section>
  );
};

const FAB = ({
  fabRef,
  onClick,
}: {
  fabRef: React.RefObject<HTMLButtonElement>;
  onClick: () => void;
}) => (
  <button
    ref={fabRef}
    type="button"
    aria-label="Dodaj novi unos"
    onClick={onClick}
    className="fixed bottom-24 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    style={{ right: "max(1.25rem, calc(50vw - 220px + 1.25rem))" }}
  >
    <Plus className="h-6 w-6" strokeWidth={2} />
  </button>
);

const ActionSheet = ({
  open,
  onOpenChange,
  onAction,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAction: (label: string) => void;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent
      side="bottom"
      className="rounded-t-2xl border-t border-border max-w-[440px] mx-auto"
    >
      <SheetHeader className="text-left">
        <SheetTitle>Što želiš dodati?</SheetTitle>
        <SheetDescription>
          Brzo, bez razmišljanja — kasnije možeš urediti.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-4 flex flex-col gap-2 pb-4">
        <ActionRow
          label="Dodaj trošak"
          Icon={Receipt}
          onClick={() => onAction("Dodaj trošak")}
        />
        <ActionRow
          label="Dodaj prihod"
          Icon={PlusCircle}
          onClick={() => onAction("Dodaj prihod")}
        />
        <ActionRow
          label="Skeniraj račun"
          Icon={Camera}
          onClick={() => onAction("Skeniraj račun")}
        />
      </div>
    </SheetContent>
  </Sheet>
);

const ActionRow = ({
  label,
  Icon,
  onClick,
}: {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-4 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary">
      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </div>
    <span className="text-sm font-medium text-foreground">{label}</span>
  </button>
);

const BudgetDialog = ({
  open,
  onOpenChange,
  draft,
  setDraft,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: string;
  setDraft: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Mjesečni budžet</DialogTitle>
        <DialogDescription>
          Postavi koliko želiš mjesečno potrošiti.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 pt-2">
        <Label htmlFor="home-budget">Iznos (€)</Label>
        <Input
          id="home-budget"
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
        <Button onClick={onSave} disabled={saving}>
          Spremi
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default Home;
