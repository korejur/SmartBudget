import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./useAuthUser";

export type CategoryBudget = {
  id: string;
  user_id: string;
  category_name: string;
  monthly_budget: number;
};

export const categoryBudgetsKey = (uid: string | null) => [
  "category_budgets",
  uid,
];

export const useCategoryBudgets = () => {
  const { userId } = useAuthUser();
  return useQuery({
    queryKey: categoryBudgetsKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<CategoryBudget[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("category_budgets")
        .select("id, user_id, category_name, monthly_budget")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        monthly_budget: Number(r.monthly_budget),
      })) as CategoryBudget[];
    },
  });
};

export const useUpsertCategoryBudget = () => {
  const { userId } = useAuthUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category_name: string;
      monthly_budget: number;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("category_budgets").upsert(
        {
          user_id: userId,
          category_name: input.category_name,
          monthly_budget: input.monthly_budget,
        },
        { onConflict: "user_id,category_name" },
      );
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: categoryBudgetsKey(userId) }),
  });
};

export const useDeleteCategoryBudget = () => {
  const { userId } = useAuthUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (category_name: string) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("category_budgets")
        .delete()
        .eq("user_id", userId)
        .eq("category_name", category_name);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: categoryBudgetsKey(userId) }),
  });
};