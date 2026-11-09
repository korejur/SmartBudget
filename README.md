# SmartBudget 💚

> **Tvoj novac. Tvoj plan. Tvoja kontrola.**

SmartBudget je prototip aplikacije za praćenje osobnih financija, namijenjen mladima (18–30) u Hrvatskoj koji ne znaju puno o budžetiranju. Sučelje je jednostavno, a ton prijateljski i bez osuđivanja.

Projekt je izrađen u sklopu kolegija **[Dizajn korisničkog iskustva i korisničkih sučelja](https://www.fer.unizg.hr/predmet/dkiks)** na Fakultetu elektrotehnike i računarstva u Zagrebu, a prototip je razvijen pomoću alata [Lovable](https://lovable.dev).

## Funkcionalnosti

- Onboarding s Google prijavom i postavljanjem profila
- Pregled mjeseca: potrošeno, preostalo i zadnje transakcije
- Ručni unos troškova i prihoda
- Skeniranje računa kamerom (OCR)
- Analiza potrošnje po kategorijama
- Mjesečni budžet i upravljanje kategorijama

## Tehnologije

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase, Recharts, Tesseract.js

## Pokretanje

```bash
npm install
npm run dev
```

Za rad je potrebna `.env` datoteka s podacima Supabase projekta (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
