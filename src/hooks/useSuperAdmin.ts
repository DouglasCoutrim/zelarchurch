import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export interface SuperAdminProfile {
  id: string;
  is_super_admin: boolean;
  name: string | null;
  email: string | null;
}

/**
 * Lê a flag `is_super_admin` no perfil do usuário logado.
 * Retorna `{ data, isLoading }` — quando carregar e `data?.is_super_admin`
 * for `false`, redirecione o usuário para `/app`.
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
        .select("id, is_super_admin, full_name, email")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        if (error.code === "42703") return { id: userId, is_super_admin: false, name: null, email: null };
        throw error;
      }
      const row = data as { id: string; is_super_admin?: boolean | null; full_name?: string | null; email?: string | null } | null;
      return {
        id: row?.id ?? userId,
        is_super_admin: Boolean(row?.is_super_admin),
        name: row?.full_name ?? null,
        email: row?.email ?? null,
      };
    },
  });
}
