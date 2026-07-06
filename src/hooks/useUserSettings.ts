import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./useAuthUser";

export type UserSettings = {
  monthly_budget: number | null;
  budget_banner_dismissed: boolean;
  ai_categorization_enabled: boolean;
  currency: string;
  onboarding_completed: boolean;
  user_role: string | null;
  coachmarks_dismissed: boolean;
};

const DEFAULTS: UserSettings = {
  monthly_budget: null,
  budget_banner_dismissed: false,
  ai_categorization_enabled: true,
  currency: "EUR",
  onboarding_completed: false,
  user_role: null,
  coachmarks_dismissed: false,
};

export const userSettingsKey = (uid: string | null) => ["user_settings", uid];

export const useUserSettings = () => {
  const { userId } = useAuthUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: userSettingsKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<UserSettings> => {
      if (!userId) return DEFAULTS;
      const { data } = await supabase
        .from("user_settings")
        .select(
          "monthly_budget, budget_banner_dismissed, ai_categorization_enabled, currency, onboarding_completed, user_role, coachmarks_dismissed",
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) {
        await supabase
          .from("user_settings")
          .upsert({ user_id: userId }, { onConflict: "user_id" });
        return DEFAULTS;
      }
      return {
        monthly_budget:
          data.monthly_budget == null ? null : Number(data.monthly_budget),
        budget_banner_dismissed: !!data.budget_banner_dismissed,
        ai_categorization_enabled: data.ai_categorization_enabled ?? true,
        currency: data.currency ?? "EUR",
        onboarding_completed: !!data.onboarding_completed,
        user_role: data.user_role ?? null,
        coachmarks_dismissed: !!data.coachmarks_dismissed,
      };
    },
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (!userId) return;
      const { error } = await supabase
        .from("user_settings")
        .upsert(
          { user_id: userId, ...patch },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: userSettingsKey(userId) });
      const prev = qc.getQueryData<UserSettings>(userSettingsKey(userId));
      qc.setQueryData<UserSettings>(userSettingsKey(userId), {
        ...(prev ?? DEFAULTS),
        ...patch,
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(userSettingsKey(userId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: userSettingsKey(userId) });
    },
  });

  return {
    settings: query.data ?? DEFAULTS,
    loading: query.isLoading,
    update: (patch: Partial<UserSettings>) => mutation.mutateAsync(patch),
    userId,
  };
};

// Re-export for convenience
export { useAuthUser };

// Subscribe to auth changes — reset cache on sign-out
export const useResetOnSignOut = () => {
  const qc = useQueryClient();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") qc.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);
};