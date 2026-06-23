import { forwardRef } from "react";
import { Cross, User, QrCode } from "lucide-react";

export type CardTemplate = "vitral" | "minimal" | "classico" | "premium";

export interface MembershipCardData {
  fullName: string;
  registrationNumber?: string | null;
  birthDate?: string | null;
  baptismDate?: string | null;
  role?: string | null;
  churchName: string;
  churchAddress?: string | null;
  churchLogoUrl?: string | null;
  photoUrl?: string | null;
  issueDate: string;
  validUntil: string;
}

export interface MembershipCardProps {
  template: CardTemplate;
  data: MembershipCardData;
}

const TEMPLATE_OPTIONS: { value: CardTemplate; label: string; description: string }[] = [
  { value: "vitral", label: "Âmbar institucional", description: "Off-white com faixa âmbar sóbria." },
  { value: "minimal", label: "Minimalista", description: "Branco corporativo com acentos sky." },
  { value: "classico", label: "Clássico", description: "Azul-marinho com tipografia serifada." },
  { value: "premium", label: "Premium", description: "Marinho profundo com detalhes dourados." },
];

export const MEMBERSHIP_CARD_TEMPLATES = TEMPLATE_OPTIONS;

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR");
}

export const MembershipCard = forwardRef<HTMLDivElement, MembershipCardProps>(
  function MembershipCard({ template, data }, ref) {
    return (
      <div
        ref={ref}
        className="relative overflow-hidden rounded-2xl shadow-2xl"
        style={{ width: 640, height: 400 }}
      >
        {template === "vitral" && <AmberTemplate data={data} />}
        {template === "minimal" && <MinimalTemplate data={data} />}
        {template === "classico" && <ClassicoTemplate data={data} />}
        {template === "premium" && <PremiumTemplate data={data} />}
      </div>
    );
  },
);

/* ---------- Shared atoms ---------- */

function Photo({
  url,
  size = 132,
  rounded = "rounded-xl",
  innerRing = "ring-1 ring-white/40",
}: {
  url?: string | null;
  size?: number;
  rounded?: string;
  innerRing?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-slate-200 ${rounded}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="Foto" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <User className="h-1/2 w-1/2 text-slate-400" />
        </div>
      )}
      <span className={`pointer-events-none absolute inset-0 ${rounded} ${innerRing}`} />
    </div>
  );
}

function DataCell({
  label,
  value,
  tone = "dark",
  highlight = false,
}: {
  label: string;
  value: string;
  tone?: "dark" | "light";
  highlight?: boolean;
}) {
  const labelCls =
    tone === "dark"
      ? "text-slate-500"
      : "text-white/70";
  const valueCls =
    tone === "dark"
      ? highlight
        ? "text-slate-900"
        : "text-slate-800"
      : "text-white";
  return (
    <div className="min-w-0">
      <div className={`text-[10px] font-medium uppercase tracking-[0.14em] ${labelCls}`}>
        {label}
      </div>
      <div className={`truncate text-sm font-bold leading-tight ${valueCls}`}>
        {value}
      </div>
    </div>
  );
}

function MatriculaBadge({
  value,
  tone = "dark",
}: {
  value: string;
  tone?: "dark" | "light" | "gold";
}) {
  const cls =
    tone === "light"
      ? "bg-white/15 text-white ring-white/25"
      : tone === "gold"
        ? "bg-[#d4af37]/95 text-[#0b1a36] ring-[#d4af37]"
        : "bg-slate-900 text-white ring-slate-900";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold tracking-[0.14em] ring-1 ring-inset ${cls}`}
    >
      <span className="opacity-70">MAT.</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}

/* ---------- 1) Âmbar institucional ---------- */
function AmberTemplate({ data }: { data: MembershipCardData }) {
  return (
    <div
      className="relative h-full w-full"
      style={{
        background:
          "linear-gradient(180deg, #fbf7f0 0%, #f4ead8 100%)",
      }}
    >
      {/* Header band */}
      <div
        className="flex h-[78px] items-center justify-between px-6"
        style={{ background: "linear-gradient(90deg,#b8772b,#d49a4a)" }}
      >
        <div className="flex items-center gap-3 text-white">
          {data.churchLogoUrl ? (
            <img src={data.churchLogoUrl} alt="" className="h-11 w-11 rounded-md bg-white/10 object-contain p-1 ring-1 ring-white/30" />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-md bg-white/10 ring-1 ring-white/30">
              <Cross className="h-6 w-6" />
            </div>
          )}
          <div className="leading-tight">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">
              Carteirinha de Membro
            </div>
            <div className="truncate text-lg font-bold uppercase tracking-wide">
              {data.churchName}
            </div>
          </div>
        </div>
        {data.registrationNumber && <MatriculaBadge value={data.registrationNumber} tone="light" />}
      </div>

      {/* Body: photo + 2-col grid */}
      <div className="grid grid-cols-[150px_1fr] gap-5 px-6 pt-5">
        <div>
          <Photo url={data.photoUrl} size={150} rounded="rounded-xl" innerRing="ring-2 ring-[#b8772b]/40" />
        </div>
        <div className="min-w-0 space-y-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Nome completo
            </div>
            <div className="truncate text-[17px] font-extrabold text-slate-900">
              {data.fullName}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            <DataCell label="Nascimento" value={formatDate(data.birthDate)} />
            <DataCell label="Batismo" value={formatDate(data.baptismDate)} />
            <DataCell label="Função" value={data.role || "Membro"} highlight />
            <DataCell label="Validade" value={formatDate(data.validUntil)} />
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-[#b8772b]/30 bg-white/70 px-6 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-600 backdrop-blur-sm">
        <span><span className="text-slate-400">Emissão:</span> <span className="font-bold text-slate-800">{formatDate(data.issueDate)}</span></span>
        <span className="truncate"><span className="text-slate-400">Endereço:</span> <span className="font-bold text-slate-800">{data.churchAddress || "—"}</span></span>
      </div>
    </div>
  );
}

/* ---------- 2) Minimal ---------- */
function MinimalTemplate({ data }: { data: MembershipCardData }) {
  return (
    <div className="relative h-full w-full bg-white">
      <div className="absolute left-0 top-0 h-full w-1.5 bg-sky-500" />
      <div className="flex items-center justify-between px-7 pt-6">
        <div className="flex items-center gap-3">
          {data.churchLogoUrl ? (
            <img src={data.churchLogoUrl} alt="" className="h-10 w-10 rounded-full object-contain ring-2 ring-sky-100" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-50 ring-2 ring-sky-100">
              <Cross className="h-5 w-5 text-sky-500" />
            </div>
          )}
          <div className="leading-tight">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Membro Oficial
            </div>
            <div className="text-base font-bold uppercase text-slate-900">{data.churchName}</div>
          </div>
        </div>
        {data.registrationNumber && <MatriculaBadge value={data.registrationNumber} tone="dark" />}
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-6 px-7 pt-5">
        <Photo url={data.photoUrl} size={140} rounded="rounded-xl" innerRing="ring-1 ring-slate-200" />
        <div className="min-w-0 space-y-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Nome completo
            </div>
            <div className="truncate text-lg font-extrabold text-slate-900">{data.fullName}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-100 pt-3">
            <DataCell label="Nascimento" value={formatDate(data.birthDate)} />
            <DataCell label="Batismo" value={formatDate(data.baptismDate)} />
            <DataCell label="Função" value={data.role || "Membro"} highlight />
            <DataCell label="Emissão" value={formatDate(data.issueDate)} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-1.5 right-0 flex items-center justify-between bg-sky-500 px-6 py-2 text-[10px] font-medium uppercase tracking-wider text-white">
        <span><span className="opacity-75">Validade:</span> <span className="font-bold">{formatDate(data.validUntil)}</span></span>
        <span className="truncate"><span className="opacity-75">Endereço:</span> <span className="font-bold">{data.churchAddress || "—"}</span></span>
      </div>
    </div>
  );
}

/* ---------- 3) Clássico ---------- */
function ClassicoTemplate({ data }: { data: MembershipCardData }) {
  return (
    <div
      className="relative h-full w-full text-amber-50"
      style={{ background: "linear-gradient(160deg,#0f1f3d 0%, #1a2e58 100%)" }}
    >
      <div
        className="absolute inset-3 rounded-xl"
        style={{ border: "1px solid #d4a857", boxShadow: "inset 0 0 0 3px #0f1f3d, inset 0 0 0 4px #d4a857" }}
      />
      <div className="relative flex items-center justify-between px-7 pt-6">
        <div className="flex items-center gap-3">
          {data.churchLogoUrl ? (
            <img src={data.churchLogoUrl} alt="" className="h-12 w-12 rounded object-contain ring-1 ring-[#d4a857]/60" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded ring-1 ring-[#d4a857]/60">
              <Cross className="h-6 w-6" style={{ color: "#d4a857" }} />
            </div>
          )}
          <div className="font-serif leading-tight">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-50/70">
              Membro Oficial
            </div>
            <div className="text-base font-bold uppercase tracking-wide" style={{ color: "#f4d58d" }}>
              {data.churchName}
            </div>
          </div>
        </div>
        {data.registrationNumber && <MatriculaBadge value={data.registrationNumber} tone="gold" />}
      </div>

      <div className="relative grid grid-cols-[140px_1fr] gap-5 px-7 pt-5">
        <div
          className="rounded p-1"
          style={{ background: "linear-gradient(135deg,#d4a857,#a07a2c)" }}
        >
          <Photo url={data.photoUrl} size={132} rounded="rounded-sm" innerRing="ring-1 ring-white/20" />
        </div>
        <div className="min-w-0 space-y-3 font-serif">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-amber-50/70">
              Nome completo
            </div>
            <div className="truncate text-lg font-bold" style={{ color: "#ffe4a3" }}>
              {data.fullName}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            <DataCell label="Nascimento" value={formatDate(data.birthDate)} tone="light" />
            <DataCell label="Batismo" value={formatDate(data.baptismDate)} tone="light" />
            <DataCell label="Função" value={data.role || "Membro"} tone="light" />
            <DataCell label="Validade" value={formatDate(data.validUntil)} tone="light" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-7 right-7 flex items-center justify-between font-serif text-[10px] uppercase tracking-wider text-amber-50/80">
        <span><span className="opacity-70">Emissão:</span> <span className="font-bold" style={{ color: "#ffe4a3" }}>{formatDate(data.issueDate)}</span></span>
        <span className="truncate"><span className="opacity-70">End.:</span> <span className="font-bold" style={{ color: "#ffe4a3" }}>{data.churchAddress || "—"}</span></span>
      </div>
    </div>
  );
}

/* ---------- 4) Premium ---------- */
function PremiumTemplate({ data }: { data: MembershipCardData }) {
  return (
    <div
      className="relative h-full w-full text-white"
      style={{
        background:
          "linear-gradient(135deg,#0b1a36 0%, #16315e 60%, #0b1a36 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-7 pt-6">
        <div className="flex items-center gap-3">
          {data.churchLogoUrl ? (
            <img src={data.churchLogoUrl} alt="" className="h-11 w-11 rounded-md object-contain ring-1 ring-[#d4af37]/50" />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-md ring-1 ring-[#d4af37]/50">
              <Cross className="h-6 w-6" style={{ color: "#e9c875" }} />
            </div>
          )}
          <div className="leading-tight">
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/60">
              Carteirinha Oficial
            </div>
            <div className="text-base font-bold uppercase tracking-wide" style={{ color: "#e9c875" }}>
              {data.churchName}
            </div>
          </div>
        </div>
        {data.registrationNumber && <MatriculaBadge value={data.registrationNumber} tone="gold" />}
      </div>

      {/* Body: photo + grid + QR */}
      <div className="grid grid-cols-[130px_1fr_72px] items-start gap-5 px-7 pt-5">
        <div
          className="rounded-xl p-[2px]"
          style={{ background: "linear-gradient(135deg,#f3d27a,#a87f2c)" }}
        >
          <Photo url={data.photoUrl} size={126} rounded="rounded-[10px]" innerRing="ring-1 ring-white/20" />
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
              Nome completo
            </div>
            <div className="truncate text-lg font-extrabold" style={{ color: "#fff7e0" }}>
              {data.fullName}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            <DataCell label="Nascimento" value={formatDate(data.birthDate)} tone="light" />
            <DataCell label="Batismo" value={formatDate(data.baptismDate)} tone="light" />
            <DataCell label="Função" value={data.role || "Membro"} tone="light" />
            <DataCell label="Validade" value={formatDate(data.validUntil)} tone="light" />
          </div>
        </div>

        <div className="grid h-[72px] w-[72px] place-items-center rounded-lg bg-white/95 ring-1 ring-[#d4af37]/40">
          <QrCode className="h-14 w-14 text-[#0b1a36]" />
        </div>
      </div>

      {/* Footer */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-7 py-2 text-[10px] font-bold uppercase tracking-wider text-[#0b1a36]"
        style={{ background: "linear-gradient(90deg,#d4af37,#f3d27a,#d4af37)" }}
      >
        <span><span className="opacity-70">Emissão:</span> {formatDate(data.issueDate)}</span>
        <span className="truncate"><span className="opacity-70">Endereço:</span> {data.churchAddress || "—"}</span>
      </div>
    </div>
  );
}
