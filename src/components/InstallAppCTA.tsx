import { useEffect, useState } from "react";
import { Smartphone, Download } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppCTA({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {deferred && !installed ? (
          <Button
            onClick={handleInstall}
            size="lg"
            className="h-12 bg-[#1E3A5F] px-6 text-white hover:bg-[#15294a]"
          >
            <Download className="mr-2 h-4 w-4" /> Instalar app de membro
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 border-[#1E3A5F]/30 bg-white px-6 text-[#1E3A5F] hover:bg-[#1E3A5F]/5"
          >
            <Link to="/auth">
              <Smartphone className="mr-2 h-4 w-4" /> Sou membro — entrar
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <section className="relative px-6 py-14">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#1E3A5F]/15 bg-gradient-to-br from-[#1E3A5F] to-[#2a5587] p-8 text-white shadow-[0_30px_80px_-30px_rgba(30,58,95,0.5)] sm:p-12">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Smartphone className="h-3.5 w-3.5 text-[#C8963E]" /> Aplicativo para membros
            </div>
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
              Instale o app e fique conectado à sua igreja
            </h2>
            <p className="mt-3 max-w-xl text-white/80">
              Acesse escalas, devocionais, avisos, check-in e contribuições direto do seu celular —
              sem ocupar espaço de loja.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {deferred && !installed ? (
              <Button
                onClick={handleInstall}
                size="lg"
                className="h-12 bg-[#C8963E] px-6 text-white shadow-lg hover:bg-[#b58432]"
              >
                <Download className="mr-2 h-4 w-4" /> Instalar agora
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="h-12 bg-[#C8963E] px-6 text-white shadow-lg hover:bg-[#b58432]"
              >
                <Link to="/auth">
                  <Smartphone className="mr-2 h-4 w-4" /> Entrar como membro
                </Link>
              </Button>
            )}
            <p className="text-center text-[11px] text-white/60">
              {installed
                ? "App já instalado ✓"
                : deferred
                  ? "Funciona no Chrome / Edge / Android"
                  : "iPhone: toque em Compartilhar → Adicionar à Tela de Início"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
