import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("public/vip-ponto.html", "utf8");
const lic = readFileSync("src/routes/api/public/licenca.ts", "utf8");

test("gestor vinculado entra na empresa do dono, sem PIN", () => {
  assert.match(html, /async function contaDaSessao\(email\)/);
  assert.equal((html.match(/CONTA=await contaDaSessao\(/g) || []).length, 3);
  assert.doesNotMatch(html, /contaDaSessao[^\n]*pin/i);
});

test("licença do gestor vinculado é a da empresa e nunca cria trial próprio", () => {
  assert.match(lic, /email_confirmed_at/);
  assert.match(lic, /eq\("email_dono", a\.conta\)/);
  assert.match(lic, /!lic && a\.gestorVinculado\) return json/);
});
