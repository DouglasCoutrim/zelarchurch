import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import QRCode from "qrcode";

import { APP_NAME } from "@/config/constants";
import { supabase, initializeTenantSession } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import logoAsset from "@/assets/logo-zelar.svg.asset.json";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: `Entrar na igreja — ${APP_NAME}` },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: JoinByCodePage,
});

type CodeDetails = {
  tenant_id: string;
  tenant_name: string;
  tenant_logo: string | null;
  tenant_city: string | null;
  tenant_uf: string | null;
  requires_approval: boolean;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
};

function JoinByCodePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const codeQuery = useQuery({
    queryKey: ["access-code", code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_access_code_by_code", {
        p_code: code,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as CodeDetails | null;
    },
  });

  const info = codeQuery.data;
  const invalid =
    info &&
    (!info.is_active ||
      (info.expires_at && new Date(info.expires_at) <= new Date()) ||
      (info.max_uses != null && info.current_uses >= info.max_uses));

  // Mini QR para o próprio código (útil para imprimir)
  useEffect(() => {
    if (qrRef.current && info && !invalid) {
      QRCode.toCanvas(qrRef.current, `${window.location.origin}/join/${code}`, {
        width: 96,
        margin: 1,
      });
    }
  }, [code, info, invalid]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finalize(tenantId: string, tenantName: string) {
    await initializeTenantSession(tenantId);
    useTenantStore.getState().setCurrentTenant({
      id: tenantId,
      name: tenantName,
      slug: "",
      plan_id: null,
      created_at: new Date().toISOString(),
    });
    navigate({ to: "/app/welcome", replace: true });
  }

  // Se já está logado, resgata direto
  useEffect(() => {
    if (!session || !info || invalid) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("redeem_access_code", {
          p_code: code,
          p_full_name: session.user.user_metadata?.full_name ?? session.user.email ?? "",
          p_phone: null,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        await finalize(row.tenant_id, info.tenant_name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao resgatar código");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, info, invalid]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/join/${code}`,
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
          "Confirme seu e-mail antes de continuar. Depois abra novamente este link.",
        );
      }

      const { data, error: rErr } = await supabase.rpc("redeem_access_code", {
        p_code: code,
        p_full_name: fullName,
        p_phone: phone || null,
      });
      if (rErr) throw rErr;
      const row = Array.isArray(data) ? data[0] : data;
      await finalize(row.tenant_id, info.tenant_name);
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
        <header className="mb-6 flex justify-center">
          <Link to="/" aria-label={APP_NAME}>
            <img src={logoAsset.url} alt={APP_NAME} className="h-12 w-auto" />
          </Link>
        </header>

        <section className="rounded-2xl glass-strong p-6 shadow-elevated">
          {codeQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando código...
            </div>
          ) : !info ? (
            <Invalid message={`Código “${code}” não encontrado.`} />
          ) : invalid ? (
            <Invalid message="Este código de acesso não está mais disponível." />
          ) : (
            <>
              <div className="mb-5 flex items-center gap-3">
                {info.tenant_logo ? (
                  <img
                    src={info.tenant_logo}
                    alt={info.tenant_name}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Código <strong className="font-mono">{code}</strong>
                  </p>
                  <h1 className="text-xl font-bold leading-tight">
                    {info.tenant_name}
                  </h1>
                  {info.tenant_city && (
                    <p className="text-xs text-muted-foreground">
                      {info.tenant_city}/{info.tenant_uf}
                    </p>
                  )}
                </div>
                <canvas ref={qrRef} className="hidden sm:block rounded-md bg-white" />
              </div>

              {info.requires_approval && (
                <Alert className="mb-4">
                  <AlertDescription className="text-xs">
                    Esta igreja exige aprovação do administrador antes de
                    liberar o acesso.
                  </AlertDescription>
                </Alert>
              )}

              {session ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Vinculando sua conta...
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
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone (opcional)</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
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
                    {submitting
                      ? "Criando conta..."
                      : info.requires_approval
                        ? "Solicitar acesso"
                        : "Entrar na igreja"}
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

function Invalid({ message }: { message: string }) {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-bold">Código indisponível</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild variant="outline">
          <Link to="/onboarding">Buscar minha igreja</Link>
        </Button>
        <Button asChild variant="gold">
          <Link to="/auth">Fazer login</Link>
        </Button>
      </div>
    </div>
  );
}
