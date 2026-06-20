import { useEffect, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [setSession, setLoading]);

  return <>{children}</>;
}
