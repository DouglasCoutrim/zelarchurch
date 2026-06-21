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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-semibold">{APP_NAME}</Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button>
            <Button asChild size="sm"><Link to="/register">Criar conta</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Escolha o plano da sua igreja
          </h1>
          <p className="mt-3 text-muted-foreground">
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
            : plans?.map((p) => {
                const featured = p.slug === "plus";
                return (
                  <Card
                    key={p.id}
                    className={featured ? "border-primary shadow-lg ring-1 ring-primary" : ""}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{p.name}</CardTitle>
                        {featured && <Badge>Recomendado</Badge>}
                      </div>
                      <CardDescription>{p.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        {p.price_monthly > 0 ? (
                          <>
                            <span className="text-3xl font-bold">{formatBRL(p.price_monthly)}</span>
                            <span className="text-sm text-muted-foreground"> /mês</span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold">Sob consulta</span>
                        )}
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          Até {p.max_members.toLocaleString("pt-BR")} membros
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          Até {p.max_departments} departamentos
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          14 dias de teste grátis
                        </li>
                      </ul>
                      <Button asChild className="w-full" variant={featured ? "default" : "outline"}>
                        <Link to="/register" search={{ plan: p.slug }}>Começar com {p.name}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </section>
    </div>
  );
}
