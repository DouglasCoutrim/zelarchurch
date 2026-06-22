import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ChevronRight, MapPin, Loader2 } from "lucide-react";

import { APP_NAME } from "@/config/constants";
import { supabase, initializeTenantSession } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logoAsset from "@/assets/logo-zelar.svg.asset.json";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: `Encontre sua igreja — ${APP_NAME}` },
      {
        name: "description",
        content:
          "Encontre sua igreja por estado e cidade e crie sua conta em segundos no Zelar.",
      },
    ],
  }),
  component: OnboardingPage,
});

type StateRow = { uf: string; name: string };
type Church = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  state: string | null;
};

function OnboardingPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const [uf, setUf] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [selected, setSelected] = useState<Church | null>(null);

  useEffect(() => {
    if (session) navigate({ to: "/select-tenant", replace: true });
  }, [session, navigate]);

  // 1. UFs
  const statesQuery = useQuery({
    queryKey: ["brazilian_states"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brazilian_states")
        .select("uf,name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as StateRow[];
    },
    staleTime: 60 * 60_000,
  });

  // 2. Cidades disponíveis por UF
  const citiesQuery = useQuery({
    queryKey: ["cities_by_state", uf],
    enabled: !!uf,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cities_by_state", {
        p_state: uf,
      });
      if (error) throw error;
      return ((data as string[] | null) ?? []).filter(Boolean);
    },
  });

  // 3. Igrejas na cidade
  const churchesQuery = useQuery({
    queryKey: ["churches_by_location", uf, city],
    enabled: !!uf && !!city,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_churches_by_location", {
        p_state: uf,
        p_city: city,
      });
      if (error) throw error;
      return ((data as Church[] | null) ?? []) as Church[];
    },
  });

  const churches = churchesQuery.data ?? [];

  return (
    <div className="relative min-h-screen gradient-mesh px-4 py-8">
      <div className="pointer-events-none absolute -top-32 left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-gold/10 blur-3xl" />

      <div className="relative mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <Link to="/" aria-label={APP_NAME}>
            <img src={logoAsset.url} alt={APP_NAME} className="h-12 w-auto" />
          </Link>
          <Link
            to="/auth"
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            Já tenho conta
          </Link>
        </header>

        {!selected ? (
          <section className="space-y-5 rounded-2xl glass-strong p-6 shadow-elevated">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <MapPin className="h-3.5 w-3.5" /> Encontre sua igreja
              </span>
              <h1 className="text-2xl font-bold tracking-tight">
                Selecione sua igreja local
              </h1>
              <p className="text-sm text-muted-foreground">
                Em 3 passos você acessa o app como membro da sua igreja.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={uf}
                  onValueChange={(v) => {
                    setUf(v);
                    setCity("");
                  }}
                  disabled={statesQuery.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {(statesQuery.data ?? []).map((s) => (
                      <SelectItem key={s.uf} value={s.uf}>
                        {s.name} ({s.uf})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Select
                  value={city}
                  onValueChange={setCity}
                  disabled={!uf || citiesQuery.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !uf ? "Selecione o estado antes" : "Selecione a cidade"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(citiesQuery.data ?? []).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Igrejas disponíveis
              </h2>

              {!uf || !city ? (
                <p className="rounded-lg border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  Escolha estado e cidade para listar as igrejas.
                </p>
              ) : churchesQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/40 p-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                </div>
              ) : churches.length === 0 ? (
                <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-background/40 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma igreja encontrada em <strong>{city}/{uf}</strong>.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/register">
                      Minha igreja ainda não usa o {APP_NAME}
                    </Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {churches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-3 text-left transition-all hover:border-primary/50 hover:bg-background/80"
                      >
                        {c.logo_url ? (
                          <img
                            src={c.logo_url}
                            alt={c.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold leading-tight">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.city}/{c.state}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : (
          <JoinForm church={selected} onBack={() => setSelected(null)} />
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          É pastor ou líder?{" "}
          <Link to="/register" className="font-medium text-primary underline-offset-2 hover:underline">
            Cadastre sua igreja
          </Link>
        </p>
      </div>
    </div>
  );
}

function JoinForm({ church, onBack }: { church: Church; onBack: () => void }) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => `Entrar na ${church.name}`, [church.name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: { full_name: fullName },
        },
      });
      if (signUpErr) {
        const msg = signUpErr.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered")) {
          throw new Error(
            "Este e-mail já está cadastrado. Faça login para continuar.",
          );
        }
        throw signUpErr;
      }
      if (!signUp.session) {
        throw new Error(
          "Confirme seu e-mail antes de continuar. Verifique sua caixa de entrada.",
        );
      }

      const { error: joinErr } = await supabase.rpc("public_join_tenant", {
        p_tenant_id: church.id,
        p_full_name: fullName,
        p_phone: phone || null,
      });
      if (joinErr) throw joinErr;

      await initializeTenantSession(church.id);
      useTenantStore.getState().setCurrentTenant({
        id: church.id,
        name: church.name,
        slug: church.slug,
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
    <section className="rounded-2xl glass-strong p-6 shadow-elevated">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Trocar de igreja
      </button>

      <div className="mb-5 flex items-center gap-3">
        {church.logo_url ? (
          <img
            src={church.logo_url}
            alt={church.name}
            className="h-14 w-14 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold leading-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {church.city}/{church.state}
          </p>
        </div>
      </div>

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
            <AlertTitle>Não foi possível cadastrar</AlertTitle>
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
          {submitting ? "Criando sua conta..." : `Entrar na ${church.name}`}
        </Button>
      </form>
    </section>
  );
}
