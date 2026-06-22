import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Music } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listInstruments, createInstrument, deleteInstrument,
  listMemberInstruments, setMemberInstrument, removeMemberInstrument,
  type Proficiency,
} from "@/lib/instruments";
import { getDepartmentMembers } from "@/lib/departments";
import { useTenantStore } from "@/stores/tenantStore";

export function DepartmentInstrumentsDialog({
  open, onOpenChange, departmentId, departmentName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departmentId: string | null;
  departmentName: string;
}) {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);
  const [newInst, setNewInst] = useState("");
  const [newReq, setNewReq] = useState(true);

  const instQ = useQuery({
    queryKey: ["dept-instruments", departmentId],
    enabled: !!departmentId && open,
    queryFn: () => listInstruments(departmentId!),
  });

  const membersQ = useQuery({
    queryKey: ["department-members", departmentId],
    enabled: !!departmentId && open,
    queryFn: () => getDepartmentMembers(departmentId!),
  });

  const memberInstQ = useQuery({
    queryKey: ["member-instruments", departmentId],
    enabled: !!departmentId && open,
    queryFn: () => listMemberInstruments(departmentId!),
  });

  const addInstMut = useMutation({
    mutationFn: () => createInstrument(tenant!.id, departmentId!, newInst.trim(), newReq),
    onSuccess: () => { setNewInst(""); qc.invalidateQueries({ queryKey: ["dept-instruments", departmentId] }); },
  });

  const delInstMut = useMutation({
    mutationFn: (id: string) => deleteInstrument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dept-instruments", departmentId] }),
  });

  const setMiMut = useMutation({
    mutationFn: ({ memberId, instrumentId, proficiency }: { memberId: string; instrumentId: string; proficiency: Proficiency }) =>
      setMemberInstrument(tenant!.id, memberId, instrumentId, proficiency),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member-instruments", departmentId] }),
  });

  const rmMiMut = useMutation({
    mutationFn: ({ memberId, instrumentId }: { memberId: string; instrumentId: string }) =>
      removeMemberInstrument(memberId, instrumentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member-instruments", departmentId] }),
  });

  function getProf(memberId: string, instrumentId: string): Proficiency | null {
    const r = (memberInstQ.data ?? []).find((x) => x.member_id === memberId && x.instrument_id === instrumentId);
    return r?.proficiency ?? null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" /> Instrumentos · {departmentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Instrumentos do departamento</h3>
            <div className="flex gap-2">
              <Input placeholder="Ex: Bateria" value={newInst} onChange={(e) => setNewInst(e.target.value)} />
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={newReq} onCheckedChange={(c) => setNewReq(!!c)} />
                Obrigatório
              </label>
              <Button size="sm" onClick={() => addInstMut.mutate()} disabled={!newInst.trim() || addInstMut.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(instQ.data ?? []).map((i) => (
                <Badge key={i.id} variant={i.required ? "default" : "secondary"} className="gap-1">
                  {i.name}
                  <button onClick={() => delInstMut.mutate(i.id)} className="ml-1 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Atribuições por membro</h3>
            <div className="border rounded-md overflow-x-auto">
              <table className="text-sm w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2">Membro</th>
                    {(instQ.data ?? []).map((i) => (
                      <th key={i.id} className="text-left p-2">{i.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(membersQ.data ?? []).map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="p-2">{m.full_name}</td>
                      {(instQ.data ?? []).map((i) => {
                        const prof = getProf(m.id, i.id);
                        return (
                          <td key={i.id} className="p-2">
                            <Select
                              value={prof ?? "none"}
                              onValueChange={(v) => {
                                if (v === "none") rmMiMut.mutate({ memberId: m.id, instrumentId: i.id });
                                else setMiMut.mutate({ memberId: m.id, instrumentId: i.id, proficiency: v as Proficiency });
                              }}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                <SelectItem value="principal">Principal</SelectItem>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="substituto">Substituto</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
