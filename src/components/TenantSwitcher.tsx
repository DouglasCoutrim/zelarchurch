import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initializeTenantSession } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/stores/tenantStore";
import type { Tenant } from "@/types/tenant";

export function TenantSwitcher() {
  const navigate = useNavigate();
  const tenants = useTenantStore((s) => s.tenants);
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const setCurrentTenant = useTenantStore((s) => s.setCurrentTenant);
  const [switching, setSwitching] = useState<string | null>(null);

  async function pick(tenant: Tenant) {
    if (tenant.id === currentTenant?.id) return;
    setSwitching(tenant.id);
    try {
      await initializeTenantSession(tenant.id);
      setCurrentTenant(tenant);
    } catch (err) {
      console.error("Falha ao trocar de tenant:", err);
    } finally {
      setSwitching(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-[260px] gap-2">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-medium">
            {currentTenant?.name ?? "Sem área de trabalho"}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Áreas de trabalho</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.length === 0 && (
          <DropdownMenuItem disabled>Nenhuma disponível</DropdownMenuItem>
        )}
        {tenants.map((t) => {
          const active = t.id === currentTenant?.id;
          return (
            <DropdownMenuItem
              key={t.id}
              onSelect={(e) => {
                e.preventDefault();
                void pick(t);
              }}
              className="gap-2"
            >
              <Check className={cn("h-4 w-4", active ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{t.name}</span>
              {switching === t.id && (
                <span className="ml-auto text-xs text-muted-foreground">...</span>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/select-tenant" })}>
          Gerenciar áreas de trabalho
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
