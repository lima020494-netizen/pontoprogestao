import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync('public/vip-ponto.html', 'utf8');
const slice = (a: string, b: string) => html.slice(html.indexOf(a), html.indexOf(b, html.indexOf(a)));
const journeySource = slice('function instanteBatida', 'function jornadaAtualISO');
const domainSource = slice('const feriadoDe =', '/* ============================== MÓDULO 3');
const addDias = (d: string, n: number) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const format = (n: number) => `${String(Math.floor(Math.abs(n) / 60)).padStart(2, '0')}:${String(Math.abs(n) % 60).padStart(2, '0')}`;
const helpers = {
  addDias,
  toMin: (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)),
  toHHMM: format,
  toSaldo: (n: number) => (n < 0 ? '-' : '+') + format(n),
  brOf: (d: string) => d.split('-').reverse().join('/'),
  dow: (d: string) => new Date(d + 'T12:00:00Z').getUTCDay(),
  DIAS: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  cargaEscala: () => 440,
};

function mixedMonth() {
  const f = { pin: '1', nome: 'Colaboradora fictícia', escala: '6x1', status: 'Ativo', admissao: '2026-10-01', inicioVigenciaBancoHoras: '2026-10-03' };
  const types = ['Entrada', 'Saída Intervalo', 'Entrada Intervalo', 'Saída'];
  const hours: Record<string, string[]> = {
    '2026-10-01': ['08:00', '12:00', '13:00', '17:00'],
    '2026-10-02': ['08:00', '16:00'],
    '2026-10-03': ['08:00', '12:00', '13:00', '17:00'],
    '2026-10-04': ['08:00', '12:00'],
    '2026-10-07': ['08:00', '12:00'],
  };
  let nsr = 0;
  const punches = Object.entries(hours).flatMap(([data, hs]) => hs.map((hora, i) => ({
    pin: '1', data, hora, tipo: hs.length === 2 ? (i ? 'Saída' : 'Entrada') : types[i], nsr: String(++nsr), fonte: 'PIN',
  })));
  const entries = Object.keys({ ...hours, '2026-10-05': [], '2026-10-06': [], '2026-10-08': [] }).map(dia => ({
    pin: '1', dia, tipo: dia === '2026-10-04' ? 'DSR' : 'Trabalhado', horarioEntrada: '08:00',
  }));
  const data: Record<string, unknown> = {
    batidas: punches,
    funcionarios: [f],
    empregador: { hEntrada: '08:00', fatorBancoDomFeriado: 2 },
    feriados: [{ data: '2026-10-07', nome: 'Feriado fictício' }],
    escalas: {
      a: { semanaInicio: '2026-10-01', semanaFim: '2026-10-04', folgas: entries.filter(x => x.dia <= '2026-10-04') },
      b: { semanaInicio: '2026-10-05', semanaFim: '2026-10-11', folgas: entries.filter(x => x.dia >= '2026-10-05') },
    },
    ocorrencias: [
      { pin: '1', data: '2026-10-05', tipo: 'Folga compensatória' },
      { pin: '1', data: '2026-10-06', tipo: 'Atestado médico' },
    ],
  };
  const original = JSON.stringify(punches);
  const context = {
    ...helpers,
    get: (k: string, fallback: unknown) => data[k] ?? fallback,
    funcPorPin: () => f,
    batidasJornada: (pin: string, day: string) => punches.filter(b => b.pin === pin && b.data === day),
  };
  const sheet = runInNewContext(domainSource + `;dadosFolha('1','2026-10-01','2026-10-08')`, context);
  assert.equal(JSON.stringify(punches), original, 'a apuração não pode regravar carimbos, tipos ou NSRs');
  return { sheet, punches, original };
}

test('baseline: mixed month preserves concrete daily, overtime, absence and bank totals', () => {
  const { sheet } = mixedMonth();
  assert.equal(sheet.linhas.reduce((n: number, l: any) => n + l.previsto, 0), 2640);
  assert.equal(sheet.tot.trabalhado, 1920);
  assert.equal(sheet.tot.extras, 600);
  assert.equal(sheet.tot.faltas, 1);
  assert.equal(sheet.tot.faltantes, 440);
  assert.equal(sheet.tot.feriados, 1);
  assert.equal(sheet.banco.anterior, 0);
  assert.equal(sheet.banco.creditos, 1000);
  assert.equal(sheet.banco.debitos, 440);
  assert.equal(sheet.banco.atual, 560);
});

test('baseline: pre-activation days stay visible and period bank movement reconciles daily balances', () => {
  const { sheet } = mixedMonth();
  assert.deepEqual(Array.from(sheet.banco.dias, (r: any) => [r.data, r.saldo, r.vigente]), [
    ['2026-10-01', 0, false], ['2026-10-02', 0, false], ['2026-10-03', 40, true],
    ['2026-10-04', 480, true], ['2026-10-05', -440, true], ['2026-10-06', 0, true],
    ['2026-10-07', 480, true], ['2026-10-08', 0, true],
  ]);
  assert.equal(sheet.linhas.reduce((n: number, l: any) => n + l.saldo, 0), sheet.banco.creditos - sheet.banco.debitos);
  assert.equal(sheet.banco.atual, sheet.banco.anterior + sheet.banco.creditos - sheet.banco.debitos);
});

test('baseline: compensatory rest debits 440, medical leave and unjustified absence stay neutral', () => {
  const { sheet } = mixedMonth();
  const byDay = Object.fromEntries(Array.from(sheet.linhas, (l: any) => [l.data, l]));
  assert.equal(byDay['2026-10-05'].saldo, -440);
  assert.equal(byDay['2026-10-06'].saldo, 0);
  assert.equal(byDay['2026-10-08'].saldo, 0);
  assert.equal(byDay['2026-10-05'].ocorrencia, 'FOLGA COMPENSATÓRIA');
  assert.equal(byDay['2026-10-06'].ocorrencia, 'ATESTADO MÉDICO');
  assert.equal(byDay['2026-10-08'].ocorrencia, 'FALTA');
});

test('baseline: scheduled midnight work uses Belém night reduction without moving civil punches', () => {
  const f = { pin: '1', escala: '6x1', status: 'Ativo', admissao: '2026-10-01', inicioVigenciaBancoHoras: '2026-10-01' };
  const punches = [
    { pin: '1', data: '2026-10-31', hora: '00:00', tipo: 'Entrada', nsr: '100', criadoEm: '2026-10-31T03:00:00Z' },
    { pin: '1', data: '2026-10-31', hora: '04:00', tipo: 'Saída', nsr: '101', criadoEm: '2026-10-31T07:00:00Z' },
  ];
  const original = JSON.stringify(punches);
  const data: Record<string, unknown> = {
    batidas: punches, funcionarios: [f], empregador: { hEntrada: '00:00', fatorBancoDomFeriado: 1 }, feriados: [], ocorrencias: [],
    escalas: { a: { semanaInicio: '2026-10-26', semanaFim: '2026-11-01', folgas: [{ pin: '1', dia: '2026-10-31', tipo: 'Trabalhado', horarioEntrada: '00:00' }] } },
  };
  const sheet = runInNewContext(journeySource + domainSource + `;dadosFolha('1','2026-10-31','2026-10-31')`, {
    ...helpers, get: (k: string, fallback: unknown) => data[k] ?? fallback, funcPorPin: () => f,
  });
  assert.equal(sheet.linhas[0].trabalhado, 274);
  assert.equal(sheet.linhas[0].noturno, 240);
  assert.equal(sheet.linhas[0].saldo, -166);
  assert.equal(sheet.banco.debitos, 166);
  assert.equal(JSON.stringify(punches), original);
});
