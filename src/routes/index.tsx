import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
    description: "14 dias grátis",
  },
  publisher: {
    "@type": "Organization",
    name: APP_NAME,
    url: SITE_URL,
  },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Sistema de gestão para igrejas` },
      {
        name: "description",
        content:
          "Plataforma completa para administrar membros, departamentos, finanças, escalas, EBD e patrimônio da sua igreja. 14 dias grátis.",
      },
      { property: "og:title", content: `${APP_NAME} — Sistema de gestão para igrejas` },
      {
        property: "og:description",
        content: "Toda a gestão da sua igreja em um só lugar. Comece grátis por 14 dias.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(STRUCTURED_DATA),
      },
    ],
  }),
  component: Landing,
});


function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <TrustBar />
      <Features />
      <Modules />
      <Testimonials />
      <Faq />
      <CtaSection />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2" aria-label={APP_NAME}>
          <img src={logoAsset.url} alt={APP_NAME} className="h-8 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <a href="#funcionalidades" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Funcionalidades
          </a>
          <a href="#modulos" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Módulos
          </a>
          <a href="#faq" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Dúvidas
          </a>
          <Link to="/pricing" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Planos
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button>
          <Button asChild size="sm"><Link to="/register">Criar conta</Link></Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.12),transparent_60%)]"
      />
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          14 dias grátis · sem cartão de crédito
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Toda a gestão da sua igreja{" "}
          <span className="text-primary">em um só lugar</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Membros, departamentos, finanças, escalas, EBD, patrimônio e muito mais.
          Tudo desenhado para igrejas locais brasileiras.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/register">
              Começar grátis
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/pricing">Ver planos</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Sem fidelidade · Cancele quando quiser
        </p>
      </div>
    </section>
  );
}

function TrustBar() {
  const stats = [
    { v: "+300", l: "igrejas cadastradas" },
    { v: "50k+", l: "membros gerenciados" },
    { v: "99,9%", l: "disponibilidade" },
    { v: "LGPD", l: "dados protegidos" },
  ];
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <div className="text-2xl font-bold">{s.v}</div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: <Users className="h-5 w-5" />,
      title: "Membros e Departamentos",
      text: "Cadastro completo, ministérios, cargos e histórico de cada irmão.",
    },
    {
      icon: <Wallet className="h-5 w-5" />,
      title: "Financeiro completo",
      text: "Dízimos, ofertas, despesas, centros de custo e relatórios para o conselho.",
    },
    {
      icon: <CalendarDays className="h-5 w-5" />,
      title: "Escalas e Eventos",
      text: "Organize cultos, ensaios e convocações em poucos cliques.",
    },
    {
      icon: <ClipboardCheck className="h-5 w-5" />,
      title: "Check-in de presença",
      text: "Registre presença por QR Code ou lista, incluindo crianças.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Conselho Fiscal",
      text: "Aprovações, atas e prestação de contas com trilha de auditoria.",
    },
    {
      icon: <GraduationCap className="h-5 w-5" />,
      title: "EBD",
      text: "Classes, professores, presença e relatórios da escola dominical.",
    },
  ];
  return (
    <section id="funcionalidades" className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeading
        eyebrow="Funcionalidades"
        title="Tudo que sua igreja precisa para crescer organizada"
        subtitle="Pensado por pastores e administradores eclesiásticos."
      />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <Feature key={f.title} icon={f.icon} title={f.title} text={f.text} />
        ))}
      </div>
    </section>
  );
}

function Modules() {
  const modules = [
    { icon: Users, label: "Membros" },
    { icon: Wallet, label: "Financeiro" },
    { icon: CalendarDays, label: "Escalas" },
    { icon: GraduationCap, label: "EBD" },
    { icon: FileText, label: "Atas" },
    { icon: Megaphone, label: "Convocações" },
    { icon: ShieldCheck, label: "Conselho Fiscal" },
    { icon: ClipboardCheck, label: "Check-in" },
    { icon: Boxes, label: "Patrimônio" },
    { icon: ShoppingCart, label: "Compras" },
    { icon: BarChart3, label: "Relatórios" },
    { icon: Sparkles, label: "Notificações" },
  ];
  return (
    <section id="modulos" className="border-t bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeading
          eyebrow="Módulos"
          title="Mais de 12 módulos integrados"
          subtitle="Ative apenas o que sua igreja precisa, conforme o plano."
        />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote: "Reduzimos em 70% o tempo gasto com prestação de contas. O conselho aprovou.",
      author: "Pr. Marcos Almeida",
      role: "Assembleia de Deus — MG",
    },
    {
      quote: "Finalmente uma plataforma feita para a nossa realidade. Os ministérios usam todo dia.",
      author: "Diac. Ana Souza",
      role: "Igreja Batista Central — SP",
    },
    {
      quote: "O check-in da EBD acabou com a planilha. Os professores adoraram.",
      author: "Pr. Lucas Ribeiro",
      role: "Comunidade Cristã — RS",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeading
        eyebrow="Quem usa, recomenda"
        title="Pastores e administradores que já transformaram suas igrejas"
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <figure key={t.author} className="rounded-lg border bg-card p-6">
            <blockquote className="text-sm leading-relaxed text-foreground">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-xs">
              <div className="font-semibold">{t.author}</div>
              <div className="text-muted-foreground">{t.role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: "Preciso de cartão de crédito para testar?",
      a: "Não. Os 14 dias de teste liberam todos os recursos do plano escolhido, sem cobrança.",
    },
    {
      q: "Meus dados ficam seguros?",
      a: "Sim. Usamos criptografia em trânsito e em repouso, controle de acesso por papéis e seguimos a LGPD.",
    },
    {
      q: "Posso migrar de uma planilha?",
      a: "Sim. Você pode importar membros e finanças via planilha (.xlsx/.csv) e nosso time ajuda na migração.",
    },
    {
      q: "Quantos usuários posso cadastrar?",
      a: "Depende do plano. O plano Essencial cobre igrejas pequenas; o Pro e Premium têm mais limites e módulos.",
    },
    {
      q: "Funciona no celular?",
      a: "Sim. A plataforma é responsiva e funciona em qualquer navegador moderno do celular ou tablet.",
    },
  ];
  return (
    <section id="faq" className="border-t bg-muted/20">
      <div className="mx-auto max-w-3xl px-4 py-20">
        <SectionHeading eyebrow="Dúvidas frequentes" title="Tudo o que você precisa saber" />
        <Accordion type="single" collapsible className="mt-8">
          {items.map((it, i) => (
            <AccordionItem key={it.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{it.q}</AccordionTrigger>
              <AccordionContent>{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="overflow-hidden rounded-2xl border bg-primary text-primary-foreground">
        <div className="grid items-center gap-6 p-10 sm:p-14 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Pronto para organizar sua igreja?
            </h2>
            <p className="mt-3 max-w-xl text-primary-foreground/80">
              Crie sua conta agora e experimente todos os módulos por 14 dias, gratuitamente.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/register">Começar grátis</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/pricing">Ver planos</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <img src={faviconAsset.url} alt={APP_NAME} className="h-6 w-6 rounded" />
          <span>© {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.</span>
        </div>
        <div className="flex gap-4">
          <Link to="/pricing">Planos</Link>
          <Link to="/auth">Entrar</Link>
          <Link to="/register">Criar conta</Link>
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="inline-flex rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-md">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <div className="mt-4 flex items-center gap-1 text-xs text-primary">
        <Check className="h-3.5 w-3.5" />
        Disponível em todos os planos
      </div>
    </div>
  );
}
