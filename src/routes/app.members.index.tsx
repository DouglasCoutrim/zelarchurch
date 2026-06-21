import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/members/")({
  head: () => ({ meta: [{ title: "Membros" }] }),
  component: MembersList,
});

function MembersList() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
        <p className="text-sm text-muted-foreground">Gerencie os membros da sua igreja.</p>
      </div>
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        Nenhum membro ainda.
      </div>
    </div>
  );
}
