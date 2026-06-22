import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/oracao")({
  head: () => ({ meta: [{ title: "Pedidos de oração" }] }),
  component: () => <Outlet />,
});
