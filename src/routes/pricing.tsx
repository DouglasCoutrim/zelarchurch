import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/config/constants";
import { fetchActivePlans, formatBRL } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: `Planos e preços — ${APP_NAME}` },
      {
        name: "description",
        content:
          "Conheça os planos do Zelar e escolha o ideal para sua igreja. Comece grátis por 14 dias, sem cartão de crédito.",
      },
      { property: "og:title", content: `Planos e preços — ${APP_NAME}` },
      {
        property: "og:description",
        content: "Planos flexíveis para igrejas de todos os tamanhos. 14 dias grátis.",
      },
      { property: "og:url", content: "https://zelarchurch.lovable.app/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://zelarchurch.lovable.app/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["plans", "public"],
    queryFn: fetchActivePlans,
  });

  return (
    <div className="min-h-screen gradient-mesh">
      <header className="sticky top-0 z-30 border-b border-border/60 glass-strong">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-semibold tracking-tight">{APP_NAME}</Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button>
            <Button asChild variant="gold" size="sm"><Link to="/register">Criar conta</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 page-enter">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-brand-gold/15 px-3 py-1 text-xs font-semibold text-brand-gold">
            Planos transparentes
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Escolha o plano da sua <span className="text-gradient-navy">igreja</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Todos os planos incluem 14 dias de teste grátis. Sem cartão de crédito.
          </p>
        </div>

        {error && (
          <p className="mt-8 text-center text-sm text-destructive">
            Falha ao carregar planos: {(error as Error).message}
          </p>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
                  <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                </Card>
              ))
            : plans?.map((p, idx) => {
                const featured = p.slug === "plus";
                return (
                  <div
                    key={p.id}
                    style={{ animationDelay: `${idx * 80}ms` }}
                    className={
                      "page-enter relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition-all hover-lift " +
                      (featured
                        ? "border-brand-gold/60 bg-card shadow-elevated ring-1 ring-brand-gold/40"
                        : "border-border/70 bg-card/90")
                    }
                  >
                    {featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1b3a6b] shadow-md">
                        Mais escolhido
                      </span>
                    )}
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-lg font-bold">{p.name}</h3>
                      {featured && <Badge variant="secondary">Recomendado</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <div className="my-5">
                      {p.price_monthly > 0 ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold tracking-tight text-gradient-navy">
                            {formatBRL(p.price_monthly)}
                          </span>
                          <span className="text-sm text-muted-foreground">/mês</span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold">Sob consulta</span>
                      )}
                    </div>
                    <ul className="mb-6 space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-emerald-light text-brand-emerald-dark">
                          <Check className="h-3 w-3" />
                        </span>
                        Até {p.max_members.toLocaleString("pt-BR")} membros
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-emerald-light text-brand-emerald-dark">
                          <Check className="h-3 w-3" />
                        </span>
                        Até {p.max_departments} departamentos
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-emerald-light text-brand-emerald-dark">
                          <Check className="h-3 w-3" />
                        </span>
                        14 dias de teste grátis
                      </li>
                    </ul>
                    <Button
                      asChild
                      className="mt-auto w-full"
                      variant={featured ? "gold" : "outline"}
                    >
                      <Link to="/register" search={{ plan: p.slug }}>Começar com {p.name}</Link>
                    </Button>
                  </div>
                );
              })}
        </div>
      </section>
    </div>
  );
}
