export type MemberStatus = "ativo" | "inativo" | "afastado" | "visitante" | "excluido";

export const MEMBER_STATUS_OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "afastado", label: "Afastado" },
  { value: "visitante", label: "Visitante" },
  { value: "excluido", label: "Excluído" },
];

export interface MemberListRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: MemberStatus;
  member_type: string | null;
  photo_url: string | null;
  created_at: string;
  congregation_id: string | null;
  congregation?: { id: string; name: string } | null;
}
