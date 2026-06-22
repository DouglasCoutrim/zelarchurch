import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { listCongregations } from "@/lib/congregations";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { MEMBER_STATUS_OPTIONS, type MemberStatus } from "@/types/member";
import {
  createMember, updateMember,
  type MemberAddress, type MemberFormInput, type MemberRecord,
} from "@/lib/member-record";
import { useTenantStore } from "@/stores/tenantStore";
import { ImageUploadField } from "@/components/ImageUploadField";

const EMPTY: MemberFormInput = {
  full_name: "", cpf: null, rg: null, birth_date: null, gender: null, marital_status: null,
  email: null, phone: null, whatsapp: null, address: null, photo_url: null,
  baptism_date: null, join_date: null, member_type: null, church_role: null,
  spiritual_gifts: null, status: "ativo" as MemberStatus, notes: null,
  is_intercessor: false, congregation_id: null,
};

function toInput(m: MemberRecord): MemberFormInput {
  const { id: _id, tenant_id: _t, created_at: _c, ...rest } = m;
  return rest;
}

export function MemberForm({ initial }: { initial?: MemberRecord }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [form, setForm] = useState<MemberFormInput>(initial ? toInput(initial) : EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data: congregations } = useQuery({
    queryKey: ["congregations", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => listCongregations(currentTenant!.id),
  });
  const activeCongregations = (congregations ?? []).filter(
    (c) => c.is_active || c.id === form.congregation_id,
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error("Sem área de trabalho ativa");
      if (!form.full_name.trim()) throw new Error("Nome completo é obrigatório");
      return initial
        ? updateMember(initial.id, form)
        : createMember(currentTenant.id, form);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", saved.id] });
      queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
      navigate({ to: "/app/members/$id", params: { id: saved.id } });
    },
    onError: (e: Error) => setError(e.message),
  });

  function set<K extends keyof MemberFormInput>(key: K, value: MemberFormInput[K]) {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setAddr<K extends keyof MemberAddress>(key: K, value: string) {
    setForm((f) => {
      const next = { ...(f.address ?? {}), [key]: value || undefined };
      const empty = Object.values(next).every((v) => !v);
      return { ...f, address: empty ? null : (next as MemberAddress) };
    });
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className="space-y-6"
    >
      <Tabs defaultValue="pessoal">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
          <TabsTrigger value="contato">Contato</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="igreja">Igreja</TabsTrigger>
          <TabsTrigger value="obs">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="pessoal">
          <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <Field label="Nome completo *" value={form.full_name}
              onChange={(v) => set("full_name", v)} required className="sm:col-span-2" />
            <Field label="CPF" value={form.cpf ?? ""} onChange={(v) => set("cpf", v || null)} />
            <Field label="RG" value={form.rg ?? ""} onChange={(v) => set("rg", v || null)} />
            <Field label="Data de nascimento" type="date" value={form.birth_date ?? ""}
              onChange={(v) => set("birth_date", v || null)} />
            <SelectField label="Gênero" value={form.gender ?? ""}
              onChange={(v) => set("gender", v || null)}
              options={[
                { value: "masculino", label: "Masculino" },
                { value: "feminino", label: "Feminino" },
                { value: "outro", label: "Outro" },
              ]} />
            <SelectField label="Estado civil" value={form.marital_status ?? ""}
              onChange={(v) => set("marital_status", v || null)}
              options={[
                { value: "solteiro", label: "Solteiro(a)" },
                { value: "casado", label: "Casado(a)" },
                { value: "divorciado", label: "Divorciado(a)" },
                { value: "viuvo", label: "Viúvo(a)" },
                { value: "uniao_estavel", label: "União estável" },
              ]} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="contato">
          <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <Field label="E-mail" type="email" value={form.email ?? ""}
              onChange={(v) => set("email", v || null)} />
            <Field label="Telefone" value={form.phone ?? ""} onChange={(v) => set("phone", v || null)} />
            <Field label="WhatsApp" value={form.whatsapp ?? ""}
              onChange={(v) => set("whatsapp", v || null)} />
            <div className="sm:col-span-2">
              <ImageUploadField
                label="Foto do membro"
                value={form.photo_url}
                onChange={(v) => set("photo_url", v)}
                maxSize={512}
                shape="circle"
              />
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="endereco">
          <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <Field label="Rua" value={form.address?.street ?? ""}
              onChange={(v) => setAddr("street", v)} className="sm:col-span-2" />
            <Field label="Número" value={form.address?.number ?? ""}
              onChange={(v) => setAddr("number", v)} />
            <Field label="Complemento" value={form.address?.complement ?? ""}
              onChange={(v) => setAddr("complement", v)} />
            <Field label="Bairro" value={form.address?.neighborhood ?? ""}
              onChange={(v) => setAddr("neighborhood", v)} />
            <Field label="CEP" value={form.address?.zip ?? ""}
              onChange={(v) => setAddr("zip", v)} />
            <Field label="Cidade" value={form.address?.city ?? ""}
              onChange={(v) => setAddr("city", v)} />
            <Field label="UF" value={form.address?.state ?? ""} maxLength={2}
              onChange={(v) => setAddr("state", v.toUpperCase())} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="igreja">
          <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <Field label="Data de batismo" type="date" value={form.baptism_date ?? ""}
              onChange={(v) => set("baptism_date", v || null)} />
            <Field label="Data de ingresso" type="date" value={form.join_date ?? ""}
              onChange={(v) => set("join_date", v || null)} />
            <SelectField label="Tipo de membro" value={form.member_type ?? ""}
              onChange={(v) => set("member_type", v || null)}
              options={[
                { value: "membro", label: "Membro" },
                { value: "congregado", label: "Congregado" },
                { value: "visitante", label: "Visitante" },
                { value: "obreiro", label: "Obreiro" },
              ]} />
            <Field label="Cargo na igreja" value={form.church_role ?? ""}
              onChange={(v) => set("church_role", v || null)} />
            <div className="space-y-1.5">
              <Label>Congregação</Label>
              <Select
                value={form.congregation_id ?? "__sede"}
                onValueChange={(v) => set("congregation_id", v === "__sede" ? null : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__sede">Sede</SelectItem>
                  {activeCongregations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {!c.is_active ? " (inativa)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SelectField label="Status" value={form.status}
              onChange={(v) => set("status", v as MemberStatus)}
              options={MEMBER_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              clearable={false} />
            <Field label="Dons espirituais (separe por vírgula)"
              value={(form.spiritual_gifts ?? []).join(", ")}
              onChange={(v) =>
                set("spiritual_gifts",
                  v.split(",").map((s) => s.trim()).filter(Boolean).length
                    ? v.split(",").map((s) => s.trim()).filter(Boolean)
                    : null)
              } className="sm:col-span-2" />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="obs">
          <Card><CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="is_intercessor" className="font-medium">
                  Intercessor
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receberá notificações de pedidos de oração da igreja.
                </p>
              </div>
              <input
                id="is_intercessor"
                type="checkbox"
                className="h-5 w-5 accent-primary"
                checked={!!form.is_intercessor}
                onChange={(e) => set("is_intercessor", e.target.checked)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" rows={6} value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value || null)} />
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível salvar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/members" })}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar membro"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, type = "text", required, maxLength, className,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; maxLength?: number; className?: string;
}) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} required={required} maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({
  label, value, onChange, options, clearable = true,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; clearable?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          {clearable && <SelectItem value="__none">— Nenhum —</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
