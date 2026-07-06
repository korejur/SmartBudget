import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X as XIcon, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import EntryShell from "@/components/EntryShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, useAddCategory } from "@/hooks/useCategories";
import { useAddTransaction, useTransactions } from "@/hooks/useTransactions";
import { useUserSettings } from "@/hooks/useUserSettings";

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};
const parseDateISO = (s: string) => {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return new Date().toISOString().slice(0, 10);
  return `${m[3]}-${m[2]}-${m[1]}`;
};

const ADD_NEW = "__add_new__";
const FALLBACK_CATEGORY = "🛍️ Ostalo";

const isThisMonth = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type FieldErrors = {
  name?: string;
  amount?: string;
  category?: string;
  date?: string;
};

const ExpenseEntry = () => {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const addCategory = useAddCategory();
  const addTransaction = useAddTransaction();
  const { settings } = useUserSettings();
  const { data: existingTx = [] } = useTransactions();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today());
  const [showMore, setShowMore] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [purchaseName, setPurchaseName] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Auto-suggest category from previous expense entries with same name
  const suggestion = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || suggestionDismissed) return null;
    const past = existingTx.find(
      (e) =>
        e.type === "expense" &&
        e.name.trim().toLowerCase() === trimmed &&
        e.category,
    );
    if (!past || past.category === category) return null;
    return past.category!;
  }, [name, category, suggestionDismissed, existingTx]);

  const canSave =
    !saving &&
    name.trim().length > 0 &&
    Number(amount.replace(",", ".")) > 0;

  const amountNum = Number(amount.replace(",", "."));
  const amountWarning =
    amount.trim() !== "" && Number.isFinite(amountNum) && amountNum > 100000
      ? "Iznos izgleda previsok — provjeri jesi li dobro upisao/la."
      : null;

  const clearError = (field: keyof FieldErrors) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const handleCategoryChange = (val: string) => {
    if (val === ADD_NEW) {
      setAddingCustom(true);
      return;
    }
    setCategory(val);
    clearError("category");
  };

  const confirmCustomCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrors((p) => ({ ...p, category: "Odaberi ili upiši kategoriju." }));
      return;
    }
    try {
      await addCategory.mutateAsync(trimmed);
    } catch {
      // duplicate ok
    }
    setCategory(trimmed);
    setAddingCustom(false);
    setNewCatName("");
    clearError("category");
  };

  const cancelCustomCategory = () => {
    setAddingCustom(false);
    setNewCatName("");
    clearError("category");
  };

  const save = async () => {
    if (saving) return;

    const next: FieldErrors = {};

    if (name.trim().length === 0) {
      next.name = "Upiši naziv troška.";
    }

    if (amount.trim() === "") {
      next.amount = "Upiši iznos troška.";
    } else if (!Number.isFinite(amountNum) || amountNum <= 0) {
      next.amount = "Iznos mora biti veći od nule.";
    }

    const dateIso = parseDateISO(date);
    if (dateIso > todayIso()) {
      next.date = "Datum ne može biti u budućnosti.";
    }

    let resolvedCategory = category;
    if (addingCustom) {
      const trimmed = newCatName.trim();
      if (!trimmed) {
        next.category = "Odaberi ili upiši kategoriju.";
      } else {
        try {
          await addCategory.mutateAsync(trimmed);
        } catch {
          // duplicate ok
        }
        resolvedCategory = trimmed;
      }
    } else if (!resolvedCategory) {
      resolvedCategory = FALLBACK_CATEGORY;
    }

    const safeCurrency = currency || "EUR";
    if (!currency) setCurrency("EUR");

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});

    if (addingCustom) {
      setCategory(resolvedCategory);
      setAddingCustom(false);
      setNewCatName("");
    }

    setSaving(true);
    try {
      await addTransaction.mutateAsync({
        type: "expense",
        name: name.trim(),
        amount: amountNum,
        currency: safeCurrency,
        category: resolvedCategory,
        date: dateIso,
        place: merchant.trim() || null,
        purchase_name: purchaseName.trim() || null,
      });

      const budget = settings.monthly_budget;
      if (budget && budget > 0) {
        const monthSum =
          existingTx
            .filter((t) => t.type === "expense" && isThisMonth(t.date))
            .reduce((s, t) => s + Number(t.amount), 0) +
          (isThisMonth(dateIso) ? amountNum : 0);
        const pct = Math.round((monthSum / budget) * 100);
        const cleanCat =
          resolvedCategory.replace(/^[^\p{L}]+/u, "").trim() || resolvedCategory;
        toast(`Ovo je bilo ${pct}% tvog budžeta za ${cleanCat}.`);
      } else {
        toast("Trošak spremljen. 👍");
      }
      navigate("/");
    } catch (e) {
      toast.error("Greška pri spremanju.");
      setSaving(false);
    }
  };

  return (
    <EntryShell title="Novi trošak.">
      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="exp-name">Naziv troška</Label>
          <Input
            id="exp-name"
            placeholder="npr. Kava, Uber, Konzum"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSuggestionDismissed(false);
              if (errors.name) clearError("name");
            }}
            maxLength={80}
            aria-invalid={!!errors.name}
            className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
          {suggestion && (
            <div className="mt-2 flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs text-foreground w-fit">
              <span>Zadnji put: {suggestion} — zadrži?</span>
              <button
                type="button"
                aria-label="Prihvati prijedlog"
                onClick={() => {
                  setCategory(suggestion);
                  setSuggestionDismissed(true);
                }}
                className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="Odbij prijedlog"
                onClick={() => setSuggestionDismissed(true)}
                className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-amount">Iznos</Label>
          <div className="flex gap-2">
            <Input
              id="exp-amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) clearError("amount");
              }}
              maxLength={12}
              className={`flex-1 ${
                errors.amount ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
              aria-invalid={!!errors.amount}
            />
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount}</p>
          )}
          {amountWarning && (
            <p className="text-xs text-yellow-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {amountWarning}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Preračun valuta nije dostupan u ovoj verziji.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Kategorija</Label>
          {addingCustom ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Naziv nove kategorije"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  if (errors.category) clearError("category");
                }}
                maxLength={30}
                className={`flex-1 ${
                  errors.category ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
                aria-invalid={!!errors.category}
              />
              <Button
                type="button"
                onClick={confirmCustomCategory}
                disabled={!newCatName.trim() || addCategory.isPending}
              >
                Dodaj
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Odustani"
                onClick={cancelCustomCategory}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger
                className={
                  errors.category ? "border-destructive focus-visible:ring-destructive" : ""
                }
              >
                <SelectValue placeholder="Odaberi kategoriju" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value={ADD_NEW}>+ Dodaj novu kategoriju</SelectItem>
              </SelectContent>
            </Select>
          )}
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-date">Datum</Label>
          <Input
            id="exp-date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (errors.date) clearError("date");
            }}
            placeholder="DD.MM.GGGG"
            maxLength={10}
            aria-invalid={!!errors.date}
            className={errors.date ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date}</p>
          )}
        </div>

        <div>
          <Button
            type="button"
            variant="ghost"
            className="px-0 text-primary hover:text-primary"
            onClick={() => setShowMore((s) => !s)}
          >
            + Dodaj više detalja
          </Button>
          <div
            className={`grid transition-all duration-300 ${
              showMore ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-merchant">Mjesto kupnje</Label>
                  <Input
                    id="exp-merchant"
                    placeholder="npr. Lidl, Konzum"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-purchase">Ime kupovine</Label>
                  <Input
                    id="exp-purchase"
                    placeholder="npr. Lidl 1, Lidl 2"
                    value={purchaseName}
                    onChange={(e) => setPurchaseName(e.target.value)}
                    maxLength={80}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8 space-y-2">
        <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
          Odustani
        </Button>
        <Button className="w-full" disabled={!canSave} onClick={save}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Spremi trošak
        </Button>
      </div>
    </EntryShell>
  );
};

export default ExpenseEntry;
