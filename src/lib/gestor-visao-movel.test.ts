import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function carregar() {
  const ctx: any = { window: {} };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  for (const f of ["boot/namespace-v20261110-etapa1.js", "gestor/visao-movel-v20261125.js"]) vm.runInContext(readFileSync(`public/operacional/${f}`, "utf8"), ctx);
  return ctx.window.PontoProOperacional.obter("gestor.visaoMovel");
}
const addDias = (iso: string, n: number) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const dow = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDay();
const fs = [
  { pin: "1", nome: "Ana Souza" },
  { pin: "2", nome: "Bruno Lima" },
  { pin: "3", nome: "Carla Dias", status: "Desligado" },
];
const S = {
  get: (k: string) => (k === "funcionarios" ? fs : {}),
  esc: (v: string) => String(v), isoOf: (d: Date) => d.toISOString().slice(0, 10), brOf: (i: string) => i.split("-").reverse().join("/"),
  addDias, dow,
  previstoDia: (f: any, d: string) => (f.pin === "2" && d === "2026-11-25" ? 0 : dow(d) === 0 ? 0 : 480),
  ocorrenciaDia: () => null,
  batidasDia: (p: string, d: string) => (p === "1" && d === "2026-11-25" ? [{ tipo: "Entrada", hora: "08:02" }] : []),
  buscaNaEscala: () => null,
};

test("conta somente ativos e separa presentes, folga e escalados de hoje", () => {
    const r = carregar().criar(S).resumo("2026-11-25");
    assert.equal(r.total, 2);
    assert.equal(r.presentes, 1);
    assert.equal(r.escaladosHoje, 1);
    assert.equal(r.equipe.find((x: any) => x.f.pin === "2").st.k, "folga");
    assert.equal(r.equipe.find((x: any) => x.f.pin === "1").st.t, "Em jornada");
  });
test("monta a semana de segunda a domingo com folgas no gráfico", () => {
    const r = carregar().criar(S).resumo("2026-11-25");
    assert.equal(r.dias[0], "2026-11-23");
    assert.deepEqual({...r.semana[6]}, {...r.semana[6], ...{ data: "2026-11-29", escalados: 0, folga: 2 }});
    assert.deepEqual({...r.semana[2]}, {...r.semana[2], ...{ escalados: 1, folga: 1 }});
  });

test("escala equilibrada exige folga para todos e nenhum dia abaixo do mínimo", () => {
  const api = carregar().criar(S);
  const dias = ["a", "b", "c"];
  const l = (nome: string, folgas: boolean[]) => ({ f: { nome }, celulas: folgas.map((folga) => ({ folga })) });
  const ok = api.diagnosticoSemana([l("Ana", [true, false, false]), l("Bia", [false, true, false])], dias, 1);
  assert.equal(ok.ok, true);
  assert.match(ok.texto, /todo mundo com 1 folga e nenhum dia abaixo do mínimo/);
  const ruim = api.diagnosticoSemana([l("Ana", [false, false, false]), l("Bia", [true, false, false])], dias, 2);
  assert.equal(ruim.ok, false);
  assert.deepEqual([...ruim.semFolga], ["Ana"]);
  assert.equal(ruim.abaixo.length, 1);
});
test("Equipe Hoje marca Intervalo quando a última batida é saída para intervalo", () => {
  const api = carregar().criar({ ...S, batidasDia: (p: string) => (p === "1" ? [{ tipo: "Entrada", hora: "08:00" }, { tipo: "Saída Intervalo", hora: "12:00" }] : []) });
  assert.equal(api.statusAoVivo(fs[0], "2026-11-25").t, "Intervalo");
});
