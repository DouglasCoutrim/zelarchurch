import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { APP_NAME } from "@/config/constants";
import logoAsset from "@/assets/logo-zelar.svg.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Entrar — ${APP_NAME}` },
      {
        name: "description",
        content: "Acesse sua conta Zelar e gerencie sua igreja com facilidade.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) navigate({ to: "/select-tenant", replace: true });
  }, [session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fn =
        mode === "signin"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/app` },
            });
      const { error } = await fn;
      if (error) throw error;
      navigate({ to: "/select-tenant", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel da marca */}
      <aside className="relative hidden overflow-hidden gradient-navy lg:block">
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1600&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-gold/20 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-emerald/20 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoAsset.url} alt="Zelar" className="h-10 w-auto" />
            <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
          </Link>

          <div className="max-w-md space-y-6 page-enter">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
              Gestão com Fidelidade
            </span>
            <h2 className="text-4xl font-bold leading-tight">
              Bem-vindo de volta à<br />
              <span className="text-brand-gold">administração da sua igreja</span>
            </h2>
            <p className="text-white/75">
              Tudo organizado em um só lugar — membros, finanças, escalas e ministérios — com a
              confiança de uma plataforma feita por quem entende a obra.
            </p>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <ShieldCheck className="h-4 w-4 text-brand-emerald" />
              Criptografia LGPD-ready · backup automático diário
            </div>
          </div>

          <p className="text-xs text-white/40">© {new Date().getFullYear()} {APP_NAME}.</p>
        </div>
      </aside>

      {/* Formulário */}
      <main className="relative flex items-center justify-center gradient-mesh px-4 py-10">
        <div className="w-full max-w-md page-enter">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <img src={logoAsset.url} alt={APP_NAME} className="h-10 w-auto" />
          </Link>
          <div className="rounded-2xl glass-strong p-8 shadow-elevated">
            <div className="mb-6 space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {mode === "signin" ? "Entrar na sua conta" : "Criar conta"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Informe suas credenciais para continuar."
                  : "Comece a usar sua área de trabalho em segundos."}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
                {loading ? "Aguarde..." : mode === "signin" ? "Entrar agora" : "Criar minha conta"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin"
                  ? "Não tem uma conta? Cadastre-se"
                  : "Já tem uma conta? Entrar"}
              </Button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao continuar você aceita os{" "}
            <Link to="/" className="underline hover:text-primary">termos</Link> da plataforma.
          </p>
        </div>
      </main>
    </div>
  );
}
