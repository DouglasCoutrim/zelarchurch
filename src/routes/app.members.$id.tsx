import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/members/$id")({
  head: () => ({ meta: [{ title: "Member profile" }] }),
  component: MemberProfile,
});

function MemberProfile() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/app/members">← Back to members</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Member #{id}</h1>
        <p className="text-sm text-muted-foreground">Profile details coming soon.</p>
      </div>
    </div>
  );
}
