import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME } from "@/config/constants";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/welcome")({
  head: () => ({
    meta: [
      { title: `Bem-vindo — ${APP_NAME}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const session = useAuthStore((s) => s.session);
  const tenant = useTenantStore((s) => s.currentTenant);

  const reqQuery = useQuery({
    queryKey: ["my-membership-request", tenant?.id, session?.user.id],
    enabled: !!tenant && !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_requests")
        .select("status")
        .eq("tenant_id", tenant!.id)
        .eq("user_id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pending = reqQuery.data?.status === "pending";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="rounded-2xl glass-strong p-8 text-center shadow-elevated">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {pending ? (
            <Clock className="h-8 w-8 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {pending
            ? "Cadastro recebido!"
            : `Bem-vindo à ${tenant?.name ?? "sua igreja"}!`}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pending
            ? "Seu cadastro está aguardando aprovação de um administrador. Você será notificado assim que for liberado."
            : "Seu acesso já está ativo. Comece explorando o painel."}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {!pending && (
            <Button asChild variant="gold">
              <Link to="/app">
                <Sparkles className="mr-1.5 h-4 w-4" /> Ir para o painel
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/app/profile">Completar meu perfil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
