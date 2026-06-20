import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/departments")({
  head: () => ({ meta: [{ title: "Departments" }] }),
  component: Departments,
});

function Departments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
        <p className="text-sm text-muted-foreground">Organize members into departments.</p>
      </div>
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No departments yet.
      </div>
    </div>
  );
}
