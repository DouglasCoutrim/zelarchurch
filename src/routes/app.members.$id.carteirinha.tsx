import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Download, Printer } from "lucide-react";
import { toPng } from "html-to-image";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMember } from "@/lib/member-record";
import { getTenant } from "@/lib/tenantSettings";
import { useTenantStore } from "@/stores/tenantStore";
import {
  MembershipCard,
  MEMBERSHIP_CARD_TEMPLATES,
  type CardTemplate,
  type MembershipCardData,
} from "@/components/MembershipCard";

export const Route = createFileRoute("/app/members/$id/carteirinha")({
  head: () => ({ meta: [{ title: "Carteirinha do membro" }] }),
  component: MembershipCardPage,
});

function MembershipCardPage() {
  const { id } = Route.useParams();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const cardRef = useRef<HTMLDivElement>(null);

  const memberQuery = useQuery({ queryKey: ["member", id], queryFn: () => getMember(id) });
  const tenantQuery = useQuery({
    queryKey: ["tenant", currentTenant?.id],
    queryFn: () => getTenant(currentTenant!.id),
    enabled: !!currentTenant?.id,
  });

  const [template, setTemplate] = useState<CardTemplate>("vitral");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nextYear = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().slice(0, 10);
  }, []);
  const [issueDate, setIssueDate] = useState(today);
  const [validUntil, setValidUntil] = useState(nextYear);
  const [roleOverride, setRoleOverride] = useState<string>("");

  const m = memberQuery.data;
  const t = tenantQuery.data;

  const data: MembershipCardData | null = m
    ? {
        fullName: m.full_name,
        birthDate: m.birth_date,
        baptismDate: m.baptism_date,
        role: roleOverride || m.church_role || m.member_type,
        churchName: t?.name || currentTenant?.name || "Igreja",
        churchAddress: t
          ? [t.city, t.state].filter(Boolean).join(" - ") || null
          : null,
        churchLogoUrl: t?.logo_url || null,
        photoUrl: m.photo_url,
        issueDate,
        validUntil,
      }
    : null;

  async function handleDownload() {
    if (!cardRef.current || !m) return;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `carteirinha-${m.full_name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/app/members/$id" params={{ id }}>
            <ChevronLeft className="mr-1 h-4 w-4" />Voltar ao membro
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!m}>
            <Printer className="mr-1 h-4 w-4" />Imprimir
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={!m}>
            <Download className="mr-1 h-4 w-4" />Baixar PNG
          </Button>
        </div>
      </div>

      {memberQuery.isLoading && <Skeleton className="h-64 w-full" />}
      {memberQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar membro</AlertTitle>
          <AlertDescription>{(memberQuery.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4 print:hidden">
            <Card>
              <CardContent className="space-y-3 pt-4">
                <Label>Modelo de carteirinha</Label>
                <div className="grid gap-2">
                  {MEMBERSHIP_CARD_TEMPLATES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTemplate(opt.value)}
                      className={
                        "rounded-md border p-3 text-left text-sm transition " +
                        (template === opt.value
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/40")
                      }
                    >
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Função na igreja</Label>
                  <Input
                    id="role"
                    placeholder={m?.church_role || "Membro"}
                    value={roleOverride}
                    onChange={(e) => setRoleOverride(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="issue">Data de emissão</Label>
                  <Input
                    id="issue" type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="valid">Validade</Label>
                  <Input
                    id="valid" type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <div id="membership-card-print" className="inline-block">
              <MembershipCard ref={cardRef} template={template} data={data} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #membership-card-print, #membership-card-print * { visibility: visible; }
          #membership-card-print { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}
