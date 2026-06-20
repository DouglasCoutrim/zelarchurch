import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/members/")({
  head: () => ({ meta: [{ title: "Members" }] }),
  component: MembersList,
});

function MembersList() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground">Manage your team members.</p>
      </div>
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No members yet.
      </div>
    </div>
  );
}
