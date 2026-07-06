import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Trash2,
  PieChart as PieIcon,
  BarChart3,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import {
  useCategoryBudgets,
  useDeleteCategoryBudget,
  useUpsertCategoryBudget,
  type CategoryBudget,
} from "@/hooks/useCategoryBudgets";
import {
  CATEGORY_DONUT_COLORS,
  getCategoryIcon,
} from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "siječanj",
  "veljača",
  "ožujak",
  "travanj",
  "svibanj",
  "lipanj",
  "srpanj",
  "kolovoz",
  "rujan",
  "listopad",
  "studeni",
  "prosinac",
];

const MONTH_NAMES_SHORT = [
  "sij",
  "vlj",
  "ožu",
  "tra",
  "svi",
  "lip",
  "srp",
  "kol",
  "ruj",
  "lis",
  "stu",
  "pro",
];

const formatEur = (value: number) =>
  value.toLocaleString("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatEurInt = (value: number) =>
  value.toLocaleString("hr-HR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const ymKey = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

const inMonth = (iso: string, year: number, month: number) => {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
};

type ViewState =
  | { kind: "summary" }
  | { kind: "category"; category: string };

const Analiza = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<ViewState>({ kind: "summary" });

  const { data: transactions = [], isLoading } = useTransactions();
  const { data: budgets = [] } = useCategoryBudgets();

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const goPrev = () => {
    setView({ kind: "summary" });
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (isCurrentMonth) return;
    setView({ kind: "summary" });
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

  const monthlyTx = useMemo(
    () => transactions.filter((t) => inMonth(t.date, year, month)),
    [transactions, year, month],
  );
  const monthlyExpenses = monthlyTx.filter((t) => t.type === "expense");
  const totalExpenses = monthlyExpenses.reduce(
    (s, t) => s + Number(t.amount),
    0,
  );

  // Per-category aggregation
  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const t of monthlyExpenses) {
      const key = t.category ?? "🛍️ Ostalo";
      const cur = map.get(key) ?? { name: key, total: 0 };
      cur.total += Number(t.amount);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [monthlyExpenses]);

  const budgetByCategory = useMemo(() => {
    const m = new Map<string, CategoryBudget>();
    for (const b of budgets) m.set(b.category_name, b);
    return m;
  }, [budgets]);

  const hasAnyTransactions = transactions.length > 0;

  if (!isLoading && !hasAnyTransactions) {
    return (
      <section className="flex-1 flex flex-col px-5 pt-10 pb-6">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-5">
            <PieIcon
              className="h-7 w-7 text-muted-foreground"
              strokeWidth={1.75}
            />
          </div>
          <p className="text-foreground font-semibold text-2xl">
            Još nema podataka za prikaz.
          </p>
          <Button
            size="lg"
            className="mt-8 h-12 rounded-full font-semibold w-full max-w-sm"
            onClick={() => navigate("/expense")}
          >
            Dodaj prvi trošak 💸
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col px-5 pt-10 pb-6">
      <Header />

      {view.kind === "summary" ? (
        <>
          <MonthSelector
            label={`${MONTH_NAMES[month]} ${year}`}
            onPrev={goPrev}
            onNext={goNext}
            disableNext={isCurrentMonth}
          />

          <Tabs defaultValue="troskovi" className="mt-5 flex-1 flex flex-col">
            <TabsList className="grid grid-cols-2 w-full h-11 rounded-full bg-secondary p-1">
              <TabsTrigger
                value="troskovi"
                className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm"
              >
                Troškovi
              </TabsTrigger>
              <TabsTrigger
                value="usporedba"
                className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm"
              >
                Prihodi vs. troškovi
              </TabsTrigger>
            </TabsList>

            <TabsContent value="troskovi" className="mt-6 flex-1">
              <TroskoviTab
                year={year}
                month={month}
                byCategory={byCategory}
                total={totalExpenses}
                budgetByCategory={budgetByCategory}
                onPickCategory={(c) => setView({ kind: "category", category: c })}
              />
            </TabsContent>

            <TabsContent value="usporedba" className="mt-6 flex-1">
              <UsporedbaTab
                transactions={transactions}
                year={year}
                month={month}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <CategoryDetail
          category={view.category}
          year={year}
          month={month}
          transactions={monthlyTx}
          budget={budgetByCategory.get(view.category) ?? null}
          onBack={() => setView({ kind: "summary" })}
        />
      )}
    </section>
  );
};

// ---------------- Sub-components ----------------

const Header = () => (
  <header className="mb-2">
    <h1 className="text-2xl font-semibold text-foreground">Analiza</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      Pregled tvojih navika potrošnje.
    </p>
  </header>
);

const MonthSelector = ({
  label,
  onPrev,
  onNext,
  disableNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disableNext: boolean;
}) => (
  <div className="mt-6 flex items-center justify-between">
    <button
      type="button"
      aria-label="Prethodni mjesec"
      onClick={onPrev}
      className="h-9 w-9 rounded-full bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/70"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2} />
    </button>
    <p className="text-base font-semibold text-foreground capitalize">
      {label}
    </p>
    <button
      type="button"
      aria-label="Sljedeći mjesec"
      onClick={onNext}
      disabled={disableNext}
      className="h-9 w-9 rounded-full bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/70 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <ChevronRight className="h-5 w-5" strokeWidth={2} />
    </button>
  </div>
);

const TroskoviTab = ({
  year,
  month,
  byCategory,
  total,
  budgetByCategory,
  onPickCategory,
}: {
  year: number;
  month: number;
  byCategory: { name: string; total: number }[];
  total: number;
  budgetByCategory: Map<string, CategoryBudget>;
  onPickCategory: (c: string) => void;
}) => {
  if (byCategory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mb-4">
          <PieIcon
            className="h-6 w-6 text-muted-foreground"
            strokeWidth={1.75}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Nema troškova za ovaj mjesec.
        </p>
      </div>
    );
  }

  const chartData = byCategory.map((c) => ({
    name: c.name,
    value: c.total,
  }));

  return (
    <div>
      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={68}
              outerRadius={96}
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CATEGORY_DONUT_COLORS[i % CATEGORY_DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [`${formatEur(v)} €`, ""]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                fontSize: 12,
              }}
              labelStyle={{ display: "none" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatEurInt(total)} €
          </p>
          <p className="text-xs text-muted-foreground mt-1">ukupno</p>
        </div>
      </div>

      <ul className="mt-6 flex flex-col gap-2.5 pb-6">
        {byCategory.map((c, i) => {
          const Icon: LucideIcon = getCategoryIcon("expense", c.name);
          const budget = budgetByCategory.get(c.name);
          const color =
            CATEGORY_DONUT_COLORS[i % CATEGORY_DONUT_COLORS.length];
          return (
            <li key={c.name}>
              <button
                type="button"
                onClick={() => onPickCategory(c.name)}
                className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center"
                    style={{ background: `${color}22`, color }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <p className="flex-1 text-sm font-semibold text-foreground truncate">
                    {c.name}
                  </p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {formatEur(c.total)} €
                  </p>
                </div>
                {budget ? (
                  <CategoryProgress
                    spent={c.total}
                    budget={budget.monthly_budget}
                  />
                ) : (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Nema budžeta</p>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const CategoryProgress = ({
  spent,
  budget,
}: {
  spent: number;
  budget: number;
}) => {
  const over = spent > budget;
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  return (
    <div className="mt-3">
      <div
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className={cn("h-full", over ? "bg-destructive/70" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-xs",
          over ? "text-destructive/80" : "text-muted-foreground",
        )}
      >
        {over
          ? `Prešao/la si budžet za ${formatEur(spent - budget)} €`
          : `${formatEur(spent)} € od ${formatEur(budget)} €`}
      </p>
    </div>
  );
};

// ---------------- Category detail ----------------

const CategoryDetail = ({
  category,
  year,
  month,
  transactions,
  budget,
  onBack,
}: {
  category: string;
  year: number;
  month: number;
  transactions: Transaction[];
  budget: CategoryBudget | null;
  onBack: () => void;
}) => {
  const Icon: LucideIcon = getCategoryIcon("expense", category);
  const upsert = useUpsertCategoryBudget();
  const remove = useDeleteCategoryBudget();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState("");

  const txInCat = transactions
    .filter((t) => t.type === "expense" && (t.category ?? "🛍️ Ostalo") === category)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const spent = txInCat.reduce((s, t) => s + Number(t.amount), 0);

  const openCreate = () => {
    setDraft("");
    setDrawerOpen(true);
  };
  const openEdit = () => {
    setDraft(budget ? String(budget.monthly_budget) : "");
    setDrawerOpen(true);
  };

  const save = async () => {
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Unesi iznos veći od 0.");
      return;
    }
    try {
      await upsert.mutateAsync({
        category_name: category,
        monthly_budget: value,
      });
      setDrawerOpen(false);
      toast.success("Budžet spremljen.");
    } catch {
      toast.error("Spremanje nije uspjelo.");
    }
  };

  const doDelete = async () => {
    try {
      await remove.mutateAsync(category);
      setConfirmDelete(false);
      toast.success("Budžet uklonjen.");
    } catch {
      toast.error("Uklanjanje nije uspjelo.");
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          aria-label="Natrag"
          onClick={onBack}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-primary">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {category}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {MONTH_NAMES[month]} {year}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {budget ? (
          <>
            <p className="text-xs text-muted-foreground">Preostalo</p>
            <h2
              className={cn(
                "mt-1 text-4xl font-bold tracking-tight tabular-nums",
                spent > budget.monthly_budget
                  ? "text-destructive/80"
                  : "text-primary",
              )}
            >
              {formatEur(Math.max(0, budget.monthly_budget - spent))} €
            </h2>
            <CategoryProgress spent={spent} budget={budget.monthly_budget} />
            <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm text-foreground">
                Budžet:{" "}
                <span className="font-semibold tabular-nums">
                  {formatEur(budget.monthly_budget)} €
                </span>{" "}
                <span className="text-muted-foreground">mjesečno</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Uredi budžet"
                  onClick={openEdit}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Ukloni budžet"
                  onClick={() => setConfirmDelete(true)}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Potrošeno ovaj mjesec</p>
            <h2 className="mt-1 text-4xl font-bold tracking-tight tabular-nums text-foreground">
              {formatEur(spent)} €
            </h2>
            <Button
              variant="outline"
              size="lg"
              onClick={openCreate}
              className="mt-5 w-full h-12 rounded-full"
            >
              <Plus className="h-4 w-4" />
              Postavi budžet za ovu kategoriju
            </Button>
          </>
        )}
      </div>

      <div className="mt-8 flex-1 pb-6">
        <h3 className="text-sm font-semibold text-foreground">Transakcije</h3>
        {txInCat.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nema transakcija u ovoj kategoriji ovog mjeseca.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {txInCat.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("hr-HR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-sm font-semibold text-expense tabular-nums">
                  -{formatEur(Number(t.amount))} €
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-w-[440px] mx-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>Mjesečni budžet</DrawerTitle>
            <DrawerDescription>
              Postavi koliko želiš mjesečno trošiti na ovu kategoriju.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <label className="text-xs text-muted-foreground">
              Mjesečni budžet (€)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="mt-1.5 h-12 text-base"
              placeholder="npr. 150"
            />
          </div>
          <DrawerFooter>
            <Button
              onClick={save}
              disabled={upsert.isPending}
              className="h-12 rounded-full font-semibold"
            >
              Spremi
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDrawerOpen(false)}
              className="h-12 rounded-full"
            >
              Odustani
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ukloniti budžet za {category}?</AlertDialogTitle>
            <AlertDialogDescription>
              Možeš ga ponovno postaviti u bilo kojem trenutku.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ukloni
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ---------------- Income vs Expenses ----------------

const UsporedbaTab = ({
  transactions,
  year,
  month,
}: {
  transactions: Transaction[];
  year: number;
  month: number;
}) => {
  const months = useMemo(() => {
    const arr: { y: number; m: number; key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      arr.push({
        y: d.getFullYear(),
        m: d.getMonth(),
        key: ymKey(d.getFullYear(), d.getMonth()),
        label: MONTH_NAMES_SHORT[d.getMonth()],
      });
    }
    return arr;
  }, [year, month]);

  const data = useMemo(() => {
    const by: Record<string, { income: number; expense: number }> = {};
    for (const m of months) by[m.key] = { income: 0, expense: 0 };
    for (const t of transactions) {
      const d = new Date(t.date);
      const k = ymKey(d.getFullYear(), d.getMonth());
      if (!by[k]) continue;
      if (t.type === "income") by[k].income += Number(t.amount);
      else by[k].expense += Number(t.amount);
    }
    return months.map((m) => ({
      label: m.label,
      key: m.key,
      income: by[m.key].income,
      expense: by[m.key].expense,
      total: by[m.key].income + by[m.key].expense,
    }));
  }, [months, transactions]);

  const selectedKey = ymKey(year, month);
  const sel = data.find((d) => d.key === selectedKey)!;
  const diff = sel.income - sel.expense;
  const positive = diff >= 0;

  const incomeColor = "hsl(165 100% 36%)";
  const expenseColor = "hsl(4 70% 58% / 0.65)";

  const monthHasData = data.some((d) => d.total > 0);

  return (
    <div>
      <div className="h-64 w-full">
        {!monthHasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <BarChart3
              className="h-7 w-7 text-muted-foreground mb-3"
              strokeWidth={1.75}
            />
            <p className="text-sm text-muted-foreground">
              Nema podataka za ovo razdoblje.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
              barCategoryGap={"25%"}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(v: number, name: string) => [
                  `${formatEur(v)} €`,
                  name === "income" ? "Prihodi" : "Troškovi",
                ]}
                labelStyle={{ display: "none" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="income" stackId="a" fill={incomeColor} radius={[0, 0, 0, 0]} />
              <Bar dataKey="expense" stackId="a" fill={expenseColor} radius={[6, 6, 0, 0]}>
                <LabelList
                  dataKey="total"
                  position="top"
                  formatter={(v: number) =>
                    v > 0 ? `${formatEurInt(v)} €` : "—"
                  }
                  style={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <Row label="Prihodi" value={sel.income} colorClass="text-income" />
        <div className="mt-3" />
        <Row label="Troškovi" value={sel.expense} colorClass="text-expense" />
        <div className="my-3 border-t border-border" />
        <Row
          label="Razlika"
          value={Math.abs(diff)}
          prefix={positive ? "+" : "-"}
          colorClass={positive ? "text-income" : "text-expense"}
          bold
        />
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  prefix,
  colorClass,
  bold,
}: {
  label: string;
  value: number;
  prefix?: string;
  colorClass: string;
  bold?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <p
      className={cn(
        "text-sm",
        bold ? "font-semibold text-foreground" : "text-foreground",
      )}
    >
      {label}
    </p>
    <p
      className={cn(
        "text-sm tabular-nums",
        bold ? "font-bold" : "font-semibold",
        colorClass,
      )}
    >
      {prefix ?? ""}
      {formatEur(value)} €
    </p>
  </div>
);

export default Analiza;
