import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/members/$id")({
  head: () => ({ meta: [{ title: "Perfil do membro" }] }),
  component: MemberProfile,
});

function MemberProfile() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/app/members">← Voltar para membros</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Membro #{id}</h1>
        <p className="text-sm text-muted-foreground">Detalhes do perfil em breve.</p>
      </div>
    </div>
  );
}
