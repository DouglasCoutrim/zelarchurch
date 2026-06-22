import { forwardRef } from "react";
import { Cross, User, QrCode } from "lucide-react";

export type CardTemplate = "vitral" | "minimal" | "classico" | "premium";

export interface MembershipCardData {
  fullName: string;
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
  { value: "vitral", label: "Vitral", description: "Vibrante com mosaico em tons quentes." },
  { value: "minimal", label: "Minimalista", description: "Limpo e moderno em azul claro." },
  { value: "classico", label: "Clássico", description: "Sobrio em azul marinho e dourado." },
  { value: "premium", label: "Premium", description: "Elegante com molduras douradas." },
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
        {template === "vitral" && <VitralTemplate data={data} />}
        {template === "minimal" && <MinimalTemplate data={data} />}
        {template === "classico" && <ClassicoTemplate data={data} />}
        {template === "premium" && <PremiumTemplate data={data} />}
      </div>
    );
  },
);

function Photo({ url, size = 140, rounded = "rounded-xl", ring = "" }: {
  url?: string | null; size?: number; rounded?: string; ring?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-slate-200 ${rounded} ${ring}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="Foto do membro" className="h-full w-full object-cover" />
      ) : (
        <User className="h-1/2 w-1/2 text-slate-400" />
      )}
    </div>
  );
}

/* ---------------- Template 1 — Vitral ---------------- */
function VitralTemplate({ data }: { data: MembershipCardData }) {
  return (
    <div
      className="relative h-full w-full text-slate-900"
      style={{
        background:
          "linear-gradient(135deg, #fff4e6 0%, #ffe0b3 40%, #ffb766 100%)",
      }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 640 400" preserveAspectRatio="none">
        <polygon points="0,0 220,0 140,160 0,180" fill="#ffb347" />
        <polygon points="220,0 420,0 360,140 140,160" fill="#ffd28a" />
        <polygon points="420,0 640,0 640,180 360,140" fill="#ff9a3c" />
        <polygon points="0,180 140,160 200,400 0,400" fill="#ffcc80" />
        <polygon points="500,200 640,180 640,400 460,400" fill="#ff8a3d" />
      </svg>
      <div className="relative flex h-[110px] items-center gap-3 px-6">
        {data.churchLogoUrl ? (
          <img src={data.churchLogoUrl} alt="" className="h-14 w-14 rounded-lg object-contain" />
        ) : (
          <Cross className="h-12 w-12 text-orange-700" />
        )}
        <div className="text-white drop-shadow">
          <div className="text-2xl font-bold uppercase tracking-wide">{data.churchName}</div>
          <div className="text-sm opacity-90">Comunidade Cristã</div>
        </div>
      </div>
      <div className="relative flex gap-5 px-6 pt-2">
        <Photo url={data.photoUrl} size={140} rounded="rounded-xl" ring="ring-2 ring-orange-500" />
        <div className="space-y-2 text-sm">
          <Field label="NOME COMPLETO" value={data.fullName} bold />
          <Field label="DATA DE NASCIMENTO" value={formatDate(data.birthDate)} />
          <Field label="DATA DE BATISMO" value={formatDate(data.baptismDate)} />
          <Field label="FUNÇÃO NA IGREJA" value={data.role || "Membro"} />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-orange-500/90 px-6 py-2 text-[11px] font-medium text-white">
        <div>
          <strong>EMISSÃO:</strong> {formatDate(data.issueDate)} {" | "}
          <strong>VALIDADE:</strong> {formatDate(data.validUntil)} {" | "}
          <strong>ENDEREÇO:</strong>
        </div>
        <div className="truncate">{data.churchAddress || "—"}</div>
      </div>
    </div>
  );
}

/* ---------------- Template 2 — Minimalista ---------------- */
function MinimalTemplate({ data }: { data: MembershipCardData }) {
  return (
    <div className="relative h-full w-full bg-white text-slate-800">
      <div className="flex items-center gap-3 px-6 pt-6">
        {data.churchLogoUrl ? (
          <img src={data.churchLogoUrl} alt="" className="h-12 w-12 rounded-full object-contain ring-2 ring-sky-400" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 ring-2 ring-sky-400">
            <Cross className="h-6 w-6 text-sky-500" />
          </div>
        )}
        <div>
          <div className="text-xl font-bold uppercase text-sky-500">{data.churchName}</div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Membro Oficial</div>
        </div>
      </div>
      <div className="mt-5 flex gap-5 px-6">
        <div className="flex flex-col items-center gap-1">
          <Photo url={data.photoUrl} size={120} rounded="rounded-full" ring="ring-4 ring-sky-100" />
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Foto do membro</span>
        </div>
        <div className="flex-1 space-y-2 text-sm">
          <MinRow label="NOME COMPLETO" value={data.fullName.toUpperCase()} />
          <MinRow label="FUNÇÃO" value={(data.role || "MEMBRO").toUpperCase()} />
          <div className="grid grid-cols-2 gap-3">
            <MinRow label="NASCIMENTO" value={formatDate(data.birthDate)} />
            <MinRow label="BATISMO" value={formatDate(data.baptismDate)} />
            <MinRow label="EMISSÃO" value={formatDate(data.issueDate)} />
            <MinRow label="VALIDADE" value={formatDate(data.validUntil)} />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-sky-400 px-6 py-2 text-center text-[11px] text-white">
        <strong>ENDEREÇO DA IGREJA:</strong> {data.churchAddress || "—"}
      </div>
    </div>
  );
}
function MinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-sky-100 pb-1">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-bold text-slate-800">{value}</div>
    </div>
  );
}

/* ---------------- Template 3 — Clássico ---------------- */
function ClassicoTemplate({ data }: { data: MembershipCardData }) {
  return (
    <div className="relative h-full w-full" style={{ backgroundColor: "#0f1f3d", color: "#f4d58d" }}>
      <div
        className="absolute inset-3 rounded-xl"
        style={{ border: "1px solid #d4a857", boxShadow: "inset 0 0 0 3px #0f1f3d, inset 0 0 0 4px #d4a857" }}
      />
      <div className="relative flex items-center gap-4 px-8 pt-6">
        {data.churchLogoUrl ? (
          <img src={data.churchLogoUrl} alt="" className="h-14 w-14 object-contain" />
        ) : (
          <Cross className="h-12 w-12" style={{ color: "#d4a857" }} />
        )}
        <div className="font-serif">
          <div className="text-xl font-bold uppercase leading-tight">{data.churchName}</div>
          <div className="text-xs opacity-80">Membro Oficial</div>
        </div>
      </div>
      <div className="relative mt-4 flex gap-5 px-8">
        <div
          className="rounded p-1"
          style={{ background: "linear-gradient(135deg,#d4a857,#a07a2c)" }}
        >
          <Photo url={data.photoUrl} size={130} rounded="rounded" />
        </div>
        <div className="flex-1 space-y-1.5 font-serif text-sm">
          <ClassRow label="Nome completo" value={data.fullName} />
          <ClassRow label="Data de Nascimento" value={formatDate(data.birthDate)} />
          <ClassRow label="Data de Batismo" value={formatDate(data.baptismDate)} />
          <ClassRow label="Função na Igreja" value={data.role || "Membro"} />
          <ClassRow label="Data de Emissão" value={formatDate(data.issueDate)} />
          <ClassRow label="Validade" value={formatDate(data.validUntil)} />
        </div>
      </div>
      <div className="absolute bottom-4 left-8 right-8 truncate font-serif text-xs">
        {data.churchAddress || "—"}
      </div>
    </div>
  );
}
function ClassRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="opacity-80">{label}: </span>
      <span className="font-bold" style={{ color: "#ffe4a3" }}>{value}</span>
    </div>
  );
}

/* ---------------- Template 4 — Premium ---------------- */
function PremiumTemplate({ data }: { data: MembershipCardData }) {
  return (
    <div
      className="relative h-full w-full text-amber-100"
      style={{
        background:
          "radial-gradient(circle at 70% 30%, #1e3a6b 0%, #0b1a36 60%, #060d20 100%)",
      }}
    >
      <Cross className="absolute right-8 top-16 h-40 w-40 opacity-10" />
      <div className="relative flex items-center justify-center gap-3 pt-5">
        {data.churchLogoUrl ? (
          <img src={data.churchLogoUrl} alt="" className="h-10 w-10 object-contain" />
        ) : (
          <Cross className="h-8 w-8" style={{ color: "#d4af37" }} />
        )}
        <div className="text-center">
          <div className="text-2xl font-bold uppercase" style={{ color: "#e9c875" }}>
            {data.churchName}
          </div>
          <div className="text-xs opacity-80">Comunidade Cristã</div>
        </div>
      </div>
      <div className="relative mt-4 flex items-start gap-5 px-6">
        <div className="flex flex-col items-center">
          <div
            className="rounded-full p-1"
            style={{ background: "linear-gradient(135deg,#f3d27a,#a87f2c)" }}
          >
            <Photo url={data.photoUrl} size={120} rounded="rounded-full" />
          </div>
          <div className="mt-2 text-center text-base font-bold uppercase" style={{ color: "#e9c875" }}>
            {data.fullName}
          </div>
        </div>
        <div className="flex-1 space-y-2 pt-2">
          <PremiumPill label="Data de Nascimento" value={formatDate(data.birthDate)} />
          <PremiumPill label="Data de Batismo" value={formatDate(data.baptismDate)} />
          <PremiumPill label="Função na Igreja" value={data.role || "Membro"} />
          <div className="ml-auto flex h-12 w-12 items-center justify-center rounded bg-amber-100">
            <QrCode className="h-10 w-10 text-slate-900" />
          </div>
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-2 px-6 py-2 text-[11px] text-slate-900"
        style={{ background: "linear-gradient(90deg,#d4af37,#f3d27a,#d4af37)" }}
      >
        <div>
          <div className="font-bold uppercase">Emissão</div>
          <div>{formatDate(data.issueDate)}</div>
        </div>
        <div>
          <div className="font-bold uppercase">Validade</div>
          <div>{formatDate(data.validUntil)}</div>
        </div>
        <div className="truncate">
          <div className="font-bold uppercase">Endereço</div>
          <div className="truncate">{data.churchAddress || "—"}</div>
        </div>
      </div>
    </div>
  );
}
function PremiumPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-full px-3 py-1.5 text-xs"
      style={{
        background: "linear-gradient(90deg, rgba(212,175,55,0.85), rgba(168,127,44,0.85))",
        color: "#0b1a36",
      }}
    >
      <span className="font-bold">{label}:</span> <span className="font-semibold">{value}</span>
    </div>
  );
}

/* ---------------- Shared field ---------------- */
function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{label}:</div>
      <div className={bold ? "text-lg font-bold text-slate-900" : "text-base font-semibold text-slate-900"}>
        {value}
      </div>
    </div>
  );
}
