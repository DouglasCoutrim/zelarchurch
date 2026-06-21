import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Users, Wallet, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Administração de Igrejas` },
      {
        name: "description",
        content:
          "Plataforma completa para administrar membros, departamentos, finanças e escalas da sua igreja.",
      },
      { property: "og:title", content: `${APP_NAME} — Administração de Igrejas` },
      {
        property: "og:description",
        content: "Gerencie tudo da sua igreja em um só lugar. 14 dias grátis.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="font-semibold">{APP_NAME}</span>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/pricing">Planos</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button>
            <Button asChild size="sm"><Link to="/register">Criar conta</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Toda a gestão da sua igreja em um só lugar
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Membros, departamentos, finanças, escalas e check-in.
          Comece grátis por 14 dias, sem cartão de crédito.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/register">Começar grátis</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/pricing">Ver planos</Link></Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          <Feature icon={<Users className="h-5 w-5" />} title="Membros e Departamentos"
            text="Cadastro completo, histórico, ministérios e cargos." />
          <Feature icon={<Wallet className="h-5 w-5" />} title="Financeiro"
            text="Dízimos, ofertas, despesas e relatórios para o conselho." />
          <Feature icon={<CalendarDays className="h-5 w-5" />} title="Escalas e Check-in"
            text="Organize cultos, eventos e a presença dos seus membros." />
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <div className="flex gap-4">
            <Link to="/pricing">Planos</Link>
            <Link to="/auth">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <Check className="mt-3 inline h-4 w-4 text-primary" />
    </div>
  );
}
