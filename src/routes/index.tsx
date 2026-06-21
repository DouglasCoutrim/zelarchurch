import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Administração de Igrejas` },
      {
        name: "description",
        content: "Gerencie membros, departamentos e planos da sua igreja.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{APP_NAME}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Plataforma multi-tenant para administrar membros, departamentos e planos da sua igreja.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/auth">Começar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app">Abrir app</Link>
        </Button>
      </div>
    </div>
  );
}
