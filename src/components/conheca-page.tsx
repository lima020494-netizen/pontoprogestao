import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, ShieldCheck, WifiOff, Printer, Smartphone, Clock3, Headphones, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import kioskImage from "@/assets/conheca-kiosk.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CONHECA_DEFAULT, resolveConheca, whatsappLink } from "@/lib/conheca-content";
import { PLANOS_PADRAO, resolvePlanos } from "@/lib/plans";
import { APP_SETTINGS_DEFAULT, resolveAppSettings } from "@/lib/app-settings";
import { resolvePlatformLogo, readableTextColor } from "@/lib/platform-identity";


export function conhecaHead(home = false) { return {
    meta: [
      { title: home ? "Ponto Pro Gestão — Gestão de jornada e ponto eletrônico" : "Conheça Ponto Pro Gestão — Ponto eletrônico para quiosques e tablets" },
      { name: "description", content: home ? "Ponto Pro Gestão: gestão de jornada, escalas e banco de horas. Conheça os planos e acesse o Gestor ou o Quiosque de ponto." : "Ponto Pro Gestão: desenhado em conformidade com as diretrizes da Portaria MTE 671/2021. Ponto offline, comprovantes e relatórios. Conheça os planos." },
      { property: "og:title", content: home ? "Ponto Pro Gestão — Gestão de jornada e ponto eletrônico" : "Ponto Pro Gestão — Ponto eletrônico seguro para sua empresa" },
      { property: "og:description", content: home ? "Gestão de frequência, escalas, banco de horas e comprovantes para sua empresa. Conheça Ponto Pro Gestão." : "Ponto Pro Gestão para quiosques, tablets e terminais POS Android, desenhado em conformidade com as diretrizes da Portaria MTE 671/2021." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: home ? "https://vippontopro.app/" : "https://vippontopro.app/conheca" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: home ? "https://vippontopro.app/" : "https://vippontopro.app/conheca" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700&display=swap" },
    ],
  }; }


export function ConhecaPage() {
  const [k, setK] = useState(CONHECA_DEFAULT);
  const [settings, setSettings] = useState(APP_SETTINGS_DEFAULT);
  const [configuredPlans, setPlans] = useState(PLANOS_PADRAO);
  useEffect(() => {
    Promise.all([
      supabase.from("marketing_site_content").select("content").eq("id","global").maybeSingle(),
      supabase.from("app_config").select("chave,valor").in("chave",["planos","conheca"]),
      supabase.from("app_settings").select("settings").eq("id","global").maybeSingle(),
    ]).then(([marketing,config,global]) => {
      const rows = config.data || [];
      setK(resolveConheca(marketing.data?.content || rows.find(r=>r.chave==="conheca")?.valor));
      setPlans(resolvePlanos(rows.find(r=>r.chave==="planos")?.valor));
      setSettings(resolveAppSettings(global.data?.settings));
    }, () => {});
  }, []);
  useEffect(()=>{const el=document.querySelector<HTMLElement>(".commercial");if(el){el.style.setProperty("--background",settings.primary_color);el.style.setProperty("--primary",settings.accent_color);el.style.setProperty("--primary-foreground",readableTextColor(settings.text_color,settings.accent_color));el.style.setProperty("--foreground",readableTextColor(settings.text_color,settings.primary_color));el.style.setProperty("--card-foreground",readableTextColor(settings.text_color,"#162338"));el.style.setProperty("--hero-foreground",readableTextColor(settings.text_color,"#0f172a"));el.style.setProperty("--hero-accent",readableTextColor(settings.accent_color,"#0f172a"));}},[settings]);
  const logo = resolvePlatformLogo(settings.logo_url);
  const whatsapp = whatsappLink(k.whatsapp, k.footer.whatsapp_message);
  const icons = [WifiOff, Printer, Smartphone, ShieldCheck, Clock3, Headphones];
  const plans = Object.entries(configuredPlans).filter(([,p])=>p.ativo).map(([id,p],i)=>({name:p.nome,price:p.mensal===null?null:p.mensal.toLocaleString("pt-BR"),caption:`${p.empresas} empresa(s) · até ${p.colaboradores} colaboradores`,benefits:p.recursos,featured:i===1}));
  return <div className="commercial min-h-screen bg-background text-foreground">
    <header className="border-b border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 md:flex md:justify-between md:px-10">
        <Link to="/conheca" aria-label="Ponto Pro Gestão — Conheça" className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="Logo Ponto Pro Gestão" width={76} height={52} className="h-13 w-19 object-contain" />
          <span className="min-w-0 text-sm font-extrabold md:text-lg">{settings.app_name}</span>
        </Link>
        <nav aria-label="Navegação comercial" className="order-3 col-span-2 flex w-full justify-center gap-7 text-sm font-semibold text-muted-foreground md:order-none md:w-auto">
          <a href="#recursos" className="hover:text-primary">Recursos</a><a href="#planos" className="hover:text-primary">Planos</a><a href="#contato" className="hover:text-primary">Contato</a>
        </nav>
        <Button asChild variant="outline" className="text-xs"><Link to="/gestor">ACESSAR SISTEMA <ArrowUpRight /></Link></Button>
      </div>
    </header>
    <main>
      {settings.maintenance && <p role="status" className="border-b border-border px-5 py-3 text-center text-sm">Manutenção em andamento · Registro de ponto permanece disponível.</p>}
      <section className="commercial-hero relative isolate overflow-hidden">
        <img src={k.hero.image_url || kioskImage} alt={k.hero.image_alt} width={1536} height={1024} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="commercial-enter relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-22">
          <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase text-primary"><ShieldCheck size={18} /> {k.tagline}</div>
          <div className="mb-5 text-lg font-bold">{settings.app_name}</div>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">{k.headline}</h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{k.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-xs font-extrabold"><Link to="/gestor">{k.hero.cta_primary} <ArrowUpRight /></Link></Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-xs"><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /> {k.hero.cta_secondary}</a></Button>
          </div>
          <div className="mt-7 flex flex-wrap gap-5 text-xs text-muted-foreground">{k.hero.highlights.map(h=><span key={h} className="flex items-center gap-2"><Check className="commercial-check" size={15} /> {h}</span>)}</div>
        </div>
      </section>
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-7 md:flex-row md:px-10">
          <div><p className="text-xs uppercase text-muted-foreground">Registro e gestão de jornada</p><p className="mt-2 text-sm"><strong className="font-extrabold">Ponto Pro Gestão</strong></p></div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-semibold">{[[ShieldCheck,"Kiosk Ilimitado"],[Clock3,"Relatórios em Tempo Real"],[Headphones,"Suporte"]].map(([Icon,label])=>{const BadgeIcon=Icon as typeof ShieldCheck;return <span key={String(label)} className="flex items-center gap-2"><BadgeIcon size={17} className="text-primary" />{String(label)}</span>;})}</div>
        </div>
      </section>
      <section id="recursos" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-16 md:px-10">
        <p className="text-xs font-bold uppercase commercial-eyebrow">{k.features.eyebrow}</p><h2 className="mt-3 text-2xl font-semibold md:text-3xl">{k.features.title}</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">{k.features.items.map(({title,copy},i)=>{const Icon=icons[i%icons.length] ?? ShieldCheck;return <div key={title+i} className="border-t border-border pt-6"><Icon size={28} className="mb-5 text-primary"/><h3 className="text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy}</p></div>;})}</div>
      </section>
      <section id="planos" className="scroll-mt-8 border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-10">
          <div className="mb-10 text-center"><p className="text-xs font-bold uppercase commercial-eyebrow">Planos</p><h2 className="mt-3 text-2xl font-semibold md:text-3xl">{k.plans_section.title}</h2><p className="mt-4 text-sm text-muted-foreground">{k.plans_section.subtitle}</p></div>
          <div className="grid items-stretch gap-5 md:grid-cols-3">{plans.map(plan=><article key={plan.name} className={`relative flex flex-col rounded-lg border bg-card p-7 ${plan.featured?"border-primary":"border-border"}`}>
            {plan.featured&&<span className="absolute -top-3 left-6 bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">{k.plans_section.featured_label}</span>}
            <h3 className="text-xl font-semibold">{plan.name}</h3><p className="mt-2 text-sm text-muted-foreground">{plan.caption}</p>
            <div className="mt-7 flex min-h-14 items-baseline gap-2">{plan.price?<><span className="text-sm text-muted-foreground">R$</span><strong className="text-5xl font-semibold">{plan.price}</strong><span className="text-sm text-muted-foreground">/mês</span></>:<strong className="text-3xl font-semibold">Sob Consulta</strong>}</div>
            <ul className="my-7 space-y-4 border-t border-border pt-6">{plan.benefits.map(b=><li key={b} className="flex gap-3 text-sm"><Check size={17} className="commercial-check shrink-0"/>{b}</li>)}</ul>
            <Button asChild size="lg" variant={plan.featured?"default":"outline"} className="mt-auto w-full">{plan.price?<Link to="/gestor">Testar grátis <ChevronRight /></Link>:<a href={whatsapp} target="_blank" rel="noopener noreferrer">Falar com a equipe <ArrowUpRight /></a>}</Button>
          </article>)}</div>
        </div>
      </section>
      <section id="contato" className="mx-auto flex max-w-7xl scroll-mt-8 flex-col items-start justify-between gap-6 px-5 py-14 md:flex-row md:items-center md:px-10"><div><p className="text-xs font-bold uppercase commercial-eyebrow">Vamos conversar</p><h2 className="mt-3 text-2xl font-semibold">{k.footer.contact_title}</h2><p className="mt-3 text-sm text-muted-foreground">{k.footer.contact_text}</p></div><Button asChild size="lg"><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle/> {k.footer.contact_cta} <ArrowUpRight/></a></Button></section>
    </main>
    <footer className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-muted-foreground md:px-10"><div><strong className="text-sm text-foreground">Ponto Pro Gestão</strong><p className="mt-2 max-w-xl">{k.footer.footer_text}</p></div><Link to="/gestor" className="flex items-center gap-2 font-semibold hover:text-primary">Acessar o sistema <ArrowUpRight size={15}/></Link></div></footer>
  </div>;
}