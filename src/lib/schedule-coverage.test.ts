import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function carregar(emp: any, escala: Record<string, any>) {
  const w: any = { PontoProOperacional: { m: {} as any, definir(n: string, v: any) { this.m[n] = v; } } };
  new Function("window", readFileSync("public/operacional/gestor/matriz-escala-v20261112.js", "utf8").replace("})(window.PontoProOperacional);", "})(window.PontoProOperacional);"))(w);
  return w.PontoProOperacional.m["gestor.matrizEscala"].criar({
    get: (k: string) => (k === "empregador" ? emp : []),
    buscaNaEscala: (pin: string, d: string) => escala[pin + d],
    previstoDia: () => 480, inicioSemana: (d: string) => d,
  });
}

test("cobertura: setor abaixo do mínimo fica vermelho, atendido verde, sem mínimo neutro", () => {
  const emp = { hEntrada: "08:00", coberturaMinima: { Bar: { M: 2 } } };
  const fs = [{ pin: "1", departamento: "Bar" }, { pin: "2", departamento: "Bar" }];
  const m = carregar(emp, { "22026-10-02": { tipo: "DSR" } });
  const linhas = m.cobertura(fs, ["2026-10-01", "2026-10-02"]);
  const manha = linhas.find((l: any) => l.turno === "M");
  assert.deepEqual(manha.dias.map((c: any) => [c.qtd, c.status]), [[2, "ok"], [1, "falta"]]);
  assert.equal(linhas.find((l: any) => l.turno === "T").dias[0].status, "neutro");
});
