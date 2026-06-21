import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/ebd")({
  head: () => ({ meta: [{ title: "EBD" }] }),
  component: () => <Outlet />,
});

export { Link };
