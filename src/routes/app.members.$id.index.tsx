import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  CalendarHeart,
  CalendarPlus,
  IdCard,
  User,
  Fingerprint,
  Heart,
  Sparkles,
  StickyNote,
  Church,
  Briefcase,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getMember, deleteMember } from "@/lib/member-record";
import { MEMBER_STATUS_OPTIONS } from "@/types/member";

export const Route = createFileRoute("/app/members/$id/")({
  head: () => ({ meta: [{ title: "Perfil do membro" }] }),
  component: MemberProfile,
});

function MemberProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: m, isLoading, error } = useQuery({
    queryKey: ["member", id],
    queryFn: () => getMember(id),
  });

  const delMut = useMutation({
    mutationFn: () => deleteMember(id),
    onSuccess: () => {
      toast.success("Membro excluído");
      qc.invalidateQueries({ queryKey: ["members"] });
      navigate({ to: "/app/members" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-slate-50/80 p-4 sm:p-6">
      {/* Top bar */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-slate-600 hover:text-slate-900">
          <Link to="/app/members">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Membros
          </Link>
        </Button>
        {m && (
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="border-slate-200 bg-white shadow-sm">
              <Link to="/app/members/$id/carteirinha" params={{ id }}>
                <IdCard className="mr-1 h-4 w-4" />
                Carteirinha
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-[#1b3a6b] text-white shadow-sm hover:bg-[#0f2347]">
              <Link to="/app/members/$id/edit" params={{ id }}>
                <Pencil className="mr-1 h-4 w-4" />
                Editar perfil
              </Link>
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="mx-auto mt-4 max-w-6xl space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mx-auto mt-4 max-w-6xl">
          <AlertTitle>Erro ao carregar</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {m && (
        <div className="mx-auto mt-4 max-w-6xl space-y-5">
          {/* Profile banner */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div
              className="h-24 w-full"
              style={{
                background:
                  "linear-gradient(120deg, #1b3a6b 0%, #2d5099 55%, #10b981 140%)",
              }}
            />
            <div className="relative px-5 pb-5 pt-0 sm:px-7">
              <div className="-mt-12 flex flex-wrap items-end gap-4 sm:gap-5">
                <Avatar className="h-24 w-24 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200">
                  {m.photo_url && <AvatarImage src={m.photo_url} alt={m.full_name} />}
                  <AvatarFallback className="rounded-2xl bg-slate-100 text-lg font-semibold text-slate-600">
                    {(m.full_name ?? "")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 pb-1">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {m.full_name}
                  </h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {m.registration_number && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white">
                        <span className="opacity-70">MAT.</span>
                        <span className="font-mono">{m.registration_number}</span>
                      </span>
                    )}
                    <StatusBadge status={m.status} />
                    {m.member_type && <MetaPill icon={<Users className="h-3 w-3" />} label={m.member_type} />}
                    {m.church_role && <MetaPill icon={<Briefcase className="h-3 w-3" />} label={m.church_role} />}
                    {m.is_intercessor && (
                      <MetaPill
                        icon={<Heart className="h-3 w-3" />}
                        label="Intercessor"
                        tone="emerald"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
                <QuickStat label="Ingresso" value={formatDate(m.join_date)} />
                <QuickStat label="Batismo" value={formatDate(m.baptism_date)} />
                <QuickStat label="Nascimento" value={formatDate(m.birth_date)} />
                <QuickStat label="Congregação" value={m.congregation_id ? "Vinculada" : "Sede"} />
              </dl>
            </div>
          </section>

          {/* Two-column asymmetric */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <Panel title="Dados pessoais" icon={<User className="h-4 w-4" />}>
                <InfoGrid>
                  <InfoRow icon={<Fingerprint className="h-4 w-4" />} label="CPF" value={m.cpf} />
                  <InfoRow icon={<IdCard className="h-4 w-4" />} label="RG" value={m.rg} />
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Nascimento" value={formatDate(m.birth_date)} />
                  <InfoRow icon={<User className="h-4 w-4" />} label="Gênero" value={m.gender} />
                  <InfoRow icon={<Heart className="h-4 w-4" />} label="Estado civil" value={m.marital_status} />
                </InfoGrid>
              </Panel>

              <Panel title="Vida na igreja" icon={<Church className="h-4 w-4" />}>
                <InfoGrid>
                  <InfoRow icon={<CalendarHeart className="h-4 w-4" />} label="Batismo" value={formatDate(m.baptism_date)} />
                  <InfoRow icon={<CalendarPlus className="h-4 w-4" />} label="Ingresso" value={formatDate(m.join_date)} />
                  <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Cargo" value={m.church_role} />
                  <InfoRow icon={<Users className="h-4 w-4" />} label="Tipo" value={m.member_type} />
                  <InfoRow
                    icon={<Sparkles className="h-4 w-4" />}
                    label="Dons espirituais"
                    value={(m.spiritual_gifts ?? []).join(", ") || null}
                    span={2}
                  />
                </InfoGrid>
              </Panel>

              {m.notes && (
                <Panel title="Observações" icon={<StickyNote className="h-4 w-4" />}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {m.notes}
                  </p>
                </Panel>
              )}
            </div>

            <aside className="space-y-5">
              <Panel title="Contato" icon={<Mail className="h-4 w-4" />}>
                <ul className="space-y-2.5">
                  <ContactRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={m.email} href={m.email ? `mailto:${m.email}` : null} />
                  <ContactRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={m.phone} href={m.phone ? `tel:${m.phone}` : null} />
                  <ContactRow
                    icon={<MessageCircle className="h-4 w-4" />}
                    label="WhatsApp"
                    value={m.whatsapp}
                    href={m.whatsapp ? `https://wa.me/${m.whatsapp.replace(/\D/g, "")}` : null}
                  />
                </ul>
              </Panel>

              <Panel title="Endereço" icon={<MapPin className="h-4 w-4" />}>
                {m.address ? (
                  <div className="space-y-3 text-sm">
                    <Line label="Logradouro" value={[m.address.street, m.address.number].filter(Boolean).join(", ") || null} />
                    {m.address.complement && <Line label="Complemento" value={m.address.complement} />}
                    <Line label="Bairro" value={m.address.neighborhood ?? null} />
                    <div className="grid grid-cols-2 gap-3">
                      <Line label="Cidade" value={m.address.city ?? null} />
                      <Line label="UF" value={m.address.state ?? null} />
                    </div>
                    <Line label="CEP" value={m.address.zip ?? null} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sem endereço cadastrado.</p>
                )}
              </Panel>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eef2fb] text-[#1b3a6b]">
          {icon}
        </span>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function InfoGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">{children}</div>;
}

function InfoRow({
  icon,
  label,
  value,
  span,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
  span?: 2;
}) {
  return (
    <div className={"flex items-start gap-3 " + (span === 2 ? "sm:col-span-2" : "")}>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef2fb] text-[#1b3a6b]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-slate-900">
          {value || <span className="font-normal text-slate-400">—</span>}
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
  href: string | null;
}) {
  const inner = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef2fb] text-[#1b3a6b]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-slate-900">
          {value || <span className="font-normal text-slate-400">—</span>}
        </div>
      </div>
    </>
  );
  return (
    <li>
      {value && href ? (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-slate-50"
        >
          {inner}
        </a>
      ) : (
        <div className="flex items-center gap-3 px-1 py-1">{inner}</div>
      )}
    </li>
  );
}

function Line({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900">
        {value || <span className="font-normal text-slate-400">—</span>}
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="truncate text-sm font-semibold text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function MetaPill({
  icon,
  label,
  tone = "slate",
}: {
  icon: ReactNode;
  label: string;
  tone?: "slate" | "emerald";
}) {
  const cls =
    tone === "emerald"
      ? "bg-[#d1fae5] text-[#059669] ring-[#a7f3d0]"
      : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset " +
        cls
      }
    >
      {icon}
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = MEMBER_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  const map: Record<string, string> = {
    ativo: "bg-[#d1fae5] text-[#059669] ring-[#a7f3d0]",
    inativo: "bg-slate-100 text-slate-600 ring-slate-200",
    afastado: "bg-[#fef3c7] text-[#b45309] ring-[#fde68a]",
    visitante: "bg-[#eef2fb] text-[#1b3a6b] ring-[#dbe4f5]",
    excluido: "bg-red-50 text-red-700 ring-red-200",
  };
  const cls = map[status] ?? map.inativo;
  return (
    <Badge className={"rounded-full border-0 px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset " + cls}>
      {label}
    </Badge>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
