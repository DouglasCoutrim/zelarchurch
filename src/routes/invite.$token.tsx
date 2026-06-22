import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";

import { APP_NAME } from "@/config/constants";
import { supabase, initializeTenantSession } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import logoAsset from "@/assets/logo-zelar.svg.asset.json";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: `Convite — ${APP_NAME}` },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: InviteAcceptPage,
});

type InviteDetails = {
  tenant_id: string;
  tenant_name: string;
  tenant_logo: string | null;
  tenant_city: string | null;
  tenant_uf: string | null;
  status: string;
  expires_at: string;
  max_uses: number;
  current_uses: number;
};

function InviteAcceptPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);

  const inviteQuery = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invitation_by_token", {
        p_token: token,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as InviteDetails | null;
    },
  });

  const invite = inviteQuery.data;
  const isExpired =
    invite &&
    (invite.status !== "pending" ||
      new Date(invite.expires_at) <= new Date() ||
      invite.current_uses >= invite.max_uses);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se já estiver logado, aceita imediatamente
  useEffect(() => {
    if (!session || !invite || isExpired) return;
    (async () => {
      try {
        await supabase.rpc("accept_invitation", { p_token: token });
        await initializeTenantSession(invite.tenant_id);
        useTenantStore.getState().setCurrentTenant({
          id: invite.tenant_id,
          name: invite.tenant_name,
          slug: "",
          plan_id: null,
          created_at: new Date().toISOString(),
        });
        navigate({ to: "/app", replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao aceitar convite");
      }
    })();
  }, [session, invite, isExpired, token, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/invite/${token}`,
          data: { full_name: fullName },
        },
      });
      if (signUpErr) {
        const msg = signUpErr.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered")) {
          throw new Error(
            "Este e-mail já está cadastrado. Faça login e abra o link novamente.",
          );
        }
        throw signUpErr;
      }
      if (!signUp.session) {
        throw new Error(
          "Confirme seu e-mail antes de continuar. Verifique sua caixa de entrada.",
        );
      }

      const { error: acceptErr } = await supabase.rpc("accept_invitation", {
        p_token: token,
      });
      if (acceptErr) throw acceptErr;

      // Cria registro de membro caso o convite não estivesse vinculado a um member
      await supabase.rpc("public_join_tenant", {
        p_tenant_id: invite.tenant_id,
        p_full_name: fullName,
        p_phone: null,
      });

      await initializeTenantSession(invite.tenant_id);
      useTenantStore.getState().setCurrentTenant({
        id: invite.tenant_id,
        name: invite.tenant_name,
        slug: "",
        plan_id: null,
        created_at: new Date().toISOString(),
      });

      navigate({ to: "/app", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no cadastro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen gradient-mesh px-4 py-10">
      <div className="pointer-events-none absolute -top-32 left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-gold/10 blur-3xl" />

      <div className="relative mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-center">
          <Link to="/" aria-label={APP_NAME}>
            <img src={logoAsset.url} alt={APP_NAME} className="h-12 w-auto" />
          </Link>
        </header>

        <section className="rounded-2xl glass-strong p-6 shadow-elevated">
          {inviteQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando convite...
            </div>
          ) : !invite ? (
            <ExpiredState message="Convite não encontrado." />
          ) : isExpired ? (
            <ExpiredState message="Este convite expirou ou já foi utilizado." />
          ) : (
            <>
              <div className="mb-5 flex items-center gap-3">
                {invite.tenant_logo ? (
                  <img
                    src={invite.tenant_logo}
                    alt={invite.tenant_name}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Você foi convidado para
                  </p>
                  <h1 className="text-xl font-bold leading-tight">
                    {invite.tenant_name}
                  </h1>
                  {invite.tenant_city && (
                    <p className="text-xs text-muted-foreground">
                      {invite.tenant_city}/{invite.tenant_uf}
                    </p>
                  )}
                </div>
              </div>

              {session ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Aceitando convite...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertTitle>Não foi possível concluir</AlertTitle>
                      <AlertDescription>
                        {error}{" "}
                        {error.toLowerCase().includes("já está cadastrado") && (
                          <Link to="/auth" className="font-medium underline">
                            Ir para o login
                          </Link>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    variant="gold"
                    size="lg"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Criando conta..." : "Aceitar convite"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Já tem conta?{" "}
                    <Link
                      to="/auth"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Entrar
                    </Link>
                  </p>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ExpiredState({ message }: { message: string }) {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-bold">Convite indisponível</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">
        Peça à pessoa que enviou para gerar um novo link.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild variant="outline">
          <Link to="/onboarding">Encontrar minha igreja</Link>
        </Button>
        <Button asChild variant="gold">
          <Link to="/auth">Fazer login</Link>
        </Button>
      </div>
    </div>
  );
}
