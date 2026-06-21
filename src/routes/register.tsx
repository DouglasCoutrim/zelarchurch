import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { APP_NAME } from "@/config/constants";
import { fetchActivePlans, formatBRL } from "@/lib/plans";
import { supabase, initializeTenantSession } from "@/integrations/supabase/client";
import { useTenantStore } from "@/stores/tenantStore";

const searchSchema = z.object({
  plan: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: `Cadastrar igreja — ${APP_NAME}` },
      {
        name: "description",
        content: "Crie a conta da sua igreja no Zelar e comece grátis por 14 dias.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { plan: planParam } = Route.useSearch();
  const { data: plans } = useQuery({ queryKey: ["plans", "public"], queryFn: fetchActivePlans });

  const [form, setForm] = useState({
    pastor_name: "",
    email: "",
    password: "",
    church_name: "",
    cnpj: "",
    phone: "",
    city: "",
    state: "",
    plan_slug: planParam ?? "plus",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planParam && plans?.some((p) => p.slug === planParam)) {
      setForm((f) => ({ ...f, plan_slug: planParam }));
    }
  }, [planParam, plans]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // 1. Cria o usuário
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (signUpErr) throw signUpErr;
      if (!signUp.session) {
        throw new Error(
          "Confirme seu e-mail antes de continuar. Verifique sua caixa de entrada.",
        );
      }

      // 2. Cria a igreja + cargos + plano de contas via RPC atômica
      const { data: tenant, error: rpcErr } = await supabase.rpc("create_tenant_with_setup", {
        p_church_name: form.church_name,
        p_cnpj: form.cnpj || null,
        p_email: form.email,
        p_phone: form.phone || null,
        p_city: form.city || null,
        p_state: form.state || null,
        p_plan_slug: form.plan_slug,
        p_pastor_name: form.pastor_name,
      });
      if (rpcErr) throw rpcErr;

      // 3. Ativa o tenant na sessão
      const t = Array.isArray(tenant) ? tenant[0] : tenant;
      if (t?.id) {
        await initializeTenantSession(t.id);
        useTenantStore.getState().setCurrentTenant(t);
      }
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no cadastro");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPlan = plans?.find((p) => p.slug === form.plan_slug);

  return (
    <div className="relative min-h-screen gradient-mesh px-4 py-10">
      <div className="pointer-events-none absolute -top-32 left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-gold/10 blur-3xl" />

      <div className="relative mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between text-sm">
          <Link to="/" className="text-muted-foreground transition-colors hover:text-primary">
            ← Voltar
          </Link>
          <Link to="/pricing" className="text-muted-foreground transition-colors hover:text-primary">
            Ver planos
          </Link>
        </div>

        <div className="rounded-2xl glass-strong p-8 shadow-elevated page-enter">
          <div className="mb-6 space-y-1">
            <span className="inline-block rounded-full bg-brand-gold/15 px-3 py-1 text-xs font-medium text-brand-gold">
              14 dias grátis
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              Cadastrar sua igreja no <span className="text-gradient-navy">{APP_NAME}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Você poderá trocar de plano a qualquer momento.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sua conta
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Seu nome" id="pastor_name" required
                  value={form.pastor_name} onChange={(v) => update("pastor_name", v)} />
                <Field label="E-mail" id="email" type="email" required autoComplete="email"
                  value={form.email} onChange={(v) => update("email", v)} />
              </div>
              <Field label="Senha" id="password" type="password" required minLength={6}
                autoComplete="new-password" value={form.password}
                onChange={(v) => update("password", v)} />
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sua igreja
              </h3>
              <Field label="Nome da igreja" id="church_name" required
                value={form.church_name} onChange={(v) => update("church_name", v)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="CNPJ (opcional)" id="cnpj"
                  value={form.cnpj} onChange={(v) => update("cnpj", v)} />
                <Field label="Telefone (opcional)" id="phone"
                  value={form.phone} onChange={(v) => update("phone", v)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <Field label="Cidade" id="city"
                  value={form.city} onChange={(v) => update("city", v)} />
                <Field label="UF" id="state" maxLength={2}
                  value={form.state} onChange={(v) => update("state", v.toUpperCase())} />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plano
              </h3>
              <Select value={form.plan_slug} onValueChange={(v) => update("plan_slug", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>
                  {plans?.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.name}{p.price_monthly > 0 ? ` — ${formatBRL(p.price_monthly)}/mês` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlan && (
                <p className="text-xs text-muted-foreground">
                  Até {selectedPlan.max_members.toLocaleString("pt-BR")} membros e{" "}
                  {selectedPlan.max_departments} departamentos.
                </p>
              )}
            </section>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível concluir o cadastro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Criando sua igreja..." : "Criar igreja e iniciar teste grátis"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/auth" className="font-medium text-primary underline-offset-2 hover:underline">Entrar</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, id, value, onChange, type = "text", required, minLength, maxLength, autoComplete,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; minLength?: number; maxLength?: number; autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id} type={type} value={value} required={required}
        minLength={minLength} maxLength={maxLength} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
