import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  Check,
  Users,
  Wallet,
  CalendarDays,
  GraduationCap,
  ClipboardCheck,
  ShieldCheck,
  Megaphone,
  Boxes,
  BarChart3,
  FileText,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  Plus,
  Building2,
  HeartHandshake,
  TrendingUp,
  Lock,
  Quote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/constants";
import logoAsset from "@/assets/logo-zelar.svg.asset.json";
import faviconAsset from "@/assets/favicon-zelar.svg.asset.json";

const SITE_URL = "https://zelarchurch.lovable.app";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Plataforma completa para administrar membros, departamentos, finanças, escalas, EBD e patrimônio da sua igreja.",
  url: SITE_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BRL", description: "14 dias grátis" },
  publisher: { "@type": "Organization", name: APP_NAME, url: SITE_URL },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Gestão com Fidelidade para sua igreja` },
      {
        name: "description",
        content:
          "Plataforma completa para administrar membros, finanças, escalas, EBD e patrimônio da sua igreja. 14 dias grátis, sem cartão.",
      },
      { property: "og:title", content: `${APP_NAME} — Gestão com Fidelidade` },
      {
        property: "og:description",
        content: "Toda a gestão da sua igreja em um só lugar. Comece grátis por 14 dias.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(STRUCTURED_DATA) }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fafaf7] text-[#0f1f3a]">
      <SiteHeader />
      <Hero />
      <TrustBar />
      <FeaturesZ />
      <ModulesBento />
      <Testimonials />
      <Faq />
      <CtaSection />
      <SiteFooter />
    </div>
  );
}

/* ---------------- Header ---------------- */
function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(30,58,95,0.15)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2" aria-label={APP_NAME}>
          <img src={logoAsset.url} alt={APP_NAME} className="h-14 w-auto sm:h-16" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {[
            { href: "#funcionalidades", label: "Funcionalidades" },
            { href: "#modulos", label: "Módulos" },
            { href: "#depoimentos", label: "Depoimentos" },
            { href: "#faq", label: "Dúvidas" },
          ].map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="relative text-sm font-medium text-[#0f1f3a]/70 transition-colors hover:text-[#1E3A5F] after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-[#C8963E] after:transition-all hover:after:w-full"
            >
              {n.label}
            </a>
          ))}
          <Link to="/pricing" className="text-sm font-medium text-[#0f1f3a]/70 transition-colors hover:text-[#1E3A5F]">
            Planos
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-[#1E3A5F] hover:bg-[#1E3A5F]/5">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-[#C8963E] text-white shadow-[0_8px_24px_-8px_rgba(200,150,62,0.6)] transition-all hover:-translate-y-0.5 hover:bg-[#b58432] hover:shadow-[0_12px_30px_-8px_rgba(200,150,62,0.7)]"
          >
            <Link to="/register">Criar conta</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      {/* Gradient mesh background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(30,58,95,0.18),transparent_70%)] blur-2xl" />
        <div className="absolute -top-20 right-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(200,150,62,0.22),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_center,rgba(30,58,95,0.12),transparent_70%)] blur-2xl" />
        {/* abstract hex */}
        <svg className="absolute right-10 top-20 h-40 w-40 opacity-20" viewBox="0 0 100 100" fill="none">
          <polygon points="50,5 90,27 90,73 50,95 10,73 10,27" stroke="#1E3A5F" strokeWidth="0.6" />
          <polygon points="50,20 78,35 78,65 50,80 22,65 22,35" stroke="#C8963E" strokeWidth="0.6" />
        </svg>
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-[1.05fr_1fr]">
        {/* Left text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#1E3A5F]/15 bg-white/60 px-4 py-1.5 text-xs font-medium text-[#1E3A5F] backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#C8963E]" />
            14 dias grátis · sem cartão de crédito
          </div>
          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight text-[#1E3A5F] sm:text-6xl lg:text-[4.2rem]">
            Gestão com{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#C8963E] to-[#e0b35a] bg-clip-text text-transparent">
                Fidelidade
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10" preserveAspectRatio="none">
                <path d="M2 7 Q 100 0, 198 7" stroke="#C8963E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </span>{" "}
            para sua igreja.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#0f1f3a]/70">
            Membros, finanças, escalas, EBD, patrimônio e conselho fiscal — tudo desenhado para igrejas locais brasileiras, com a seriedade que o ministério merece.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="group h-12 bg-[#C8963E] px-7 text-base text-white shadow-[0_14px_40px_-12px_rgba(200,150,62,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#b58432] hover:shadow-[0_20px_50px_-12px_rgba(200,150,62,0.85)]"
            >
              <Link to="/register">
                Começar grátis
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-[#1E3A5F]/20 bg-white/60 px-7 text-base text-[#1E3A5F] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#1E3A5F]/40 hover:bg-white"
            >
              <Link to="/pricing">Ver planos</Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-6 text-xs text-[#0f1f3a]/60">
            <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-[#1E3A5F]" /> LGPD</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[#1E3A5F]" /> Dados criptografados</div>
            <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#1E3A5F]" /> Sem fidelidade</div>
          </div>
        </motion.div>

        {/* Right floating mockup */}
        <motion.div style={{ y }} className="relative">
          <FloatingDashboard />
        </motion.div>
      </div>
    </section>
  );
}

function FloatingDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
      className="relative mx-auto w-full max-w-[560px]"
    >
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* Main glass card */}
        <div className="relative rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_30px_80px_-20px_rgba(30,58,95,0.35)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-[#1E3A5F]/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <div className="text-xs font-medium text-[#1E3A5F]/60">Painel · Igreja Central</div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { l: "Membros", v: "1.284", c: "#1E3A5F" },
              { l: "Dízimos", v: "R$ 84k", c: "#C8963E" },
              { l: "Escalas", v: "37", c: "#1E3A5F" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-white/80 p-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-wide text-[#0f1f3a]/50">{s.l}</div>
                <div className="mt-1 text-xl font-bold" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#2a5587] p-4 text-white">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium opacity-80">Arrecadação · Últimos 6 meses</span>
              <TrendingUp className="h-3.5 w-3.5 text-[#C8963E]" />
            </div>
            <svg viewBox="0 0 200 60" className="h-16 w-full">
              <defs>
                <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#C8963E" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#C8963E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,45 L30,38 L60,42 L90,28 L120,32 L150,18 L180,22 L200,10 L200,60 L0,60 Z" fill="url(#g)" />
              <path d="M0,45 L30,38 L60,42 L90,28 L120,32 L150,18 L180,22 L200,10" stroke="#C8963E" strokeWidth="2" fill="none" />
            </svg>
          </div>

          <div className="mt-4 space-y-2">
            {[
              { n: "Culto de Domingo", t: "10:00", b: "#C8963E" },
              { n: "Ensaio do Louvor", t: "Sáb 19:00", b: "#1E3A5F" },
            ].map((e) => (
              <div key={e.n} className="flex items-center gap-3 rounded-lg bg-white/80 p-2.5">
                <div className="h-8 w-1 rounded-full" style={{ background: e.b }} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#1E3A5F]">{e.n}</div>
                  <div className="text-[11px] text-[#0f1f3a]/50">{e.t}</div>
                </div>
                <CalendarDays className="h-4 w-4 text-[#1E3A5F]/40" />
              </div>
            ))}
          </div>
        </div>

        {/* Floating chip card 1 */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -left-8 top-24 hidden rounded-2xl border border-white/60 bg-white/80 p-3 shadow-xl backdrop-blur-xl sm:block"
        >
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <HeartHandshake className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#0f1f3a]/50">Novo membro</div>
              <div className="text-xs font-semibold text-[#1E3A5F]">Maria Souza</div>
            </div>
          </div>
        </motion.div>

        {/* Floating chip card 2 */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -right-6 bottom-16 hidden rounded-2xl border border-white/60 bg-white/85 p-3 shadow-xl backdrop-blur-xl sm:block"
        >
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#C8963E]/15 text-[#C8963E]">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#0f1f3a]/50">Oferta registrada</div>
              <div className="text-xs font-semibold text-[#1E3A5F]">+ R$ 2.430,00</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Trust bar with counters ---------------- */
function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const mv = useMotionValue(0);
  const sv = useSpring(mv, { duration: 1800, bounce: 0 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (inView) mv.set(to);
    const u = sv.on("change", (v) => setVal(Math.round(v)));
    return () => u();
  }, [inView, to, mv, sv]);
  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

function TrustBar() {
  const stats = [
    { icon: Building2, to: 300, suffix: "+", l: "igrejas cadastradas" },
    { icon: Users, to: 50000, suffix: "+", l: "membros gerenciados" },
    { icon: TrendingUp, to: 99, suffix: ",9%", l: "disponibilidade" },
    { icon: ShieldCheck, to: 0, suffix: "LGPD", l: "dados protegidos" },
  ];
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-4 rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_20px_60px_-30px_rgba(30,58,95,0.25)] backdrop-blur-xl md:grid-cols-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2a5587] text-[#C8963E] shadow-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-[#1E3A5F]">
                    {s.to === 0 ? s.suffix : <Counter to={s.to} suffix={s.suffix} />}
                  </div>
                  <div className="text-xs text-[#0f1f3a]/60">{s.l}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Features Z-pattern ---------------- */
function FeaturesZ() {
  const items = [
    {
      eyebrow: "Membros & Departamentos",
      title: "Cada irmão importa. Cada história é registrada.",
      text: "Cadastro completo com histórico, ministérios, cargos, batismos e relacionamentos familiares — tudo organizado em um único lugar.",
      bullets: ["Importação de planilhas .xlsx/.csv", "Aniversariantes da semana", "Foto, contato e endereço"],
      img: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1200&q=80",
    },
    {
      eyebrow: "Financeiro",
      title: "Transparência que honra o conselho.",
      text: "Dízimos, ofertas, despesas e centros de custo com relatórios prontos para apresentar em assembleia ou ao conselho fiscal.",
      bullets: ["Fluxo de caixa em tempo real", "Trilha de auditoria completa", "Exportação PDF e Excel"],
      img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      eyebrow: "Escalas & Check-in",
      title: "Organize cultos, ensaios e voluntários em minutos.",
      text: "Monte escalas em poucos cliques, notifique os envolvidos e registre presença com QR Code — inclusive na sala das crianças.",
      bullets: ["QR Code de presença", "Notificações automáticas", "Histórico por voluntário"],
      img: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
    },
  ];
  return (
    <section id="funcionalidades" className="relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Funcionalidades"
          title="Tudo que sua igreja precisa para crescer organizada"
          subtitle="Pensado por pastores e administradores eclesiásticos."
        />
        <div className="mt-20 space-y-28">
          {items.map((it, i) => (
            <FeatureRow key={it.title} item={it} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ item, flip }: { item: { eyebrow: string; title: string; text: string; bullets: string[]; img: string }; flip: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`grid items-center gap-12 lg:grid-cols-2 ${flip ? "lg:[&>div:first-child]:order-2" : ""}`}
    >
      <div className="relative">
        <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-[#1E3A5F]/10 via-transparent to-[#C8963E]/20 blur-2xl" />
        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/40 shadow-[0_30px_60px_-20px_rgba(30,58,95,0.35)] backdrop-blur-xl">
          <img src={item.img} alt={item.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        </div>
      </div>
      <div>
        <div className="mb-3 inline-flex rounded-full bg-[#C8963E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#C8963E]">
          {item.eyebrow}
        </div>
        <h3 className="text-3xl font-bold tracking-tight text-[#1E3A5F] sm:text-4xl">{item.title}</h3>
        <p className="mt-4 text-lg text-[#0f1f3a]/70">{item.text}</p>
        <ul className="mt-6 space-y-3">
          {item.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[#0f1f3a]/80">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#1E3A5F] text-white">
                <Check className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ---------------- Modules: Bento + Marquee ---------------- */
function ModulesBento() {
  const big = [
    { icon: Users, t: "Membros", d: "Cadastro completo e ministérios." },
    { icon: Wallet, t: "Financeiro", d: "Dízimos, ofertas, despesas." },
    { icon: CalendarDays, t: "Escalas", d: "Cultos, ensaios e eventos." },
    { icon: GraduationCap, t: "EBD", d: "Classes e presença." },
    { icon: ShieldCheck, t: "Conselho", d: "Atas e aprovações." },
  ];
  const marquee = [
    { icon: FileText, t: "Atas" },
    { icon: Megaphone, t: "Convocações" },
    { icon: ClipboardCheck, t: "Check-in" },
    { icon: Boxes, t: "Patrimônio" },
    { icon: ShoppingCart, t: "Compras" },
    { icon: BarChart3, t: "Relatórios" },
    { icon: Sparkles, t: "Notificações" },
    { icon: HeartHandshake, t: "Visitantes" },
  ];
  return (
    <section id="modulos" className="relative bg-gradient-to-b from-transparent via-[#1E3A5F]/[0.03] to-transparent py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Módulos"
          title="Mais de 12 módulos, totalmente integrados"
          subtitle="Ative apenas o que sua igreja precisa, conforme o plano."
        />

        {/* Bento */}
        <div className="mt-16 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:grid-rows-2">
          <BentoCard className="lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-[#1E3A5F] to-[#2a5587] text-white" big>
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#C8963E] backdrop-blur">
                  Destaque
                </div>
                <h3 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Gestão de Membros & Departamentos</h3>
                <p className="mt-3 max-w-md text-white/70">O coração do Zelar. Conheça cada irmão, acompanhe o crescimento de cada ministério e nunca mais perca um aniversário.</p>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <img key={i} src={`https://i.pravatar.cc/64?img=${i+10}`} alt="" className="h-9 w-9 rounded-full border-2 border-[#1E3A5F] object-cover" />
                  ))}
                </div>
                <span className="text-sm text-white/70">+1.200 membros ativos</span>
              </div>
            </div>
          </BentoCard>
          {big.slice(0, 4).map((m) => {
            const Icon = m.icon;
            return (
              <BentoCard key={m.t}>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#1E3A5F]/8 text-[#1E3A5F]">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="mt-4 font-bold text-[#1E3A5F]">{m.t}</h4>
                <p className="mt-1 text-sm text-[#0f1f3a]/60">{m.d}</p>
              </BentoCard>
            );
          })}
        </div>

        {/* Marquee */}
        <div className="relative mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <motion.div
            className="flex gap-4"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {[...marquee, ...marquee, ...marquee].map((m, i) => {
              const Icon = m.icon;
              return (
                <div
                  key={i}
                  className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#1E3A5F]/10 bg-white/80 px-5 py-3 shadow-sm backdrop-blur"
                >
                  <Icon className="h-4 w-4 text-[#C8963E]" />
                  <span className="text-sm font-semibold text-[#1E3A5F]">{m.t}</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BentoCard({ children, className = "", big = false }: { children: React.ReactNode; className?: string; big?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className={`group relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 ${big ? "p-8" : "p-6"} shadow-[0_10px_40px_-20px_rgba(30,58,95,0.25)] backdrop-blur-xl transition-all hover:shadow-[0_30px_60px_-20px_rgba(30,58,95,0.35)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Testimonials ---------------- */
function Testimonials() {
  const items = [
    {
      quote: "Reduzimos em 70% o tempo gasto com prestação de contas. O conselho aprovou de cara.",
      author: "Pr. Marcos Almeida",
      role: "Assembleia de Deus — MG",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    },
    {
      quote: "Finalmente uma plataforma feita para a nossa realidade. Os ministérios usam todo dia.",
      author: "Diac. Ana Souza",
      role: "Igreja Batista Central — SP",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    },
    {
      quote: "O check-in da EBD acabou com a planilha. Os professores adoraram a praticidade.",
      author: "Pr. Lucas Ribeiro",
      role: "Comunidade Cristã — RS",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    },
  ];
  return (
    <section id="depoimentos" className="relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Quem usa, recomenda" title="Pastores que transformaram a gestão de suas igrejas" />
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <motion.figure
              key={t.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              whileHover={{ y: -8 }}
              className="group relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white via-white to-[#1E3A5F]/[0.04] p-8 shadow-[0_20px_50px_-25px_rgba(30,58,95,0.3)] transition-shadow hover:shadow-[0_30px_60px_-20px_rgba(30,58,95,0.4)]"
            >
              <Quote className="absolute -right-2 -top-2 h-32 w-32 text-[#C8963E]/10" strokeWidth={1} />
              <div className="relative">
                <blockquote className="text-base leading-relaxed text-[#0f1f3a]/85">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <img src={t.avatar} alt={t.author} loading="lazy" className="h-12 w-12 rounded-full border-2 border-[#C8963E]/30 object-cover" />
                  <div>
                    <div className="font-bold text-[#1E3A5F]">{t.author}</div>
                    <div className="text-xs text-[#0f1f3a]/55">{t.role}</div>
                  </div>
                </figcaption>
              </div>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function Faq() {
  const items = [
    { q: "Preciso de cartão de crédito para testar?", a: "Não. Os 14 dias de teste liberam todos os recursos do plano escolhido, sem cobrança e sem cartão." },
    { q: "Meus dados ficam seguros?", a: "Sim. Usamos criptografia em trânsito e em repouso, controle de acesso por papéis e seguimos rigorosamente a LGPD." },
    { q: "Posso migrar de uma planilha?", a: "Sim. Você importa membros e finanças via planilha (.xlsx/.csv) e nosso time ajuda na migração inicial sem custo." },
    { q: "Quantos usuários posso cadastrar?", a: "Depende do plano. Essencial cobre igrejas pequenas; Pro e Premium têm limites maiores e mais módulos." },
    { q: "Funciona no celular?", a: "Sim. A plataforma é totalmente responsiva e funciona em qualquer navegador moderno do celular ou tablet." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-28">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading eyebrow="Dúvidas frequentes" title="Tudo o que você precisa saber" />
        <div className="mt-12 space-y-3">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={it.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`overflow-hidden rounded-2xl border bg-white/70 backdrop-blur-xl transition-all ${
                  isOpen ? "border-[#C8963E]/40 shadow-[0_20px_40px_-20px_rgba(200,150,62,0.3)]" : "border-[#1E3A5F]/10"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-semibold text-[#1E3A5F]">{it.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 135 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1E3A5F]/5 text-[#1E3A5F]"
                  >
                    <Plus className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-5 text-[#0f1f3a]/70">{it.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
function CtaSection() {
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1E3A5F] p-12 shadow-[0_40px_80px_-30px_rgba(30,58,95,0.6)] sm:p-16">
          {/* background image with overlay */}
          <div className="absolute inset-0 -z-10">
            <img
              src="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1800&q=80"
              alt=""
              className="h-full w-full object-cover opacity-25 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F] via-[#1E3A5F]/90 to-[#0f1f3a]" />
          </div>
          {/* abstract shapes */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#C8963E]/20 blur-3xl" />
            <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-[#C8963E]/10 blur-3xl" />
            <svg className="absolute right-10 bottom-10 h-32 w-32 opacity-20" viewBox="0 0 100 100" fill="none">
              <polygon points="50,5 90,27 90,73 50,95 10,73 10,27" stroke="#C8963E" strokeWidth="0.8" />
            </svg>
          </div>

          <div className="relative grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C8963E]/30 bg-[#C8963E]/10 px-3 py-1 text-xs font-semibold text-[#C8963E]">
                <Sparkles className="h-3 w-3" /> Comece em 2 minutos
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Pronto para organizar sua igreja com <span className="text-[#C8963E]">fidelidade</span>?
              </h2>
              <p className="mt-4 max-w-xl text-lg text-white/70">
                Crie sua conta agora e experimente todos os módulos por 14 dias, gratuitamente. Sem cartão de crédito, sem fidelidade.
              </p>
            </motion.div>
            <div className="flex flex-col gap-3">
              <Button
                asChild
                size="lg"
                className="group h-14 bg-[#C8963E] text-base text-white shadow-[0_14px_40px_-12px_rgba(200,150,62,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#b58432]"
              >
                <Link to="/register">
                  Começar grátis agora
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 border-white/25 bg-white/5 text-base text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
              >
                <Link to="/pricing">Ver planos e preços</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function SiteFooter() {
  return (
    <footer className="border-t border-[#1E3A5F]/10 bg-white/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-[#0f1f3a]/60 sm:flex-row">
        <div className="flex items-center gap-2">
          <img src={faviconAsset.url} alt={APP_NAME} className="h-6 w-6 rounded" />
          <span>© {new Date().getFullYear()} {APP_NAME}. Gestão com Fidelidade.</span>
        </div>
        <div className="flex gap-5">
          <Link to="/pricing" className="hover:text-[#1E3A5F]">Planos</Link>
          <Link to="/auth" className="hover:text-[#1E3A5F]">Entrar</Link>
          <Link to="/register" className="hover:text-[#1E3A5F]">Criar conta</Link>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Shared ---------------- */
function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-2xl text-center"
    >
      <div className="inline-flex rounded-full border border-[#C8963E]/30 bg-[#C8963E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C8963E]">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-balance text-4xl font-bold tracking-tight text-[#1E3A5F] sm:text-5xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg text-[#0f1f3a]/65">{subtitle}</p>}
    </motion.div>
  );
}
