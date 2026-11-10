import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createDomainContext } from './operational-domain-harness.ts';

const html = readFileSync(new URL('../../public/vip-ponto.html', import.meta.url), 'utf8');
const start = html.indexOf('function previewImport(');
const end = html.indexOf('function mostrarImport(', start);
assert.ok(start >= 0 && end > start);
let result: { items: Array<{ tipo: string }>; errors: string[] };
const ctx = vm.createContext(createDomainContext({
  normData: (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : '',
  get: () => [{ pin: '1234', nome: 'Teste' }],
  mostrarImport: (items: Array<{ tipo: string }>, errors: string[]) => { result = { items, errors }; },
}));
vm.runInContext(html.slice(start, end), ctx);

for (const [input, expected] of [
  ['DSR', 'DSR'], ['Trabalhado', 'Trabalhado'],
  ['Folga Domingo', 'Folga Compensada'], ['Folga Compensada', 'Folga Compensada'],
  ['folga Compensanda', 'Folga Compensada'],
  [' Folga   compensatória ', 'Folga Compensada'],
  ['FOLGA', 'Folga Compensada'], ['FOLGA DOMINGO', 'Folga Compensada'],
]) {
  test(`grade e formato antigo aceitam ${input}`, () => {
    ctx['input'] = input;
    vm.runInContext("previewImport([['ID (PIN)','Nome','2026-10-19'],['1234','Teste',input]])", ctx);
    assert.equal(result.errors.length, 0);
    assert.equal(result.items[0]?.tipo, expected);
    vm.runInContext("previewImport([['depto','nome','pin','data','dia','tipo','horario'],['RH','Teste','1234','2026-10-19','SEG',input,'']])", ctx);
    assert.equal(result.errors.length, 0);
    assert.equal(result.items[0]?.tipo, expected);
  });
}

test('tipo desconhecido continua inválido', () => {
  vm.runInContext("previewImport([['ID (PIN)','Nome','2026-10-19'],['1234','Teste','inexistente']])", ctx);
  assert.equal(result.items.length, 0);
  assert.equal(result.errors.length, 1);
});