import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/departments")({
  head: () => ({ meta: [{ title: "Departamentos" }] }),
  component: Departments,
});

function Departments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Departamentos</h1>
        <p className="text-sm text-muted-foreground">Organize os membros em departamentos.</p>
      </div>
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        Nenhum departamento ainda.
      </div>
    </div>
  );
}
