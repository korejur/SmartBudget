import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import EntryShell from "@/components/EntryShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddTransaction } from "@/hooks/useTransactions";

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};
const parseDateISO = (s: string) => {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return new Date().toISOString().slice(0, 10);
  return `${m[3]}-${m[2]}-${m[1]}`;
};
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Interval = "weekly" | "monthly" | "custom";

type FieldErrors = {
  name?: string;
  amount?: string;
  date?: string;
  customInterval?: string;
};

const IncomeEntry = () => {
  const navigate = useNavigate();
  const addTransaction = useAddTransaction();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [date, setDate] = useState(today());
  const [recurring, setRecurring] = useState(false);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [customInterval, setCustomInterval] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const canSave =
    !saving && name.trim().length > 0 && Number(amount.replace(",", ".")) > 0;

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

  const save = async () => {
    if (saving) return;

    const next: FieldErrors = {};

    if (name.trim().length === 0) {
      next.name = "Upiši naziv prihoda.";
    }

    if (amount.trim() === "") {
      next.amount = "Upiši iznos prihoda.";
    } else if (!Number.isFinite(amountNum) || amountNum <= 0) {
      next.amount = "Iznos mora biti veći od nule.";
    }

    const dateIso = parseDateISO(date);
    if (dateIso > todayIso()) {
      next.date = "Datum ne može biti u budućnosti.";
    }

    if (recurring && interval === "custom" && customInterval.trim().length === 0) {
      next.customInterval = "Opiši interval ponavljanja.";
    }

    if (!currency) setCurrency("EUR");
    const safeCurrency = currency || "EUR";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      await addTransaction.mutateAsync({
        type: "income",
        name: name.trim(),
        amount: amountNum,
        currency: safeCurrency,
        date: dateIso,
        is_recurring: recurring,
        recurring_interval: recurring ? interval : null,
        recurring_interval_custom:
          recurring && interval === "custom"
            ? customInterval.trim() || null
            : null,
      });
      toast("Prihod dodan. Odlično! 💚");
      navigate("/");
    } catch {
      toast.error("Greška pri spremanju.");
      setSaving(false);
    }
  };

  const segBtn = (val: Interval, label: string) => (
    <button
      key={val}
      type="button"
      onClick={() => setInterval(val)}
      className={`flex-1 h-9 text-sm rounded-md transition-colors ${
        interval === val
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-foreground hover:bg-secondary/70"
      }`}
    >
      {label}
    </button>
  );

  return (
    <EntryShell title="Novi prihod.">
      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="inc-name">Naziv prihoda</Label>
          <Input
            id="inc-name"
            placeholder="npr. Plaća, Stipendija, Honorar"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) clearError("name");
            }}
            maxLength={80}
            aria-invalid={!!errors.name}
            className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inc-amount">Iznos</Label>
          <div className="flex gap-2">
            <Input
              id="inc-amount"
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
          <Label htmlFor="inc-date">Datum</Label>
          <Input
            id="inc-date"
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

        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Ponavljajući prihod
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Uključi ako se prihod ponavlja redovito.
              </p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          {recurring && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                {segBtn("weekly", "Tjedno")}
                {segBtn("monthly", "Mjesečno")}
                {segBtn("custom", "Drugi interval")}
              </div>
              {interval === "custom" && (
                <div className="space-y-1.5">
                  <Input
                    placeholder="npr. Svaka 2 tjedna"
                    value={customInterval}
                    onChange={(e) => {
                      setCustomInterval(e.target.value);
                      if (errors.customInterval) clearError("customInterval");
                    }}
                    maxLength={50}
                    aria-invalid={!!errors.customInterval}
                    className={
                      errors.customInterval
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  />
                  {errors.customInterval && (
                    <p className="text-xs text-destructive">
                      {errors.customInterval}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-8 space-y-2">
        <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
          Odustani
        </Button>
        <Button className="w-full" disabled={!canSave} onClick={save}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Spremi prihod
        </Button>
      </div>
    </EntryShell>
  );
};

export default IncomeEntry;
