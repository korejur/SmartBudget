import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  QrCode,
  Layers,
  X,
  CheckCircle2,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCategories } from "@/hooks/useCategories";
import { useAddTransaction } from "@/hooks/useTransactions";

type Step = "camera" | "processing" | "confirm" | "success" | "error";

type Draft = {
  merchant: string;
  amount: string;
  date: string; // DD.MM.YYYY
  category: string;
  items: { name: string; price: number }[];
};

const todayDDMMYYYY = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
};

const parseDDMMYYYYToISODate = (s: string): string => {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return new Date().toISOString().slice(0, 10);
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
};

type OcrParsed = {
  merchant: string;
  amount: number | null;
  date: string | null; // DD.MM.YYYY
  category: string;
  items: { name: string; price: number }[];
};

const KNOWN_MERCHANTS = [
  "Konzum",
  "Lidl",
  "Plodine",
  "Kaufland",
  "Spar",
  "Interspar",
  "DM",
  "Müller",
  "Tommy",
  "Studenac",
  "KTC",
  "Bipa",
];

const guessCategory = (merchant: string): string => {
  const m = merchant.toLowerCase();
  if (/(dm|müller|muller|bipa)/.test(m)) return "🛍️ Ostalo";
  if (/(konzum|lidl|plodine|kaufland|spar|tommy|studenac|ktc)/.test(m))
    return "🍔 Hrana i piće";
  if (/(ina|petrol|tifon|crodux|omv)/.test(m)) return "🚌 Prijevoz";
  if (/(kava|caffe|caffè|bar|restoran|pizzeria)/.test(m))
    return "🎉 Izlasci";
  return "🛍️ Ostalo";
};

const parseReceiptText = (raw: string): OcrParsed => {
  const text = raw.replace(/\u00A0/g, " ");
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Merchant: known list first, else first uppercase-ish line
  let merchant = "";
  for (const l of lines) {
    const hit = KNOWN_MERCHANTS.find((k) =>
      l.toLowerCase().includes(k.toLowerCase()),
    );
    if (hit) {
      merchant = hit;
      break;
    }
  }
  if (!merchant) {
    const candidate = lines.find((l) => /[A-ZČĆŠĐŽ]{3,}/.test(l));
    merchant = (candidate || lines[0] || "").slice(0, 32);
  }

  // Amount: look for "UKUPNO" / "TOTAL" line, else largest decimal
  let amount: number | null = null;
  const totalLine = lines.find((l) => /ukupno|total|za plati|iznos/i.test(l));
  const numRe = /(\d+[.,]\d{2})/g;
  if (totalLine) {
    const matches = [...totalLine.matchAll(numRe)].map((m) =>
      Number(m[1].replace(",", ".")),
    );
    if (matches.length) amount = Math.max(...matches);
  }
  if (amount == null) {
    const all: number[] = [];
    for (const l of lines)
      for (const m of l.matchAll(numRe))
        all.push(Number(m[1].replace(",", ".")));
    if (all.length) amount = Math.max(...all);
  }

  // Date: DD.MM.YYYY or DD.MM.YY
  let date: string | null = null;
  for (const l of lines) {
    const m = l.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
    if (m) {
      const dd = m[1].padStart(2, "0");
      const mm = m[2].padStart(2, "0");
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      date = `${dd}.${mm}.${yyyy}`;
      break;
    }
  }

  // Items: lines containing a name followed by a decimal price
  const items: { name: string; price: number }[] = [];
  for (const l of lines) {
    if (/ukupno|total|pdv|kartic|gotov|iznos|popust/i.test(l)) continue;
    const m = l.match(/^(.+?)\s+(\d+[.,]\d{2})\s*(?:€|EUR|kn)?\s*$/i);
    if (m) {
      const name = m[1].replace(/\s{2,}/g, " ").trim();
      const price = Number(m[2].replace(",", "."));
      if (name.length >= 2 && price > 0 && price < 1000)
        items.push({ name, price });
    }
    if (items.length >= 20) break;
  }

  return {
    merchant: merchant || "Nepoznato",
    amount,
    date,
    category: guessCategory(merchant),
    items,
  };
};

const ScanReceipt = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("camera");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [batchCount, setBatchCount] = useState(0);
  const [batchMode, setBatchMode] = useState(false);
  const { settings } = useUserSettings();
  const aiOn = settings.ai_categorization_enabled;
  const { data: categories = [] } = useCategories();
  const addTransaction = useAddTransaction();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Start / stop camera based on step
  useEffect(() => {
    let cancelled = false;
    const stop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    if (step === "camera") {
      setCameraError(null);
      const start = async () => {
        try {
          if (!navigator.mediaDevices?.getUserMedia)
            throw new Error("Kamera nije podržana u ovom pregledniku.");
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1440 },
            },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }
        } catch (err) {
          setCameraError(
            err instanceof Error
              ? err.message
              : "Ne mogu pristupiti kameri.",
          );
        }
      };
      start();
    } else {
      stop();
    }
    return () => {
      cancelled = true;
      stop();
    };
  }, [step]);

  const close = () => navigate("/");

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const runOcr = async (imageData?: string) => {
    setStep("processing");
    setOcrProgress(0);
    const image = imageData ?? captureFrame();
    if (!image) {
      setStep("error");
      return;
    }
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(image, "hrv+eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text")
            setOcrProgress(Math.round(m.progress * 100));
        },
      });
      const parsed = parseReceiptText(data.text || "");
      setDraft({
        merchant: parsed.merchant,
        amount: (parsed.amount ?? 0).toFixed(2),
        date: parsed.date ?? todayDDMMYYYY(),
        category: parsed.category,
        items: parsed.items,
      });
      setStep("confirm");
    } catch (e) {
      console.error("OCR failed", e);
      setStep("error");
    }
  };

  const handleCapture = () => {
    if (batchMode) {
      setBatchCount((c) => c + 1);
      toast(`Račun ${batchCount + 1} snimljen`);
      return;
    }
    const frame = captureFrame();
    if (!frame) {
      toast.error("Kamera još nije spremna.");
      return;
    }
    runOcr(frame);
  };

  const handleSave = async () => {
    if (!draft) return;
    const amountNum = Number(draft.amount.replace(",", "."));
    if (!isFinite(amountNum) || amountNum <= 0) {
      toast.error("Unesi ispravan iznos.");
      return;
    }
    try {
      await addTransaction.mutateAsync({
        type: "expense",
        name: draft.merchant.trim() || "Račun",
        amount: Math.abs(amountNum),
        category: draft.category || null,
        date: parseDDMMYYYYToISODate(draft.date),
        place: draft.merchant.trim() || null,
        line_items: draft.items.map((it) => ({
          name: it.name,
          amount: it.price,
        })),
      });
      setStep("success");
    } catch {
      toast.error("Greška pri spremanju.");
    }
  };

  if (step === "camera") {
    return (
      <div
        className="fixed inset-0 z-50 bg-black text-white flex flex-col"
        style={{ height: "100dvh" }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <button
          type="button"
          aria-label="Zatvori"
          onClick={close}
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
          className="absolute left-4 z-10 h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {batchCount > 0 && (
          <div
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
            className="absolute right-5 z-10 text-xs px-3 py-1 rounded-full bg-white/20 backdrop-blur"
          >
            Snimljeno: {batchCount}
          </div>
        )}

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
          {cameraError ? (
            <div className="max-w-xs text-center bg-black/60 backdrop-blur rounded-xl p-4">
              <p className="text-sm">{cameraError}</p>
              <p className="mt-2 text-xs text-white/70">
                Provjeri dopuštenja za kameru u postavkama preglednika.
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/90 mb-4">
              Usmjeri kameru prema računu.
            </p>
          )}
          <div className="relative w-full max-w-[300px] aspect-[3/4] rounded-2xl border-2 border-white/70">
            <span className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <span className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <span className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <span className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-primary rounded-br-2xl" />
          </div>
        </div>

        <div
          className="relative z-10 pt-4 px-8 flex items-end justify-between gap-4"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2.5rem)",
          }}
        >
          <div className="flex flex-col items-center gap-1.5 w-16">
            <button
              type="button"
              aria-label="QR kod"
              onClick={() => toast("QR skener — uskoro")}
              className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <QrCode className="h-5 w-5" />
            </button>
            <span className="text-[11px] text-white/70">QR kod</span>
          </div>

          <button
            type="button"
            aria-label="Snimi račun"
            onClick={handleCapture}
            disabled={!!cameraError}
            className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-xl ring-4 ring-white/30 active:scale-95 transition-transform"
          >
            <Camera className="h-8 w-8 text-black" />
          </button>

          <div className="flex flex-col items-center gap-1.5 w-16">
            <button
              type="button"
              aria-label="Više računa"
              onClick={() => {
                if (batchMode && batchCount > 0) {
                  setBatchMode(false);
                  const frame = captureFrame();
                  runOcr(frame ?? undefined);
                  return;
                }
                setBatchMode((b) => !b);
                if (!batchMode) toast("Način: više računa uključen");
              }}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
                batchMode ? "bg-primary text-primary-foreground" : "bg-white/20 backdrop-blur hover:bg-white/30"
              }`}
            >
              <Layers className="h-5 w-5" />
            </button>
            <span className="text-[11px] text-white/70">
              {batchMode && batchCount > 0 ? "Završi" : "Više računa"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <FullScreen>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="relative h-20 w-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
              <ReceiptIcon className="h-9 w-9 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Obrađujemo tvoj račun…
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            AI prepoznaje iznos, datum i mjesto kupnje. {ocrProgress > 0 ? `${ocrProgress}%` : ""}
          </p>
        </div>
      </FullScreen>
    );
  }

  if (step === "error") {
    return (
      <FullScreen>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <Card className="w-full p-5 text-center">
            <p className="text-base font-semibold text-foreground">
              Nismo uspjeli pročitati račun.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={() => setStep("camera")}>Pokušaj ponovno</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  toast("Ručni unos — uskoro");
                  close();
                }}
              >
                Unesi ručno
              </Button>
            </div>
          </Card>
        </div>
      </FullScreen>
    );
  }

  if (step === "confirm" && draft) {
    return (
      <FullScreen>
        <div className="px-5 pt-8 pb-6 flex-1 flex flex-col">
          <h2 className="text-xl font-semibold text-foreground">
            Potvrdi detalje računa.
          </h2>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="merchant">Mjesto kupnje</Label>
              <Input
                id="merchant"
                value={draft.merchant}
                onChange={(e) =>
                  setDraft({ ...draft, merchant: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Ukupni iznos (€)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                placeholder="DD.MM.GGGG"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>

            {!aiOn && (
              <div className="space-y-1.5">
                <Label>Kategorija</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => setDraft({ ...draft, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {aiOn && (
              <p className="text-xs text-muted-foreground">
                Kategorizaciju ćemo automatski odraditi u pozadini.
              </p>
            )}
          </div>

          <div className="mt-auto pt-8 space-y-2">
            <Button className="w-full" onClick={handleSave}>
              Spremi račun
            </Button>
            <Button variant="ghost" className="w-full" onClick={close}>
              Odustani
            </Button>
          </div>
        </div>
      </FullScreen>
    );
  }

  // success
  return (
    <FullScreen>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center mb-5 animate-in zoom-in duration-500">
          <CheckCircle2 className="h-12 w-12 text-primary" strokeWidth={2} />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Račun spremljen!
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          {aiOn
            ? "Kategorizacija se odvija u pozadini. Obavijestit ćemo te kada završi."
            : "Spremljeno s odabranom kategorijom."}
        </p>
      </div>
      <div className="px-5 pb-6 space-y-2">
        <Button className="w-full" onClick={() => navigate("/")}>
          Natrag na početak
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setDraft(null);
            setBatchCount(0);
            setBatchMode(false);
            setStep("camera");
          }}
        >
          Skeniraj još jedan račun
        </Button>
      </div>
    </FullScreen>
  );
};

const FullScreen = ({ children }: { children: React.ReactNode }) => (
  <div
    className="fixed inset-0 z-50 bg-background flex justify-center overflow-y-auto"
    style={{ height: "100dvh" }}
  >
    <div
      className="relative w-full max-w-[440px] flex flex-col"
      style={{
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {children}
    </div>
  </div>
);

export default ScanReceipt;