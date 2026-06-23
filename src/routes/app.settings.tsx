import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Pencil, Save, Shield, ShieldOff, UserCheck, UserX, X } from "lucide-react";
import { getCurrentPosition } from "@/lib/checkins";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  getTenant,
  listTeam,
  setMemberActive,
  setMemberAdmin,
  updateTenant,
  type TeamMember,
  type TenantFull,
} from "@/lib/tenantSettings";
import { useTenantStore } from "@/stores/tenantStore";
import { ImageUploadField } from "@/components/ImageUploadField";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Configurações" }] }),
  component: SettingsPage,
});

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Cuiaba",
  "America/Rio_Branco",
];
const LANGUAGES = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
];
const CURRENCIES = [
  { value: "BRL", label: "Real (R$)" },
  { value: "USD", label: "Dólar (US$)" },
  { value: "EUR", label: "Euro (€)" },
];

function SettingsPage() {
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const setCurrentTenant = useTenantStore((s) => s.setCurrentTenant);
  const [tenant, setTenant] = useState<TenantFull | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // form fields
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [language, setLanguage] = useState("pt-BR");
  const [currency, setCurrency] = useState("BRL");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [radius, setRadius] = useState<string>("200");
  const [locating, setLocating] = useState(false);

  function hydrateForm(t: TenantFull) {
    setName(t.name ?? "");
    setCnpj(t.cnpj ?? "");
    setEmail(t.email ?? "");
    setPhone(t.phone ?? "");
    setCity(t.city ?? "");
    setState(t.state ?? "");
    setWebsite(t.website ?? "");
    setLogoUrl(t.logo_url ?? "");
    setPrimaryColor(t.primary_color ?? "#0f172a");
    setTimezone(t.settings?.timezone ?? "America/Sao_Paulo");
    setLanguage(t.settings?.language ?? "pt-BR");
    setCurrency(t.settings?.currency ?? "BRL");
    setLatitude(t.latitude != null ? String(t.latitude) : "");
    setLongitude(t.longitude != null ? String(t.longitude) : "");
    setRadius(String(t.checkin_radius_meters ?? 200));
  }

  useEffect(() => {
    if (!currentTenant) return;
    setLoading(true);
    Promise.all([getTenant(currentTenant.id), listTeam(currentTenant.id)])
      .then(([t, members]) => {
        setTenant(t);
        setTeam(members);
        hydrateForm(t);
      })
      .catch((e) => {
        console.error("settings load error", e);
        toast.error(e.message ?? "Erro ao carregar configurações");
      })
      .finally(() => setLoading(false));
  }, [currentTenant]);

  async function handleSave() {
    if (!currentTenant) return;
    setSaving(true);
    try {
      const updated = await updateTenant(currentTenant.id, {
        name: name.trim(),
        cnpj: cnpj.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        website: website.trim() || null,
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor,
        latitude: latitude.trim() ? Number(latitude) : null,
        longitude: longitude.trim() ? Number(longitude) : null,
        checkin_radius_meters: radius.trim() ? Math.max(10, Number(radius)) : 200,
        settings: { timezone, language, currency },
      });
      setTenant(updated);
      setCurrentTenant({
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan_id: null,
        created_at: updated.created_at,
      });
      setEditing(false);
      toast.success("Configurações salvas");
    } catch (e) {
      console.error("settings save error", e);
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (tenant) hydrateForm(tenant);
    setEditing(false);
  }

  async function toggleAdmin(m: TeamMember) {
    try {
      await setMemberAdmin(m.id, !m.is_admin);
      setTeam((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_admin: !m.is_admin } : x)));
      toast.success(m.is_admin ? "Permissão de admin removida" : "Promovido a admin");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function toggleActive(m: TeamMember) {
    try {
      await setMemberActive(m.id, !m.is_active);
      setTeam((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_active: !m.is_active } : x)));
      toast.success(m.is_active ? "Usuário desativado" : "Usuário reativado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Preferências da organização, regional e equipe.
          </p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEdit} disabled={saving}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Editar dados da igreja
          </Button>
        )}
      </div>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organização</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="branding">Identidade visual</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-4 space-y-4">
          {!editing ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Dados da organização</CardTitle>
                  <CardDescription>Informações cadastrais e de contato.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <InfoField label="Nome" value={tenant?.name} />
                  <InfoField label="Slug" value={tenant?.slug} mono />
                  <InfoField label="CNPJ" value={tenant?.cnpj} />
                  <InfoField label="E-mail" value={tenant?.email} />
                  <InfoField label="Telefone" value={tenant?.phone} />
                  <InfoField label="Site" value={tenant?.website} />
                  <InfoField label="Cidade" value={tenant?.city} />
                  <InfoField label="UF" value={tenant?.state} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Localização da igreja (check-in)</CardTitle>
                  <CardDescription>
                    Ponto de referência e raio aceito para o check-in.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <InfoField
                    label="Latitude"
                    value={tenant?.latitude != null ? String(tenant.latitude) : null}
                  />
                  <InfoField
                    label="Longitude"
                    value={tenant?.longitude != null ? String(tenant.longitude) : null}
                  />
                  <InfoField
                    label="Raio (metros)"
                    value={tenant?.checkin_radius_meters != null ? String(tenant.checkin_radius_meters) : null}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Dados da organização</CardTitle>
                  <CardDescription>Informações cadastrais e de contato.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={tenant?.slug ?? ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Localização da igreja (check-in)</CardTitle>
                  <CardDescription>
                    Define o ponto de referência. O check-in só será aceito dentro do raio configurado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      inputMode="decimal"
                      placeholder="-23.5505"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      inputMode="decimal"
                      placeholder="-46.6333"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Raio (metros)</Label>
                    <Input
                      type="number"
                      min={10}
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={locating}
                      onClick={async () => {
                        setLocating(true);
                        try {
                          const pos = await getCurrentPosition();
                          setLatitude(String(pos.coords.latitude));
                          setLongitude(String(pos.coords.longitude));
                          toast.success("Localização capturada. Clique em Salvar.");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Erro ao obter localização");
                        } finally {
                          setLocating(false);
                        }
                      }}
                    >
                      <MapPin className="h-4 w-4" />
                      {locating ? "Obtendo..." : "Usar minha localização atual"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>



        <TabsContent value="regional" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional</CardTitle>
              <CardDescription>Fuso horário, idioma e moeda padrão.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Fuso horário</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Identidade visual</CardTitle>
              <CardDescription>Logo e cor principal da organização.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <ImageUploadField
                  label="Logo da igreja"
                  value={logoUrl || null}
                  onChange={(v) => setLogoUrl(v ?? "")}
                  maxSize={512}
                  shape="square"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor principal</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-16 p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipe</CardTitle>
              <CardDescription>
                Usuários com acesso a esta organização ({team.length}).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {team.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground truncate">
                            {m.user_id}
                          </span>
                          {m.is_owner && <Badge variant="default">Owner</Badge>}
                          {m.is_admin && !m.is_owner && <Badge variant="secondary">Admin</Badge>}
                          {!m.is_active && <Badge variant="outline">Inativo</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Desde {new Date(m.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      {!m.is_owner && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => toggleAdmin(m)}>
                            {m.is_admin ? (
                              <>
                                <ShieldOff className="h-4 w-4" />
                                Remover admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4" />
                                Promover
                              </>
                            )}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleActive(m)}>
                            {m.is_active ? (
                              <>
                                <UserX className="h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
