import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export interface SuperAdminProfile {
  id: string;
  is_super_admin: boolean;
}

/**
 * Lê a flag `is_super_admin` no perfil do usuário logado.
 * Quando `data?.is_super_admin === false`, redirecione para `/app`.
 */
export function useSuperAdmin() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ["super-admin", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<SuperAdminProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, is_super_admin")
        .eq("id", userId)
        .maybeSingle();
      // 42703 = coluna inexistente (migration ainda não aplicada) → trata como não-admin
      if (error && error.code !== "42703") throw error;
      const row = (data ?? null) as { id?: string; is_super_admin?: boolean | null } | null;
      return {
        id: row?.id ?? userId,
        is_super_admin: Boolean(row?.is_super_admin),
      };
    },
  });
}
