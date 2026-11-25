import { describe, it, expect } from "bun:test";
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

describe("Visão geral do gestor", () => {
  it("conta somente ativos e separa presentes, folga e escalados de hoje", () => {
    const r = carregar().criar(S).resumo("2026-11-25");
    expect(r.total).toBe(2);
    expect(r.presentes).toBe(1);
    expect(r.escaladosHoje).toBe(1);
    expect(r.equipe.find((x: any) => x.f.pin === "2").st.k).toBe("folga");
    expect(r.equipe.find((x: any) => x.f.pin === "1").st.t).toBe("Em jornada");
  });
  it("monta a semana de segunda a domingo com folgas no gráfico", () => {
    const r = carregar().criar(S).resumo("2026-11-25");
    expect(r.dias[0]).toBe("2026-11-23");
    expect(r.semana[6]).toMatchObject({ data: "2026-11-29", escalados: 0, folga: 2 });
    expect(r.semana[2]).toMatchObject({ escalados: 1, folga: 1 });
  });
});
