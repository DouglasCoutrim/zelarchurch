import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro" }] }),
  component: FinanceLayout,
});

const tabs = [
  { to: "/app/financeiro", label: "Lançamentos", exact: true },
  { to: "/app/financeiro/contas", label: "Plano de contas", exact: false },
  { to: "/app/financeiro/centros", label: "Centros de custo", exact: false },
  { to: "/app/financeiro/relatorios", label: "Relatórios", exact: false },
];

function FinanceLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Controle receitas, despesas e o plano de contas da sua igreja.
        </p>
      </div>
      <nav className="flex gap-1 border-b">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
