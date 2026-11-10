import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWithDomain as runInNewContext } from './operational-domain-harness.ts';

const source = '';
const data = {
  linhas: [{ previsto: 480, noturno: 60 }, { previsto: 480, noturno: 90 }, { previsto: 0, noturno: 0 }],
  tot: { trabalhado: 1020, extras: 180, faltas: 1, faltantes: 120 },
  banco: { anterior: 300, creditos: 180, debitos: 120, atual: 360 },
};
function rows(d = data) {
  const format = (n: number) => `${String(Math.floor(Math.abs(n) / 60)).padStart(2, '0')}:${String(Math.abs(n) % 60).padStart(2, '0')}`;
  return JSON.parse(JSON.stringify(runInNewContext(`${source};resumoMensalFolha(d)`, {
    d, toHHMM: format, toSaldo: (n: number) => `${n < 0 ? '-' : '+'}${format(n)}`,
  })));
}
test('monthly summary consolidates planned, worked, extra, missing and night hours from existing results', () => {
  assert.deepEqual(rows().map((r: string[]) => r[1]), ['16:00', '17:00', '03:00', '1 falta(s) / 02:00', '02:30', '+01:00']);
});
test('monthly bank movement excludes prior balance and preserves negative monthly balances', () => {
  assert.equal(rows({ ...data, banco: { anterior: 300, creditos: 0, debitos: 120, atual: 180 } })[5][1], '-02:00');
});
test('summary leaves original daily calculations and bank data unchanged', () => {
  const original = JSON.stringify(data);
  rows();
  assert.equal(JSON.stringify(data), original);
});