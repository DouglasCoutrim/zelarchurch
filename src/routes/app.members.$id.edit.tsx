import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MemberForm } from "@/components/MemberForm";
import { getMember } from "@/lib/member-record";

export const Route = createFileRoute("/app/members/$id/edit")({
  head: () => ({ meta: [{ title: "Editar membro" }] }),
  component: EditMemberPage,
});

function EditMemberPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["member", id],
    queryFn: () => getMember(id),
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/members/$id" params={{ id }}>
          <ChevronLeft className="mr-1 h-4 w-4" />Voltar
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar membro</h1>
        <p className="text-sm text-muted-foreground">Atualize os dados do membro.</p>
      </div>
      {isLoading && <Skeleton className="h-96 w-full" />}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}
      {data && <MemberForm initial={data} />}
    </div>
  );
}
