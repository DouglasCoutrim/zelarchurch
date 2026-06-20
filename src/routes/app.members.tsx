import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/app/members")({
  component: () => <Outlet />,
});
export { useRouterState };
