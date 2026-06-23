import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Pencil, Mail, Phone, MapPin, Calendar, IdCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMember } from "@/lib/member-record";
import { MEMBER_STATUS_OPTIONS } from "@/types/member";

export const Route = createFileRoute("/app/members/$id/")({
  head: () => ({ meta: [{ title: "Perfil do membro" }] }),
  component: MemberProfile,
});

function MemberProfile() {
  const { id } = Route.useParams();
  const { data: m, isLoading, error } = useQuery({
    queryKey: ["member", id],
    queryFn: () => getMember(id),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/app/members"><ChevronLeft className="mr-1 h-4 w-4" />Membros</Link>
        </Button>
        {m && (
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/app/members/$id/carteirinha" params={{ id }}>
                <IdCard className="mr-1 h-4 w-4" />Carteirinha
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/app/members/$id/edit" params={{ id }}>
                <Pencil className="mr-1 h-4 w-4" />Editar
              </Link>
            </Button>
          </div>
        )}
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {m && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="h-20 w-20">
              {m.photo_url && <AvatarImage src={m.photo_url} alt={m.full_name} />}
              <AvatarFallback>{(m.full_name ?? "").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">{m.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">
                  {MEMBER_STATUS_OPTIONS.find((s) => s.value === m.status)?.label ?? m.status}
                </Badge>
                {m.member_type && <span>· {m.member_type}</span>}
                {m.church_role && <span>· {m.church_role}</span>}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row icon={<Mail className="h-4 w-4" />} label="E-mail" value={m.email} />
                <Row icon={<Phone className="h-4 w-4" />} label="Telefone" value={m.phone} />
                <Row icon={<Phone className="h-4 w-4" />} label="WhatsApp" value={m.whatsapp} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Pessoal</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="CPF" value={m.cpf} />
                <Row label="RG" value={m.rg} />
                <Row icon={<Calendar className="h-4 w-4" />} label="Nascimento" value={m.birth_date} />
                <Row label="Gênero" value={m.gender} />
                <Row label="Estado civil" value={m.marital_status} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Igreja</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row icon={<Calendar className="h-4 w-4" />} label="Batismo" value={m.baptism_date} />
                <Row icon={<Calendar className="h-4 w-4" />} label="Ingresso" value={m.join_date} />
                <Row label="Dons" value={(m.spiritual_gifts ?? []).join(", ") || null} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {m.address ? (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4" />
                    <div>
                      {[m.address.street, m.address.number].filter(Boolean).join(", ")}
                      {m.address.complement && ` — ${m.address.complement}`}
                      <br />
                      {[m.address.neighborhood, m.address.city, m.address.state]
                        .filter(Boolean).join(" · ")}
                      {m.address.zip && <> · CEP {m.address.zip}</>}
                    </div>
                  </div>
                ) : <span className="text-muted-foreground">Sem endereço cadastrado.</span>}
              </CardContent>
            </Card>

            {m.notes && (
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
                <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {m.notes}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground">{label}:</span>
      <span>{value || "—"}</span>
    </div>
  );
}
