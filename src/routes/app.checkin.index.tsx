import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { listUpcomingSchedules } from "@/lib/checkins";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/checkin/")({
  component: CheckinIndex,
});

function CheckinIndex() {
  const tenant = useTenantStore((s) => s.currentTenant);
  const { data, isLoading, error } = useQuery({
    queryKey: ["checkin-upcoming", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: () => listUpcomingSchedules(tenant!.id, 72),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Presença"
        title="Check-in"
        description="Selecione uma escala em andamento ou próxima para registrar presença."
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Erro ao carregar escalas.</p>
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma escala nas próximas 72 horas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data!.map((s) => {
            const start = new Date(s.starts_at);
            return (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    {s.department && (
                      <Badge variant="outline">{s.department.name}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2 capitalize">
                      <CalendarDays className="h-4 w-4" />
                      {start.toLocaleDateString("pt-BR", {
                        weekday: "short", day: "2-digit", month: "short",
                      })}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {start.toLocaleTimeString("pt-BR", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {s.location && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> {s.location}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      {s.checkin_count}/{s.scheduled_count} presentes
                    </span>
                    <Button asChild size="sm">
                      <Link
                        to="/app/checkin/$scheduleId"
                        params={{ scheduleId: s.id }}
                      >
                        <ClipboardCheck className="mr-1 h-4 w-4" />
                        Abrir
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
