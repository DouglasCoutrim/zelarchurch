import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Congregation,
  CongregationInput,
  canAddCongregation,
  createCongregation,
  getCongregationsUsage,
  listMemberOptions,
  updateCongregation,
} from "@/lib/congregations";

const NONE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  initial: Congregation | null;
}

export function CongregationForm({ open, onOpenChange, tenantId, initial }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CongregationInput>({ name: "" });

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        address: initial?.address ?? "",
        city: initial?.city ?? "",
        state: initial?.state ?? "",
        phone: initial?.phone ?? "",
        responsible_id: initial?.responsible_id ?? null,
        is_active: initial?.is_active ?? true,
      });
    }
  }, [open, initial]);

  const { data: members } = useQuery({
    queryKey: ["member-options", tenantId],
    enabled: open && !!tenantId,
    queryFn: () => listMemberOptions(tenantId),
  });

  const { data: usage } = useQuery({
    queryKey: ["congregations-usage", tenantId],
    enabled: open && !!tenantId,
    queryFn: () => getCongregationsUsage(tenantId),
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.name?.trim()) throw new Error("Nome é obrigatório.");
      const state = (form.state ?? "").toUpperCase().slice(0, 2);
      const payload: CongregationInput = {
        name: form.name.trim(),
        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        state: state || null,
        phone: form.phone?.trim() || null,
        responsible_id: form.responsible_id || null,
        is_active: form.is_active ?? true,
      };
      if (initial) return updateCongregation(initial.id, payload);
      if (!canAddCongregation(usage)) {
        throw new Error("Limite do plano atingido para congregações.");
      }
      return createCongregation(tenantId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["congregations", tenantId] });
      qc.invalidateQueries({ queryKey: ["congregations-usage", tenantId] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar congregação" : "Nova congregação"}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? "Atualize os dados da congregação."
              : "Cadastre uma nova filial vinculada à sua igreja."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nome *</Label>
            <Input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-address">Endereço</Label>
            <Textarea
              id="c-address"
              rows={2}
              value={form.address ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="c-city">Cidade</Label>
              <Input
                id="c-city"
                value={form.city ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-state">UF</Label>
              <Input
                id="c-state"
                maxLength={2}
                value={form.state ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Telefone</Label>
            <Input
              id="c-phone"
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select
              value={form.responsible_id ?? NONE}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, responsible_id: v === NONE ? null : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Nenhum —</SelectItem>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {initial && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Ativa
            </label>
          )}

          {mut.error && (
            <Alert variant="destructive">
              <AlertDescription>{(mut.error as Error).message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
