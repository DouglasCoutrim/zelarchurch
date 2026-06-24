import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Save, KeyRound, Mail, User as UserIcon, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { deleteMyAccount, deleteTenant } from "@/lib/account";
import {
  getProfile,
  upsertProfile,
  updatePassword,
  updateEmail,
  type UserProfile,
} from "@/lib/profile";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Meu perfil" }] }),
  component: ProfilePage,
});

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfilePage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;
  const email = session?.user.email ?? "";
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const resetTenant = useTenantStore((s) => s.reset);

  const [confirmAccountText, setConfirmAccountText] = useState("");
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [confirmTenantText, setConfirmTenantText] = useState("");
  const [tenantDeleting, setTenantDeleting] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    user_id: userId ?? "",
    full_name: "",
    phone: "",
    avatar_url: "",
  });

  const [newEmail, setNewEmail] = useState(email);
  const [emailSaving, setEmailSaving] = useState(false);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getProfile(userId)
      .then((p) => {
        if (p) setProfile({ ...p });
        else setProfile({ user_id: userId, full_name: "", phone: "", avatar_url: "" });
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleSaveProfile() {
    if (!userId) return;
    setSaving(true);
    try {
      await upsertProfile({ ...profile, user_id: userId });
      toast.success("Perfil atualizado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeEmail() {
    if (!newEmail || newEmail === email) return;
    setEmailSaving(true);
    try {
      await updateEmail(newEmail);
      toast.success("Enviamos um e-mail de confirmação para o novo endereço.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleChangePassword() {
    if (pw1.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (pw1 !== pw2) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setPwSaving(true);
    try {
      await updatePassword(pw1);
      setPw1("");
      setPw2("");
      toast.success("Senha alterada.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setAccountDeleting(true);
    try {
      await deleteMyAccount();
      resetTenant();
      toast.success("Conta excluída.");
      navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAccountDeleting(false);
    }
  }

  async function handleDeleteTenant() {
    if (!currentTenant) return;
    setTenantDeleting(true);
    try {
      await deleteTenant(currentTenant.id);
      resetTenant();
      toast.success("Igreja excluída.");
      navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTenantDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app"><ChevronLeft className="mr-1 h-4 w-4" />Painel</Link>
      </Button>

      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? email} />
          <AvatarFallback>{initials(profile.full_name, email)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile.full_name || "Meu perfil"}
          </h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><UserIcon className="mr-1 h-4 w-4" />Dados</TabsTrigger>
          <TabsTrigger value="email"><Mail className="mr-1 h-4 w-4" />E-mail</TabsTrigger>
          <TabsTrigger value="password"><KeyRound className="mr-1 h-4 w-4" />Senha</TabsTrigger>
          <TabsTrigger value="danger" className="data-[state=active]:text-destructive">
            <AlertTriangle className="mr-1 h-4 w-4" />Zona de perigo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações pessoais</CardTitle>
              <CardDescription>Visíveis aos administradores da sua igreja.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={profile.full_name ?? ""}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={profile.phone ?? ""}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <ImageUploadField
                        label="Foto de perfil"
                        value={profile.avatar_url}
                        onChange={(v) => setProfile({ ...profile, avatar_url: v ?? "" })}
                        maxSize={384}
                        shape="circle"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      <Save className="mr-1 h-4 w-4" />
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alterar e-mail</CardTitle>
              <CardDescription>
                Você receberá um link de confirmação no novo endereço.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Novo e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleChangeEmail}
                  disabled={emailSaving || !newEmail || newEmail === email}
                >
                  {emailSaving ? "Enviando..." : "Solicitar troca"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trocar senha</CardTitle>
              <CardDescription>Mínimo de 8 caracteres.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="pw1">Nova senha</Label>
                <Input
                  id="pw1"
                  type="password"
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pw2">Confirmar senha</Label>
                <Input
                  id="pw2"
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={pwSaving || !pw1 || !pw2}>
                  {pwSaving ? "Salvando..." : "Atualizar senha"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
