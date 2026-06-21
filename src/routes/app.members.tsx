import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/members")({
  head: () => ({ meta: [{ title: "Membros" }] }),
  component: () => <Outlet />,
});
