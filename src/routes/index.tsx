import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Multi-tenant workspace` },
      { name: "description", content: "Manage members, departments and plans across tenants." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{APP_NAME}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Multi-tenant workspace for managing members, departments and plans.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/auth">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app">Open app</Link>
        </Button>
      </div>
    </div>
  );
}
