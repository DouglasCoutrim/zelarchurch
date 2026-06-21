import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/checkin")({
  head: () => ({ meta: [{ title: "Check-in" }] }),
  component: () => <Outlet />,
});
