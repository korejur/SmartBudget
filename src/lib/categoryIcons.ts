import {
  Wallet,
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

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  "🍔 Hrana i piće": Utensils,
  "🚌 Prijevoz": Bus,
  "🎉 Izlasci": Music,
  "🛒 Kupovina": ShoppingBag,
  "🏠 Režije": HomeIcon,
  "💊 Zdravlje": HeartPulse,
  "📱 Pretplate": Smartphone,
  "🛍️ Ostalo": Tag,
};

export const getCategoryIcon = (
  type: "expense" | "income",
  category: string | null,
): LucideIcon => {
  if (type === "income") return Wallet;
  if (category && CATEGORY_ICON_MAP[category]) return CATEGORY_ICON_MAP[category];
  return Tag;
};

// Muted donut palette derived from the SmartBudget primary green.
// 8 distinct, low-saturation tones — no harsh colors.
export const CATEGORY_DONUT_COLORS = [
  "hsl(165 55% 45%)",
  "hsl(190 40% 55%)",
  "hsl(210 35% 60%)",
  "hsl(38 55% 65%)",
  "hsl(15 45% 65%)",
  "hsl(280 25% 65%)",
  "hsl(140 30% 55%)",
  "hsl(45 30% 55%)",
];

export const colorForCategory = (category: string, index: number): string =>
  CATEGORY_DONUT_COLORS[index % CATEGORY_DONUT_COLORS.length];