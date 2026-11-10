import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWithDomain as runInNewContext } from './operational-domain-harness.ts';

const html = readFileSync('public/vip-ponto.html', 'utf8');
const source = '';
const employee = { pin: '1', nome: 'Teste', status: 'Ativo', escala: '5x2', admissao: '2026-10-01', bancoInicio: '2026-10-01' };
function calculate(day: string, options: { holiday?: boolean; rest?: string; hours?: [string, string]; shift?: string } = {}) {
  const punches = options.hours?.map((hora, i) => ({ pin: '1', data: day, hora, tipo: i ? 'Saída' : 'Entrada', nsr: String(i + 1), criadoEm: `${day}T${hora}:00` })) || [];
  const original = JSON.stringify(punches);
  const data: Record<string, unknown> = { feriados: options.holiday ? [{ data: day, nome: 'Feriado' }] : [], escalas: { teste: { semanaInicio: day, semanaFim: day, folgas: options.rest || options.shift ? [{ pin: '1', dia: day, tipo: options.rest || 'Trabalhado', horarioEntrada: '08:00' }] : [] } }, ocorrencias: [], empregador: { fatorBancoDomFeriado: 1 } };
  const f = { ...employee, bancoInicio: day, escala: options.shift || employee.escala };
  const addDias = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const result = runInNewContext(`${source};dadosFolha('1',day,day)`, {
    day, get: (key: string, fallback: unknown) => data[key] ?? fallback,
    funcPorPin: () => f, batidasJornada: () => punches, cargaEscala: () => 480,
    toMin: (h: string) => h ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)) : 0,
    addDias, dow: (d: string) => new Date(d + 'T12:00:00Z').getUTCDay(),
    brOf: (d: string) => d, toHHMM: (n: number) => String(n), DIAS: Array(7).fill('Dia'),
  });
  assert.equal(JSON.stringify(punches), original, 'calculation preserves original timestamps, NSR and punches');
  return JSON.parse(JSON.stringify(result));
}

test('registered holiday overrides a worked shift: all eight hours are extra, credited once, with no absence', () => {
  const d = calculate('2026-10-12', { holiday: true, shift: '5x2', hours: ['08:00', '16:00'] });
  assert.equal(d.linhas[0].previsto, 0);
  assert.equal(d.tot.extras, 480);
  assert.equal(d.banco.creditos, 480);
  assert.equal(d.tot.faltas, 0);
});
test('holiday without punches stays FERIADO with zero debt', () => {
  const d = calculate('2026-10-12', { holiday: true, shift: '5x2' });
  assert.equal(d.linhas[0].ocorrencia, 'FERIADO');
  assert.equal(d.tot.faltantes, 0);
  assert.equal(d.banco.debitos, 0);
});
for (const rest of ['DSR', 'FOLGA']) {
  test(`${rest} without punches never creates an absence or debt`, () => {
    const d = calculate('2026-10-13', { rest });
    assert.equal(d.linhas[0].previsto, 0);
    assert.equal(d.linhas[0].ocorrencia, rest);
    assert.equal(d.tot.faltas, 0);
    assert.equal(d.banco.debitos, 0);
  });
  test(`${rest} work is fully extra without automatic doubling`, () => {
    const d = calculate('2026-10-13', { rest, hours: ['08:00', '16:00'] });
    assert.equal(d.tot.extras, 480);
    assert.equal(d.banco.creditos, 480);
    assert.equal(d.banco.debitos, 0);
  });
}
for (const day of ['2026-10-17', '2026-10-18']) {
  test(`explicit worked weekend shift ${day} remains an ordinary scheduled day`, () => {
    const d = calculate(day, { shift: '5x2', hours: ['08:00', '16:00'] });
    assert.equal(d.linhas[0].previsto, 480);
    assert.equal(d.tot.extras, 0);
    assert.equal(d.banco.creditos, 0);
  });
}
test('ordinary missing work is a wage deduction, never a bank debit', () => {
  const d = calculate('2026-10-13', { shift: '5x2' });
  assert.equal(d.tot.faltas, 1);
  assert.equal(d.banco.debitos, 0);
  assert.equal(d.tot.faltantes, 480); // horas da falta para desconto salarial, fora do banco
});
test('multiple explicit rest days do not imply compensatory debit', () => {
  const result = runInNewContext(`;calcBanco('1','2026-10-13','2026-10-19')`, {
    funcPorPin: () => ({ ...employee, bancoInicio: '2026-10-13' }),
    batidasDia: () => [], previstoDia: () => 0, trabalhadoDia: () => 0,
    movimentoBancoDia: () => ({ saldo: 0, abonado: false, compensacao: false }),trabalhoApuradoDia:()=>0,atrasoDia:()=>0,
    folgaEscala: () => ({ tipo: 'DSR' }), cargaEscala: () => 480,
    addDias: (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10),
  });
  assert.equal(result.debitos, 0);
  assert.equal(result.atual, 0);
});