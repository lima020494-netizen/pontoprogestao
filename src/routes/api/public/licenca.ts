import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { canSaveDeveloperInfo, developerInfoSchema } from "@/lib/developer-info";
import { conhecaSchema, resolveConheca } from "@/lib/conheca-content";
import { planosSchema, resolvePlanos } from "@/lib/plans";
import { appSettingsSchema, resolveAppSettings } from "@/lib/app-settings";

const DAY = 86400000;
const TOLERANCIA_DIAS = 7;
const TERMOS_VERSAO = "1.0";
const DEV_EMAIL = "pontoprogestao@gmail.com";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store, private" } });
}

type Lic = { email_dono: string; status: string; plano: number; data_vencimento: string; tipo_pagamento: string; valor_mensal: number | null; aceite_termos: unknown; observacao: string | null };

/** Estado efetivo: trial | ativo | tolerancia | bloqueado | cortesia */
function estado(l: Lic) {
  if (l.status === "cortesia") return "cortesia";
  if (l.status === "bloqueado") return "bloqueado";
  const venc = new Date(l.data_vencimento).getTime();
  if (Date.now() <= venc) return l.status === "trial" ? "trial" : "ativo";
  if (Date.now() <= venc + TOLERANCIA_DIAS * DAY) return "tolerancia";
  return "bloqueado";
}
const view = (l: Lic) => ({ ...l, estado: estado(l), carencia_ate: new Date(new Date(l.data_vencimento).getTime() + TOLERANCIA_DIAS * DAY).toISOString() });

async function auth(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(bearer);
  const email = data.user?.email?.toLowerCase();
  if (error || !data.user || !email) return null;
  const { data: role, error: roleError } = await supabaseAdmin.from("user_roles" as never).select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  // Gestor autorizado (até 4 por empresa, sem PIN): usa a licença da empresa vinculada, só com e-mail confirmado.
  let conta = email;
  if (data.user.email_confirmed_at) {
    const { data: v } = await supabaseAdmin.from("gestor_vinculos" as never).select("email_dono").eq("email_gestor", email).maybeSingle();
    const dono = (v as { email_dono?: string } | null)?.email_dono;
    if (dono) conta = dono.toLowerCase();
  }
  return { db: supabaseAdmin, user: data.user, email, conta, gestorVinculado: conta !== email, isDev: !roleError && !!role && email === DEV_EMAIL };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getConfig(db: any) {
  const { data } = await db.from("app_config" as never).select("valor").eq("chave", "cobranca").maybeSingle();
  return ((data as { valor?: unknown } | null)?.valor as Record<string, unknown>) || {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPlanos(db: any) {
  const { data } = await db.from("app_config" as never).select("valor").eq("chave", "planos").maybeSingle();
  return resolvePlanos((data as { valor?: unknown } | null)?.valor);
}

const adminSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("dev_info"), pin: z.string(), info: developerInfoSchema }),
  z.object({ acao: z.literal("conheca"), pin: z.string(), conteudo: conhecaSchema }),
  z.object({ acao: z.literal("listar"), pin: z.string() }),
  z.object({ acao: z.literal("renovar"), pin: z.string(), email: z.string().email(), dias: z.union([z.literal(30), z.literal(365)]) }),
  z.object({ acao: z.literal("cortesia"), pin: z.string(), email: z.string().email() }),
  z.object({ acao: z.literal("bloquear"), pin: z.string(), email: z.string().email() }),
  z.object({ acao: z.literal("plano"), pin: z.string(), email: z.string().email(), plano: z.number().int().min(1).max(3) }),
  z.object({ acao: z.literal("suporte_iniciar"), pin: z.string(), email: z.string().email(), motivo: z.string().trim().min(3).max(300) }),
  z.object({ acao: z.literal("config"), pin: z.string(), pix: z.string().max(140), whatsapp: z.string().max(40),
    precos: z.record(z.string(), z.number().nonnegative().nullable()).optional(), precosAnuais: z.record(z.string(), z.number().nonnegative().nullable()).optional() }),
  z.object({ acao: z.literal("planos"), pin: z.string(), planos: planosSchema }),
  z.object({ acao: z.literal("settings"), pin: z.string(), settings: appSettingsSchema }),
]);

export const Route = createFileRoute("/api/public/licenca")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const a = await auth(request);
        if (!a) return json({ error: "Sessão inválida." }, 401);
        let { data: lic } = await a.db.from("licencas" as never).select("*").eq("email_dono", a.conta).maybeSingle();
        if (!lic && a.gestorVinculado) return json({ error: "Licença da empresa não encontrada." }, 404);
        if (!lic) {
          const ins = await a.db.from("licencas" as never).insert({ email_dono: a.email, user_id: a.user.id, status: "trial", plano: 1,
            data_vencimento: new Date(Date.now() + 7 * DAY).toISOString() } as never).select("*").single();
          if (ins.error) return json({ error: "Não foi possível iniciar a licença." }, 500);
          lic = ins.data;
        }
        const cfg = await getConfig(a.db);
        return json({ licenca: view(lic as unknown as Lic), config: { pix: cfg["pix"] || "", whatsapp: cfg["whatsapp"] || "", precos: cfg["precos"] || {}, precosAnuais: cfg["precosAnuais"] || {}, planos: await getPlanos(a.db) }, isDev: a.isDev, termosVersao: TERMOS_VERSAO, conta: a.conta, gestorVinculado: a.gestorVinculado });
      },
      POST: async ({ request }) => {
        const a = await auth(request);
        if (!a) return json({ error: "Sessão inválida." }, 401);
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (body?.["acao"] === "aceite") {
          const aceite = { aceito_em: new Date().toISOString(), versao: TERMOS_VERSAO, email: a.email, user_id: a.user.id,
            gestor: String(body["gestor"] || "").slice(0, 120), ip: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "",
            user_agent: (request.headers.get("user-agent") || "").slice(0, 300) };
          const { error } = await a.db.from("licencas" as never).update({ aceite_termos: aceite } as never).eq("email_dono", a.conta);
          return error ? json({ error: "Falha ao registrar o aceite." }, 500) : json({ ok: true, aceite });
        }
        if (!a.isDev) return json({ error: "Acesso restrito ao desenvolvedor." }, 403);
        const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
        const audit = (empresa: string, acao: string, detalhes: Record<string, unknown>) =>
          a.db.from("audit_logs" as never).insert({ empresa_id: empresa, usuario_id: a.user.id, acao, detalhes, ip, is_support_action: true } as never);
        // Sessão de suporte ativa (lida pelo app do cliente em modo suporte) — sem PIN, mas exige master + admin.
        if (body?.["acao"] === "suporte_status" || body?.["acao"] === "suporte_encerrar") {
          const { data: s, error } = await a.db.from("support_sessions" as never).select("*").eq("super_admin_id", a.user.id)
            .is("encerrado_em", null).gt("iniciado_em", new Date(Date.now() - 2 * 3600000).toISOString())
            .order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
          if (error) return json({ error: "Tabelas de suporte ainda não criadas no banco." }, 500);
          const sess = s as { id: string; empresa_id: string; empresa_nome: string | null } | null;
          if (body["acao"] === "suporte_encerrar") {
            if (sess) {
              const recorded = await audit(sess.empresa_id, "suporte_encerrado", { sessao: sess.id });
              if (recorded.error) return json({ error: "Não foi possível registrar o encerramento na auditoria." }, 500);
              const closed = await a.db.from("support_sessions" as never).update({ encerrado_em: new Date().toISOString() } as never).eq("id", sess.id);
              if (closed.error) return json({ error: "Não foi possível encerrar a sessão de suporte." }, 500);
            }
            return json({ ok: true });
          }
          if (!sess) return json({ error: "Nenhuma sessão de suporte ativa." }, 404);
          const { data: lic } = await a.db.from("licencas" as never).select("*").eq("email_dono", sess.empresa_id).maybeSingle();
          const cfg = await getConfig(a.db);
          return json({ suporte: sess, licenca: lic ? view(lic as unknown as Lic) : null, config: { pix: cfg["pix"] || "", whatsapp: cfg["whatsapp"] || "", precos: cfg["precos"] || {}, precosAnuais: cfg["precosAnuais"] || {}, planos: await getPlanos(a.db) }, isDev: false, termosVersao: TERMOS_VERSAO });
        }
        const p = adminSchema.safeParse(body);
        if (!p.success) return json({ error: "Dados inválidos." }, 400);
        if (p.data.pin !== "1000") return json({ error: "PIN mestre inválido." }, 403);
        const d = p.data;
        if (d.acao === "settings") {
          const { error } = await a.db.from("app_settings").upsert({ id: "global", settings: d.settings });
          return error ? json({ error: "Falha ao salvar configurações globais." }, 500) : json({ ok: true });
        }
        if (d.acao === "suporte_iniciar") {
          const { data: emp } = await a.db.from("empregador").select("email_dono,dados").eq("email_dono", d.email).maybeSingle();
          const dd = (emp?.dados || {}) as Record<string, string>;
          const nome = dd["razao"] || dd["fantasia"] || d.email;
          const closed = await a.db.from("support_sessions" as never).update({ encerrado_em: new Date().toISOString() } as never).eq("super_admin_id", a.user.id).is("encerrado_em", null);
          if (closed.error) return json({ error: "Não foi possível encerrar o atendimento anterior." }, 500);
          const { data: s, error } = await a.db.from("support_sessions" as never)
            .insert({ super_admin_id: a.user.id, empresa_id: d.email.toLowerCase(), empresa_nome: nome, motivo: d.motivo, ip } as never).select("id").single();
          if (error) return json({ error: "Não foi possível iniciar o suporte (tabelas de suporte criadas no banco?)." }, 500);
          const recorded = await audit(d.email.toLowerCase(), "suporte_iniciado", { sessao: (s as { id: string }).id, motivo: d.motivo });
          if (recorded.error) {
            await a.db.from("support_sessions" as never).update({ encerrado_em: new Date().toISOString() } as never).eq("id", (s as {id:string}).id);
            return json({ error: "Atendimento não liberado: falha ao registrar a auditoria." }, 500);
          }
          return json({ ok: true, id: (s as { id: string }).id });
        }
        if (d.acao === "dev_info") {
          if (!canSaveDeveloperInfo(a.email, a.isDev, d.pin)) return json({ error: "Apenas a conta master pode alterar o Sobre." }, 403);
          const { data: previous, error: readError } = await a.db.from("app_config" as never).select("valor").eq("chave", "dev_info").maybeSingle();
          if (readError) return json({ error: "Falha ao consultar informações globais." }, 500);
          const old = ((previous as { valor?: Record<string, unknown> } | null)?.valor) || {};
          const info = { ...d.info, ...(d.info.logo ? {} : old["logo"] ? { logo: old["logo"] } : {}) };
          const { error } = await a.db.from("app_config" as never).upsert({ chave: "dev_info", valor: info } as never);
          return error ? json({ error: "Falha ao salvar informações globais." }, 500) : json({ ok: true, info });
        }
        if (d.acao === "conheca") {
          if (!canSaveDeveloperInfo(a.email, a.isDev, d.pin)) return json({ error: "Apenas a conta master pode alterar a página comercial." }, 403);
          const { error } = await a.db.from("marketing_site_content").upsert({ id: "global", content: d.conteudo });
          return error ? json({ error: "Falha ao salvar a página comercial." }, 500) : json({ ok: true });
        }
        const tbl = () => a.db.from("licencas" as never);
        if (d.acao === "listar") {
          const [l, e, f, commercial, settings, legacy, developer] = await Promise.all([
            tbl().select("*").order("created_at", { ascending: false }),
            a.db.from("empregador").select("email_dono,dados"),
            a.db.from("funcionarios").select("email_dono").not("email_dono", "is", null),
            a.db.from("marketing_site_content").select("content").eq("id", "global").maybeSingle(),
            a.db.from("app_settings").select("settings").eq("id", "global").maybeSingle(),
            a.db.from("app_config").select("valor").eq("chave", "conheca").maybeSingle(),
            a.db.from("app_config").select("valor").eq("chave", "dev_info").maybeSingle(),
          ]);
          if (commercial.error) return json({ error: "Não foi possível carregar a página comercial. Tente novamente." }, 500);
          const emp = new Map((e.data || []).map((x) => [x.email_dono.toLowerCase(), (x.dados || {}) as Record<string, string>]));
          const qtd = new Map<string, number>();
          (f.data || []).forEach((x) => { const k = String(x.email_dono).toLowerCase(); qtd.set(k, (qtd.get(k) || 0) + 1); });
          const cfg = await getConfig(a.db);
          return json({ config: cfg, planos: await getPlanos(a.db), settings: resolveAppSettings(settings.data?.settings || {developer:developer.data?.valor}), conheca: resolveConheca(commercial.data?.content || legacy.data?.valor), contas: ((l.data || []) as unknown as Lic[]).map((x) => ({ ...view(x), razao: emp.get(x.email_dono)?.["razao"] || emp.get(x.email_dono)?.["fantasia"] || "", cnpj: emp.get(x.email_dono)?.["cnpj"] || emp.get(x.email_dono)?.["doc"] || "", colaboradores: qtd.get(x.email_dono) || 0 })) });
        }
        if (d.acao === "config") {
          const cfg = await getConfig(a.db);
          const { error } = await a.db.from("app_config" as never).upsert({ chave: "cobranca", valor: { ...cfg, pix: d.pix, whatsapp: d.whatsapp, ...(d.precos ? { precos: d.precos } : {}), ...(d.precosAnuais ? { precosAnuais: d.precosAnuais } : {}) } } as never);
          return error ? json({ error: "Falha ao salvar." }, 500) : json({ ok: true });
        }
        if (d.acao === "planos") {
          const { error } = await a.db.from("app_config" as never).upsert({ chave: "planos", valor: d.planos } as never);
          return error ? json({ error: "Falha ao salvar os planos." }, 500) : json({ ok: true });
        }
        const { data: cur } = await tbl().select("*").eq("email_dono", d.email).maybeSingle();
        if (!cur) return json({ error: "Conta não encontrada." }, 404);
        let patch: Record<string, unknown> = {};
        if (d.acao === "renovar") {
          const base = Math.max(Date.now(), new Date((cur as unknown as Lic).data_vencimento).getTime());
          patch = { status: "ativo", data_vencimento: new Date(base + d.dias * DAY).toISOString(), tipo_pagamento: d.dias === 365 ? "pix_anual" : "pix" };
        } else if (d.acao === "cortesia") patch = { status: "cortesia", tipo_pagamento: "cortesia" };
        else if (d.acao === "bloquear") patch = { status: "bloqueado" };
        else if (d.acao === "plano") patch = { plano: d.plano };
        const { error } = await tbl().update(patch as never).eq("email_dono", d.email);
        return error ? json({ error: "Falha ao atualizar." }, 500) : json({ ok: true });
      },
    },
  },
});
