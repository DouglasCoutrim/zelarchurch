import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({ meta: [{ title: "Igrejas — Admin Zelar" }] }),
  component: () => <Outlet />,
});
