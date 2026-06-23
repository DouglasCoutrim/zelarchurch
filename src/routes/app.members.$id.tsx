import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/members/$id")({
  component: () => <Outlet />,
});
