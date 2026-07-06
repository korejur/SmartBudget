import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./useAuthUser";

export type Transaction = {
  id: string;
  user_id: string;
  type: "expense" | "income";
  name: string;
  amount: number;
  currency: string;
  category: string | null;
  date: string; // ISO date YYYY-MM-DD
  place: string | null;
  purchase_name: string | null;
  is_recurring: boolean;
  recurring_interval: "weekly" | "monthly" | "custom" | null;
  recurring_interval_custom: string | null;
  created_at: string;
};

export type NewTransaction = {
  type: "expense" | "income";
  name: string;
  amount: number;
  currency?: string;
  category?: string | null;
  date?: string; // YYYY-MM-DD
  place?: string | null;
  purchase_name?: string | null;
  is_recurring?: boolean;
  recurring_interval?: "weekly" | "monthly" | "custom" | null;
  recurring_interval_custom?: string | null;
  line_items?: { name: string; amount: number; category?: string | null }[];
};

export const transactionsKey = (uid: string | null) => ["transactions", uid];

export const useTransactions = () => {
  const { userId } = useAuthUser();
  return useQuery({
    queryKey: transactionsKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Transaction[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        amount: Number(r.amount),
      })) as Transaction[];
    },
  });
};

export const useAddTransaction = () => {
  const { userId } = useAuthUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: NewTransaction): Promise<Transaction> => {
      if (!userId) throw new Error("Not authenticated");
      const { line_items, ...rest } = t;
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          type: rest.type,
          name: rest.name,
          amount: rest.amount,
          currency: rest.currency ?? "EUR",
          category: rest.category ?? null,
          date: rest.date ?? new Date().toISOString().slice(0, 10),
          place: rest.place ?? null,
          purchase_name: rest.purchase_name ?? null,
          is_recurring: rest.is_recurring ?? false,
          recurring_interval: rest.recurring_interval ?? null,
          recurring_interval_custom: rest.recurring_interval_custom ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (line_items && line_items.length > 0) {
        await supabase.from("receipt_line_items").insert(
          line_items.map((li) => ({
            user_id: userId,
            transaction_id: data.id,
            name: li.name,
            amount: li.amount,
            category: li.category ?? null,
          })),
        );
      }
      return { ...data, amount: Number(data.amount) } as Transaction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionsKey(userId) });
    },
  });
};