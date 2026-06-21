import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MemberForm } from "@/components/MemberForm";

export const Route = createFileRoute("/app/members/new")({
  head: () => ({ meta: [{ title: "Novo membro" }] }),
  component: NewMemberPage,
});

function NewMemberPage() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/members"><ChevronLeft className="mr-1 h-4 w-4" />Membros</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo membro</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo membro da sua igreja.
        </p>
      </div>
      <MemberForm />
    </div>
  );
}
