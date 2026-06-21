import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({ meta: [{ title: "Igrejas — Admin Zelar" }] }),
  component: () => <Outlet />,
});
// Layout-only; lista vive em admin.tenants.index.tsx, detalhe em admin.tenants.$id.tsx
export { Link as _Link };
const _ = useRouterState; // silenciar import não usado em build
void _;
