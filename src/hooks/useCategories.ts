import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./useAuthUser";

export type Category = {
  id: string;
  name: string;
  icon: string;
  is_default: boolean;
  is_hidden: boolean;
};

export const categoriesKey = (uid: string | null) => ["categories", uid];

export const useCategories = () => {
  const { userId } = useAuthUser();
  return useQuery({
    queryKey: categoriesKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Category[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon, is_default, is_hidden")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });
};

export const useAddCategory = () => {
  const { userId } = useAuthUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Category> => {
      if (!userId) throw new Error("Not authenticated");
      const trimmed = name.trim();
      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: userId,
          name: trimmed,
          icon: "",
          is_default: false,
        })
        .select("id, name, icon, is_default, is_hidden")
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesKey(userId) });
    },
  });
};

export const useRenameCategory = () => {
  const { userId } = useAuthUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Ime ne smije biti prazno");
      const { error } = await supabase
        .from("categories")
        .update({ name: trimmed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesKey(userId) });
    },
  });
};

export const useDeleteCategory = () => {
  const { userId } = useAuthUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesKey(userId) });
    },
  });
};

export const useToggleHideCategory = () => {
  const { userId } = useAuthUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_hidden: hidden })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesKey(userId) });
    },
  });
};